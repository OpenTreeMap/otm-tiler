var Windshaft = require('windshaft');
var _ = require('underscore');
var makeSql = require('./makeSql.js');
var config = require('./config.json');
var settings = require('./settings.json');
var cluster = require('cluster');
var workerCount = process.env.WORKERS || require('os').cpus().length;
var port = process.env.PORT || 4000;
var ws;

// Configure the Windshaft tile server to handle OTM's HTTP requests, which retrieve
// e.g. a map tile or UTF grid with map features like tree plots or boundaries.

var windshaftConfig = {
    enable_cors: true,
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
        var instanceid, isUtfGridRequest, table, filterString;
        // Specify SQL subquery to extract desired features from desired DB layer.
        // (This will be wrapped in an outer query, in many cases extracting geometry
        // using the magic column name "the_geom_webmercator".)
        try {
            instanceid = parseInt(req.query['instance_id'], 10);
            table = req.params.table;
            if (table === 'treemap_plot') {
                filterString = req.query[config.filterQueryArgumentName];
                isUtfGridRequest = (req.params.format === 'grid.json');
                req.query.sql = makeSql.makeSqlForMapFeatures(filterString, instanceid, isUtfGridRequest);
            } else if (table === 'treemap_boundary' && instanceid) {
                req.query.sql = makeSql.makeSqlForBoundaries(instanceid);
            }
        } catch (err) {
            callback(err, null);
        }

        // A UTF grid request returns map feature data for each pixel in a tile,
        // streamlining client actions like clicking on or hovering over a feature.
        // "interactivity" specifies which fields from our SQL query should be returned for each feature.
        req.params.interactivity = (isUtfGridRequest ? config.interactivityForUtfGridRequests : null);

        // Override request params with query params
        // (allows for example testing different SQL, e.g. ...png?sql=select * from my_table limit 10)
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

if (cluster.isMaster) {
    console.log("Map tiles will be served from http://localhost:" + port + windshaftConfig.base_url + '/:z/:x/:y');

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
