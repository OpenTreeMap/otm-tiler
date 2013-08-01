var Windshaft = require('windshaft');
var _ = require('underscore');
var makeSql = require('./makeSql.js');
var config = require('./config.json');

// Configure the Windshaft tile server to handle OTM's HTTP requests, which retrieve 
// e.g. a map tile or UTF grid with map features like tree plots or boundaries. 

var windshaftConfig = {
    enable_cors: true,
    redis: {host: '127.0.0.1', port: 6379},

    // How to access the database
    postgres: { password: 'otm', user: 'otm' },
    grainstore: {
        datasource: {
            user:'otm',
            password:'otm',
            host: 'localhost',
            port: 5432 }
    }, // See grainstore npm for other options

    // Parse params from the request URL
    base_url: '/:cache_key/database/:dbname/table/:table',
    base_url_notable: '/:cache_key/database/:dbname/table',

    // Tell server how to handle HTTP request 'req' (by specifying properties in req.params).
    req2params: function(req, callback){
        // Specify SQL subquery to extract desired features from desired DB layer.
        // (This will be wrapped in an outer query, in many cases extracting geometry
        // using the magic column name "the_geom_webmercator".)
        try {
            var instanceid = parseInt(req.query['instance_id']),
                table = req.params.table;
            if (table === 'treemap_plot') {
                var filterString = req.query[config.filterQueryArgumentName],
                    isUtfGridRequest = (req.params.format === 'grid.json');
                req.query.sql = makeSql.makeSqlForPlots(filterString, instanceid, isUtfGridRequest);
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

var ws = new Windshaft.Server(windshaftConfig);
var port = process.env.PORT || 4000;
ws.listen(port);

console.log("map tiles are now being served out of: http://localhost:" + port + windshaftConfig.base_url + '/:z/:x/:y');
