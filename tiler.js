var Windshaft = require('windshaft');
var _         = require('underscore');
var config = {
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

        // no default interactivity. to enable specify the database column you'd like to interact with
        req.params.interactivity = null;

        // this is in case you want to test sql parameters eg ...png?sql=select * from my_table limit 10
        req.params =  _.extend({}, req.params);
        _.extend(req.params, req.query);

        // send the finished req object on
        callback(null,req);
    },
    afterTileRender: function(req, res, tile, headers, callback) {
        headers['Cache-Control'] = 'max-age=2592000'
        console.log("HEADERS:")
        console.log(headers)
        callback(null, tile, headers);
    }
};

// Initialize tile server on port 4000
var ws = new Windshaft.Server(config);
ws.listen(4000);

console.log("map tiles are now being served out of: http://localhost:4000" + config.base_url + '/:z/:x/:y');
