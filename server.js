var Windshaft = require('windshaft');
var _ = require('underscore');
var filterStringToSql = require('./filterStringToSql');
var config = require('./config.json');

var grainstoreSqlQueryTemplate = _.template(
    '( <%= selectAllFieldsSql %> WHERE <%= filterSql %> ) otmfiltersql '
);

// Create a SQL query from a JSON string in the OTM2 filter syntax.
// Grainstore expects this to be a subquery that it can
// plugged into another statement. Postgres requires subqueries to
// be named.
function filterStringToGrainstoreSqlQuery(filterString) {
    return grainstoreSqlQueryTemplate({
        selectAllFieldsSql: config.selectAllFieldsSql,
        filterSql: filterStringToSql(filterString)
    });
}

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
        var filterString = req.query[config.filterQueryArgumentName];
        if (filterString) {
            try {
                req.query.sql = filterStringToGrainstoreSqlQuery(filterString);
            } catch (err) {
                callback(err, null);
            }
        }

        // no default interactivity. to enable specify the database column you'd like to interact with
        req.params.interactivity = null;

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

console.log("map tiles are now being served out of: http://localhost:" + port + config.base_url + '/:z/:x/:y');