"use strict";

var _ = require('underscore');
var fs = require('fs');
var Rollbar = require('rollbar');
var WindshaftServer = require('./http/windshaftServer.js');
var healthCheck = require('./healthCheck');
var makeSql = require('./makeSql');
var config = require('./config');

// Optional environment variable for reporting exceptions to rollbar.com
var rollbarAccessToken = process.env.ROLLBAR_SERVER_SIDE_ACCESS_TOKEN;
if (rollbarAccessToken) {
    var rollbar = new Rollbar({
        accessToken: rollbarAccessToken,
        environment: process.env.OTM_STACK_TYPE || 'Unknown'
    });
}

var dbname = process.env.OTM_DB_NAME || 'otm';
var port = process.env.PORT || 4000;
var ws;

var styles = {
    boundary: fs.readFileSync('style/boundary.mms', {encoding: 'utf-8'}),
    canopy: fs.readFileSync('style/canopy.mms', {encoding: 'utf-8'}),
    mapFeature: fs.readFileSync('style/mapFeature.mms', {encoding: 'utf-8'}),
    uncoloredMapFeature: fs.readFileSync('style/uncoloredMapFeature.mms', {encoding: 'utf-8'}),
    polygonalMapFeature: fs.readFileSync('style/polygonalMapFeature.mms', {encoding: 'utf-8'})
};

function parseBoundaryCategory(category) {
    if (/^[A-Za-z0-9 ]+$/.test(category)) {
        return category;
    }
    return undefined;
}

// Configure the Windshaft tile server to handle OTM's HTTP requests, which retrieve
// e.g. a map tile or UTF grid with map features like tree plots or boundaries.

var windshaftConfig = {
    useProfiler: false,  // if true, returns X-Tiler-Profiler header with rendering times
    enable_cors: true,
    log_format: null,
    mapnik: {
        // When looking for objects to render on a tile, mapnik by default adds 64 pixels
        // on all sides of a tile so if e.g. a label spans two tiles
        // it will be rendered on both rather than getting cut off at the boundary.
        // Because we're only rendering tree dots we can reduce the buffer based on our
        // biggest dot. This speeds up rendering by as much as 25%.
        bufferSize: Math.floor(config.treeMarkerMaxWidth / 2) + 1,
        // Metatiles aren't a good fit for rendering tree dots using multiple servers and workers.
        // When you request a 256x256 tile, mapnik renders by default a 1024x1024 metatile,
        // and caches the resulting 16 tiles. They're aiming at basemaps, where for example
        // if a road segment crosses three tiles it's more efficient to render it once
        // than three times since you'll often want all 3 tiles.
        // That's a bad fit for OTM for two reasons. First, our tree dots are less likely
        // to span multiple tiles. Second, since metatiles aren't shared across servers
        // or even across workers on the same server, our AWS tiler setup
        // (currently two tile servers with two workers each) is likely to render
        // each metatile multiple times, making things slower rather than faster.
        metatile: 1
    },
    redis: {
        host: process.env.OTM_CACHE_HOST || '127.0.0.1',
        port: process.env.OTM_CACHE_PORT || 6379
    },

    // How to access the database
    grainstore: {
        datasource: {
            user: process.env.OTM_DB_USER || 'otm',
            password: process.env.OTM_DB_PASSWORD || 'otm',
            host: process.env.OTM_DB_HOST || 'localhost',
            port: process.env.OTM_DB_PORT || 5432
        }
    }, // See grainstore npm for other options

    // Parse params from the request URL
    // The parameter after database is unused, but left in for legacy reasons
    // so that older versions of the mobile apps will be able to continue to
    // make tile requests
    base_url: '/:cache_buster/database/:unused/table/:table',

    // Tell server how to handle HTTP request 'req' (by specifying properties in req.params).
    req2params: function(req, callback) {
        var instanceid, isUtfGridRequest, isPolygonRequest, table,
            zoom, filterString, displayString, restrictFeatureString;

        // Specify SQL subquery to extract desired features from desired DB layer.
        // (This will be wrapped in an outer query, in many cases extracting geometry
        // using the magic column name "the_geom_webmercator".)
        try {
            instanceid = parseInt(req.query.instance_id, 10);
            table = req.params.table;
            zoom = req.params.z;
            isPolygonRequest = (table === 'stormwater_polygonalmapfeature');
            if (table === 'treemap_mapfeature' || isPolygonRequest) {
                filterString = req.query[config.filterQueryArgumentName];
                displayString = req.query[config.displayQueryArgumentName];
                restrictFeatureString = req.query[config.restrictFeatureQueryArgumentName];
                isUtfGridRequest = (req.params.format === 'grid.json');
                req.params.sql = makeSql.makeSqlForMapFeatures(filterString,
                                                               displayString,
                                                               restrictFeatureString,
                                                               instanceid,
                                                               zoom,
                                                               isUtfGridRequest,
                                                               isPolygonRequest,
                                                               req.instanceConfig);
                if (isPolygonRequest) {
                    req.params.style = styles.polygonalMapFeature;
                } else if (isUtfGridRequest) {
                    req.params.style = styles.uncoloredMapFeature;
                } else {
                    req.params.style = styles.mapFeature;
                }
            } else if (table === 'treemap_boundary' && instanceid) {
                req.params.sql = makeSql.makeSqlForBoundaries(instanceid);
                req.params.style = styles.boundary;
            } else if (table === 'treemap_canopy_boundary' && instanceid) {
                var canopyMin = parseFloat(req.query.canopyMin),
                    canopyMax = parseFloat(req.query.canopyMax),
                    category = parseBoundaryCategory(req.query.category);

                if (!category) {
                    throw new Error('Invalid argument: category');
                }
                if (isNaN(canopyMin) || !isFinite(canopyMin)) {
                    throw new Error('Invalid argument: canopyMin');
                }
                if (isNaN(canopyMax) || !isFinite(canopyMax)) {
                    throw new Error('Invalid argument: canopyMax');
                }

                req.params.sql = makeSql.makeSqlForCanopyBoundaries(instanceid,
                        canopyMin, canopyMax, category);
                req.params.style = styles.canopy;
            }
        } catch (err) {
            if (rollbarAccessToken) {
                rollbar.error(err, req);
            }
            callback(err, null);
        }

        // A UTF grid request returns map feature data for each pixel in a tile,
        // streamlining client actions like clicking on or hovering over a feature.
        // "interactivity" specifies which fields from our SQL query should be returned for each feature.
        req.params.interactivity = (isUtfGridRequest ? config.interactivityForUtfGridRequests : null);
        req.params.dbname = dbname;

        // Send the finished req object on
        callback(null, req);
    },

    afterTileRender: function(req, res, tile, headers, callback) {
        headers['Cache-Control'] = 'max-age=2592000';
        callback(null, tile, headers);
    }
};

ws = new WindshaftServer(windshaftConfig);
ws.get('/health-check', healthCheck(windshaftConfig));

// If a rollbar API token was provided this will wire up the rollbar error handler
if (rollbarAccessToken) {
    ws.use(rollbar.errorHandler());
}

ws.listen(port);
console.log("Map tiles will be served from http://localhost:" + port + windshaftConfig.base_url + '/:zoom/:x/:y');
