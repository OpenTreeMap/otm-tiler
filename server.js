var Windshaft = require('windshaft');
var _ = require('underscore');
var makeSql = require('./makeSql.js');
var config = require('./config.json');

var windshaftConfig = {
    base_url: '/:cache_key/database/:dbname/table/:table',
    base_url_notable: '/:cache_key/database/:dbname/table',
    grainstore: {
        datasource: {
            user:'otm',
            password:'otm',
            host: 'localhost',
            port: 5432 }
    }, //see grainstore npm for other options
    redis: {host: '127.0.0.1', port: 6379},
    enable_cors: true,
    postgres: { password: 'otm', user: 'otm' },
    req2params: function(req, callback){
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

        req.params.interactivity = (isUtfGridRequest ? config.interactivityForUtfGridRequests : null);

        // this is in case you want to test sql parameters eg ...png?sql=select * from my_table limit 10
        req.params =  _.extend({}, req.params);
        _.extend(req.params, req.query);

        // send the finished req object on
        callback(null,req);
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
