"use strict";

var Windshaft = require('windshaft');
var _ = require('underscore');
var cluster = require('cluster');
var fs = require('fs');
var makeSql = require('./makeSql.js');
var config = require('./config');
var settings = require('./settings.json');

var workerCount = process.env.WORKERS || require('os').cpus().length;
var port = process.env.PORT || 4000;
var ws;

var styles = {
    boundary: fs.readFileSync('style/boundary.mms', {encoding: 'utf-8'}),
    mapFeature: fs.readFileSync('style/mapFeature.mms', {encoding: 'utf-8'}),
    polygonalMapFeature: fs.readFileSync('style/polygonalMapFeature.mms', {encoding: 'utf-8'})
};

// Configure the Windshaft tile server to handle OTM's HTTP requests, which retrieve
// e.g. a map tile or UTF grid with map features like tree plots or boundaries.

var windshaftConfig = {
    useProfiler: false,  // if true, returns X-Tiler-Profiler header with rendering times
    enable_cors: true,
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
    redis: {host: settings.redishost || '127.0.0.1', port: 6379},

    // How to access the database
    postgres: { password: 'otm', user: 'otm' },
    grainstore: {
        datasource: {
            user: settings.username || 'otm',
            password: settings.password || 'otm',
            host: settings.host || 'localhost',
            port: settings.port || 5432
        }
    }, // See grainstore npm for other options

    // Parse params from the request URL
    base_url: '/:cache_buster/database/:dbname/table/:table',
    base_url_notable: '/:cache_buster/database/:dbname/table',

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
                req.query.sql = makeSql.makeSqlForMapFeatures(filterString,
                                                              displayString,
                                                              restrictFeatureString,
                                                              instanceid,
                                                              zoom,
                                                              isUtfGridRequest,
                                                              isPolygonRequest);

                req.params.style = isPolygonRequest ? styles.polygonalMapFeature : styles.mapFeature;
            } else if (table === 'treemap_boundary' && instanceid) {
                req.query.sql = makeSql.makeSqlForBoundaries(instanceid);
                req.params.style = styles.boundary;
            }
        } catch (err) {
            callback(err, null);
        }

        // A UTF grid request returns map feature data for each pixel in a tile,
        // streamlining client actions like clicking on or hovering over a feature.
        // "interactivity" specifies which fields from our SQL query should be returned for each feature.
        req.params.interactivity = (isUtfGridRequest ? config.interactivityForUtfGridRequests : null);

        // Override request params with query params
        // Note that we *always* overwrite req.query.sql above
        req.params =  _.extend({}, req.params);
        _.extend(req.params, req.query);

        // Send the finished req object on
        callback(null, req);
    },

    afterTileRender: function(req, res, tile, headers, callback) {
        headers['Cache-Control'] = 'max-age=2592000';
        console.log("HEADERS:");
        console.log(headers);
        callback(null, tile, headers);
    }
};

// The global v8debug will be present if this is started via:
//  'node debug', node-debug' or 'node --debug-brk' (but not 'node --debug' !?!)
if (cluster.isMaster && typeof v8debug !== 'object') {
    console.log("Map tiles will be served from http://localhost:" + port + windshaftConfig.base_url + '/:zoom/:x/:y');

    console.log('Creating ' + workerCount + ' workers.');

    cluster.on('online', function(worker) {
        console.log('Worker process ' + worker.process.pid + ' started.');
    });

    for (var i = 0; i < workerCount; i++) {
        cluster.fork();
    }

    cluster.on('exit', function(worker, code, signal) {
        console.log('Worker process ' + worker.process.pid + ' has died. Starting another to replace it.');
        cluster.fork();
    });
} else {
    ws = new Windshaft.Server(windshaftConfig);
    ws.listen(port);
}
