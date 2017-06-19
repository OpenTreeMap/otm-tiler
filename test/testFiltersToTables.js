"use strict";

var assert = require("assert");
var filtersToTables = require("../filtersToTables");
var config = require("../config");

var assertSqlForPolygon = function(filter, displayFilters, expectedSql) {
    var tables = filtersToTables(filter, displayFilters, true, false);
    assert.equal(tables.sql, expectedSql);
};

var assertSqlForTrees = function(filter, displayFilters, expectedSql) {
    var tables = filtersToTables(filter, displayFilters, false, false);
    assert.equal(tables.sql, expectedSql);
};

var assertSqlForGrid = function(filter, displayFilters, expectedSql) {
    var tables = filtersToTables(filter, displayFilters, false, true);
    assert.equal(tables.sql, expectedSql);
};

describe('filtersToTables', function() {
    it('raises an error when passed an unknown model in the filter object', function() {
        assert.throws(function() {
            filtersToTables({"fountain.material": {"IS": "Marble"}}, undefined);
        }, Error);
    });

    it('returns the "mapFeature" table when the filter object is empty for grid requests', function() {
        assertSqlForGrid({}, undefined, config.sqlForMapFeatures.tables.mapFeature.sql);
    });

    it('returns the "mapFeature" and "polygonalMapFeature" tables when the filter object is empty for polygon requests', function() {
        var expectedSql = config.sqlForMapFeatures.tables.mapFeature.sql + ' ' + config.sqlForMapFeatures.tables.polygonalMapFeature.sql;
        assertSqlForPolygon({}, undefined, expectedSql);
    });

    it('returns the "mapFeature" and "tree" tables when the filter object is empty for tree PNG requests', function() {
        var expectedSql = config.sqlForMapFeatures.tables.mapFeature.sql + ' ' + config.sqlForMapFeatures.tables.tree.sql;
        assertSqlForTrees({}, undefined, expectedSql);
    });

    it('returns "mapFeature" tables when "mapFeature" is in the filter object', function() {
        assertSqlForGrid({"mapFeature.id":{"IS":"1"}}, undefined, config.sqlForMapFeatures.tables.mapFeature.sql);
    });

    it('returns tree JOINed to mapFeature when "tree" is in the filter object', function() {
        var expectedSql = "treemap_mapfeature " +
            "LEFT OUTER JOIN treemap_tree ON treemap_mapfeature.id = treemap_tree.plot_id";
        assertSqlForGrid({"tree.id":{"ISNULL":true}}, undefined, expectedSql);
    });

    it('returns tree JOINed to mapFeature when "tree" is in the filter array', function() {
        var expectedSql = "treemap_mapfeature " +
            "LEFT OUTER JOIN treemap_tree ON treemap_mapfeature.id = treemap_tree.plot_id";
        assertSqlForGrid(["AND", {"tree.id":{"MIN":1}}, {"tree.id":{"MAX":12}}], undefined, expectedSql);
    });

    it('returns tree and species JOINs when "species" is in the filter object', function() {
        var expectedSql = "treemap_mapfeature " +
            "LEFT OUTER JOIN treemap_tree ON treemap_mapfeature.id = treemap_tree.plot_id " +
            "LEFT OUTER JOIN treemap_species ON treemap_tree.species_id = treemap_species.id";
        assertSqlForGrid({"species.id":{"ISNULL":true}}, undefined, expectedSql);
    });

    it('returns mapfeaturephoto JOINs when "mapFeaturePhoto" is in the filter object', function() {
        var expectedSql = "treemap_mapfeature " +
            "LEFT OUTER JOIN treemap_mapfeaturephoto ON treemap_mapfeature.id = treemap_mapfeaturephoto.map_feature_id";
        assertSqlForGrid({"mapFeaturePhoto.id":{"ISNULL":true}}, undefined, expectedSql);
    });

    it('returns tree joined when a tree model is in the display filters', function() {
        var expectedSql = "treemap_mapfeature " +
            "LEFT OUTER JOIN treemap_tree ON treemap_mapfeature.id = treemap_tree.plot_id";
        assertSqlForGrid({}, ['Tree', 'RainBarrel'], expectedSql);
    });

    it('returns mapfeature when no tree models are in the display filters', function() {
        var expectedSql = "treemap_mapfeature";
        assertSqlForGrid({}, ['Plot', 'FireHydrant'], expectedSql);
    });

    it('returns udfd/udcv and tree/plot joins for udf tree filter objects', function () {
        var expectedSql = "treemap_mapfeature LEFT OUTER JOIN treemap_tree " +
                "ON treemap_mapfeature.id = treemap_tree.plot_id " +
                "CROSS JOIN treemap_userdefinedcollectionvalue";
        assertSqlForGrid({"udf:tree:18.Action": {"LIKE": "%Watering%"}}, undefined, expectedSql);
    });

    it('returns udfd/udcv and joins for udf mapfeature filter objects', function () {
        var expectedSql =
                "treemap_mapfeature CROSS JOIN treemap_userdefinedcollectionvalue";
        assertSqlForGrid({"udf:plot:18.Action": {"LIKE": "%Watering%"}}, undefined, expectedSql);
    });

    it('returns udfd/udcv and joins to tree and mapfeature for udf tree and mapfeature filter objects', function () {
        var expectedSql =
                "treemap_mapfeature " +
                "CROSS JOIN treemap_userdefinedcollectionvalue " +
                "LEFT OUTER JOIN treemap_tree ON treemap_mapfeature.id = treemap_tree.plot_id";
        assertSqlForGrid(["OR", {"udf:plot:18.Action": {"LIKE": "%Watering%"}},
                         {"udf:tree:17.Action": {"LIKE": "%Burning%"}}], undefined, expectedSql);
    });
});
