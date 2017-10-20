"use strict";

// Functions to create Grainstore SQL queries.
// Grainstore expects to receive a subquery it can plug into another statement.
// Postgres requires subqueries to be named.

// A single request to the tiler will have two separate components
//  that are used to build a single query. This is done because the
//  specification format for these two operations is significantly
//  different. By processing them separately in the tiler, the
//  client-side code of the application sending requests can build
//  these parameters more simply.
//  * filterQuery: this contains
//    model/value clauses that easily mapped to predicates in SQL WHERE
//    clauses 
//  * displayQuery: these contain models to show, which then
//    get grouped into an additional predicate in the SQL where
//    clause. This was created as a sidecare to filterQuery because the
//    case of ANDing a plot predicate with a null tree value is
//    prohibitively complicated using filterQuery syntax.

// Performance note: We tried using ST_SnapToGrid to reduce the number of trees rendered.
// While rendering does get faster, database queries slow down by a factor of at least five.
// That particularly hurts in production where we have just one DB server and four renderers.

var _ = require('underscore');

var util = require('util');

var filterObjectToWhere = require('./filterObjectToWhere');
var displayFiltersToWhere = require('./displayFiltersToWhere');
var filtersToTables = require('./filtersToTables');
var addDefaultsToFilter = require('./addDefaultsToFilter');
var config = require('./config');
var units = require('./units');
var utils = require('./filterObjectUtils');


// Create a SQL query to return info about map features.
// Assumes that instanceid is an integer, ready to be plugged
// directly into SQL
function makeSqlForMapFeatures(filterString, displayString, restrictFeatureString, instanceid,
                               zoom, isUtfGridRequest, isPolygonRequest, instanceConfig) {
    var geom_spec = config.sqlForMapFeatures.fields.geom,
        geom_field = isPolygonRequest ? geom_spec.polygon : geom_spec.point,
        parsedFilterObject = filterString ? JSON.parse(filterString) : {},
        displayFilters = displayString ? JSON.parse(displayString) : undefined,
        restrictFeatureFilters = restrictFeatureString ? JSON.parse(restrictFeatureString) : undefined,

        filterObjectWithDefaults = addDefaultsToFilter(parsedFilterObject, zoom, isPolygonRequest),
        filterObject = units.convertFilterUnits(filterObjectWithDefaults, instanceConfig),
        tables = filtersToTables(filterObject, displayFilters, isPolygonRequest, isUtfGridRequest),

        where = '',
        displayClause = displayFiltersToWhere(displayFilters, restrictFeatureFilters, displayPlotsOnly(filterObject)),
        filterClause = filterObjectToWhere(filterObject),
        instanceClause = (instanceid ? _.template(config.sqlForMapFeatures.where.instance)({instanceid: instanceid}) : null);

    function addToWhere(clause) {
        return where ? '( ' + clause + ' ) AND ' + where : clause;
    }

    if (filterClause) {
        where = filterClause;
        // Because some searches (e.g. on photos and udf's) join to other tables,
        // add DISTINCT so we only get one row.
        geom_field = util.format('DISTINCT(%s)', geom_field);
    } else if (showingPlotsAndTrees(displayFilters)) {
        var showAtZoom = _.template(config.showAtZoomSql)({zoom: zoom});
        where = addToWhere(showAtZoom);
    }
    if (displayClause) {
        where = addToWhere(displayClause);
    }
    if (instanceClause) {
        where = addToWhere(instanceClause);
    }
    if (where) {
        where = 'WHERE ' + where;
    }

    var otherFields;
    if (isUtfGridRequest) {
        otherFields = config.sqlForMapFeatures.fields.utfGrid;
    } else if (isPolygonRequest) {
        otherFields = config.sqlForMapFeatures.fields.polygon;
    } else {
        otherFields = config.sqlForMapFeatures.fields.base;
    }

    geom_field = util.format("%s AS %s",
                             geom_field, config.customDbFieldNames.geom);
    return _.template(
        'SELECT <%= fields %> FROM <%= tables %> <%= where %>'
    )({
        fields: geom_field + ', ' + otherFields,
        tables: tables.sql,
        where: where
    });
}

// If there are trees referenced in the filter object, narrow the
// display filters to only tree display filters.
function displayPlotsOnly(filterObject) {
    var isTreeFilterObject = function(s) {return s.substring(0, 4) === 'tree'; };
    var treeKeys = _.filter(utils.filterObjectKeys(filterObject), isTreeFilterObject);
    return treeKeys.length > 0;
}

function showingPlotsAndTrees(displayFilters) {
    var isEmpty = (displayFilters === undefined || displayFilters === null),
        hasPlotAndTree = _.contains(displayFilters, 'Plot') && _.contains(displayFilters, 'Tree');
    return isEmpty || hasPlotAndTree;
}

// Create a SQL query to return info about boundaries.
// Assumes that instanceid is an integer, ready to be plugged
// directly into SQL
function makeSqlForBoundaries(instanceid) {
    return _.template(config.boundaryGrainstoreSql)({
        instanceid: instanceid
    });
}

function makeSqlForCanopyBoundaries(instanceid, canopy_min, canopy_max, category) {
    return _.template(config.canopyBoundarySql)({
        instanceid: instanceid,
        canopy_min: canopy_min,
        canopy_max: canopy_max,
        category: category
    });
}

exports = module.exports = {
    makeSqlForMapFeatures: makeSqlForMapFeatures,
    makeSqlForCanopyBoundaries: makeSqlForCanopyBoundaries,
    makeSqlForBoundaries: makeSqlForBoundaries
};
