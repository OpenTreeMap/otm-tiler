// Functions to create Grainstore SQL queries.
// Grainstore expects to receive a subquery it can plug into another statement.
// Postgres requires subqueries to be named.

var _ = require('underscore');

var filterStringToWhere = require('./filterStringToWhere');
var filterStringToTables = require('./filterStringToTables');
var config = require('./config.json');

// Create a SQL query to return info about plots.
// Assumes that instanceid is an integer, ready to be plugged
// directly into SQL
function makeSqlForPlots(filterString, instanceid, isUtfGridRequest) {
    var fields = (isUtfGridRequest ? config.sqlForPlots.fields.utfGrid : config.sqlForPlots.fields.base);

    var tables;
    if (filterString) {
        tables = filterStringToTables(filterString);
    } else if (isUtfGridRequest) {
        tables = config.sqlForPlots.tables.plot;
    } else {
        tables = config.sqlForPlots.tables.base;
    }

    var where,
        filterClause = (filterString ? filterStringToWhere(filterString) : null),
        instanceClause = (instanceid ? _.template(config.sqlForPlots.where.instance)({instanceid: instanceid}) : null);
    if (filterString && instanceid) {
        where = '(' + filterClause + ') AND ' + instanceClause;
    } else if (filterString) {
        where = filterClause;
    } else if (instanceid) {
        where = instanceClause;
    }
    if (where) {
        where = 'WHERE ' + where;
    }

    return _.template(
        '( SELECT <%= fields %> FROM <%= tables %> <%= where %> ) otmfiltersql '
    )({
        fields: fields,
        tables: tables,
        where: where
    });
}

// Create a SQL query to return info about boundaries.
// Assumes that instanceid is an integer, ready to be plugged
// directly into SQL
function makeSqlForBoundaries(instanceid) {
    return _.template(config.boundarySql) ({instanceid: instanceid});
}

exports = module.exports = {
    makeSqlForPlots: makeSqlForPlots,
    makeSqlForBoundaries: makeSqlForBoundaries
};
