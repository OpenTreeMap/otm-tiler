var Windshaft = require('windshaft');
var _ = require('underscore');

var filterStringToWhere = require('./filterStringToWhere');
var filterStringToSelect = require('./filterStringToSelect');
var config = require('./config.json');

var grainstoreSqlQueryTemplate = _.template(
    '( <%= selectAllFieldsSql %> WHERE <%= filterSql %> ) otmfiltersql '
);

var boundarySqlTemplate = _.template(config.boundarySql);

// Create a SQL query from a JSON string in the OTM2 filter syntax.
// Grainstore expects this to be a subquery that it can
// plugged into another statement. Postgres requires subqueries to
// be named.
//
// Assumes that instanceid is an integer, ready to be plugged
// directly into SQL
function plotFilterStringToGrainstoreSqlQuery(filterString, instanceid) {
    var queryString = '',
        selectString = '';
    if (filterString) {
        queryString = filterStringToWhere(filterString);
        selectString = filterStringToSelect(filterString);

        if (instanceid) {
                queryString = '(' + queryString + ') AND ';
        }
    } else {
        selectString = config.defaultSelectSql;
    }

    if (instanceid) {
        queryString += 'treemap_plot.instance_id = ' + instanceid;
    }

    return grainstoreSqlQueryTemplate({
        selectAllFieldsSql: selectString,
        filterSql: queryString
    });
}


// Create a SQL query from a JSON string in the OTM2 filter syntax.
// Grainstore expects this to be a subquery that it can
// plugged into another statement. Postgres requires subqueries to
// be named.
//
// Assumes that instanceid is an integer, ready to be plugged
// directly into SQL
function instanceToBoundaryGrainstoreSqlQuery(instanceid) {
    return boundarySqlTemplate({
        instanceid: instanceid
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
        var instanceid = parseInt(req.query['instance_id']),
            table = req.params.table;

        try {
            if (table === 'treemap_plot') {
                var filterString = req.query[config.filterQueryArgumentName];
                req.query.sql = plotFilterStringToGrainstoreSqlQuery(
                    filterString, instanceid);
            } else if (table === 'treemap_boundary' && instanceid) {
                req.query.sql = instanceToBoundaryGrainstoreSqlQuery(
                    instanceid);
            }
        } catch (err) {
            callback(err, null);
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

console.log("map tiles are now being served out of: http://localhost:" + port + windshaftConfig.base_url + '/:z/:x/:y');
