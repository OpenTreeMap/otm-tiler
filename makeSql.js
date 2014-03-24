"use strict";

// Functions to create Grainstore SQL queries.
// Grainstore expects to receive a subquery it can plug into another statement.
// Postgres requires subqueries to be named.

var _ = require('underscore');

var filterObjectToWhere = require('./filterObjectToWhere');
var filtersToTables = require('./filtersToTables');
var config = require('./config.json');

// Create a SQL query to return info about map features.
// Assumes that instanceid is an integer, ready to be plugged
// directly into SQL
function makeSqlForMapFeatures(filterString, displayString, instanceid, zoom, isUtfGridRequest) {
    var geom_field = makeGeomFieldSql(zoom),
        otherFields = (isUtfGridRequest ? config.sqlForMapFeatures.fields.utfGrid : config.sqlForMapFeatures.fields.base),
        fields = geom_field + ', ' + otherFields,
        filterObject = filterString ? JSON.parse(filterString) : {},
        displayFilters = displayString ? JSON.parse(displayString) : undefined;

    var tables = filtersToTables(filterObject, displayFilters);

    var where = '',
        filterClause = (filterString ? filterObjectToWhere(filterObject) : null),
        instanceClause = (instanceid ? _.template(config.sqlForMapFeatures.where.instance)({instanceid: instanceid}) : null);
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

function makeGeomFieldSql(zoom) {
    // Performance can suffer when zoomed out with many features per pixel,
    // so compute the pixel size and only select one feature per pixel.
    //
    // NOTE: The DISTINCT ON (the_geom_webmercator) is necessary regardles of
    // the performance gains it gives us, as joining to the treephoto table
    // can add multiple rows per mapfeature. If we ditch ST_SnapToGrid, make
    // sure to retain the DISTINCT ON somewhere
    var worldWidth = 40075016.6856,
        tileSize = 256,
        unitsPerPixel = worldWidth / (tileSize * Math.pow(2, zoom)),
        sql = 'DISTINCT ON (the_geom_webmercator) ST_SnapToGrid(the_geom_webmercator, ' + unitsPerPixel + ') AS the_geom_webmercator';
    return sql;
}

// Create a SQL query to return info about boundaries.
// Assumes that instanceid is an integer, ready to be plugged
// directly into SQL
function makeSqlForBoundaries(instanceid) {
    return _.template(config.boundaryGrainstoreSql) ({instanceid: instanceid});
}

exports = module.exports = {
    makeSqlForMapFeatures: makeSqlForMapFeatures,
    makeSqlForBoundaries: makeSqlForBoundaries
};
