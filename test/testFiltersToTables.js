"use strict";

var assert = require("assert");
var filtersToTables = require("../filtersToTables");
var config = require("../config.json");

describe('filtersToTables', function() {
    it('raises an error when passed an unknown model in the filter object', function() {
        assert.throws(function() {
            filtersToTables({"fountain.material": {"IS": "Marble"}}, undefined);
        }, Error);
    });

    it('returns the "mapFeature" table when the filter object is empty', function() {
        var sql = filtersToTables({}, undefined);
        assert.equal(sql, config.sqlForMapFeatures.tables.mapFeature.sql);
    });

    it('returns "mapFeature" tables when "mapFeature" is in the filter object', function() {
        var sql = filtersToTables({"mapFeature.id":{"IS":"1"}}, undefined);
        assert.equal(sql, config.sqlForMapFeatures.tables.mapFeature.sql);
    });

    it('returns tree JOINed to mapFeature when "tree" is in the filter object', function() {
        var sql = filtersToTables({"tree.id":{"ISNULL":true}}, undefined);
        var expectedSql = "treemap_mapfeature " +
            "LEFT OUTER JOIN treemap_tree ON treemap_mapfeature.id = treemap_tree.plot_id";
        assert.equal(sql, expectedSql);
    });

    it('returns tree and species JOINs when "species" is in the filter object', function() {
        var sql = filtersToTables({"species.id":{"ISNULL":true}}, undefined);
        var expectedSql = "treemap_mapfeature " +
            "LEFT OUTER JOIN treemap_tree ON treemap_mapfeature.id = treemap_tree.plot_id " +
            "LEFT OUTER JOIN treemap_species ON treemap_tree.species_id = treemap_species.id";
        assert.equal(sql, expectedSql);
    });

    it('returns tree and treephoto JOINs when "treePhoto" is in the filter object', function() {
        var sql = filtersToTables({"treePhoto.id":{"ISNULL":true}}, undefined);
        var expectedSql = "treemap_mapfeature " +
            "LEFT OUTER JOIN treemap_tree ON treemap_mapfeature.id = treemap_tree.plot_id " +
            "LEFT OUTER JOIN treemap_treephoto ON treemap_tree.id = treemap_treephoto.tree_id";
        assert.equal(sql, expectedSql);
    });

    it('returns tree joined once when species and photo are both in the filter object', function() {
        var sql = filtersToTables({"treePhoto.id":{"ISNULL":true}, "species.id": {"IS": 17}}, undefined);
        var expectedSql = "treemap_mapfeature " +
            "LEFT OUTER JOIN treemap_tree ON treemap_mapfeature.id = treemap_tree.plot_id " +
            "LEFT OUTER JOIN treemap_treephoto ON treemap_tree.id = treemap_treephoto.tree_id " +
            "LEFT OUTER JOIN treemap_species ON treemap_tree.species_id = treemap_species.id";
        assert.equal(sql, expectedSql);
    });

    it('returns tree joined when a tree model is in the display filters', function() {
        var sql = filtersToTables({}, ['Tree', 'RainBarrel']);
        var expectedSql = "treemap_mapfeature " +
            "LEFT OUTER JOIN treemap_tree ON treemap_mapfeature.id = treemap_tree.plot_id";
        assert.equal(sql, expectedSql);
    });

    it('returns mapfeature when no tree models are in the display filters', function() {
        var sql = filtersToTables({}, ['Plot', 'FireHydrant']);
        var expectedSql = "treemap_mapfeature";
        assert.equal(sql, expectedSql);
    });

    it('returns udfd/udcv and tree/plot joins for udf tree filter objects', function () {
        var sql = filtersToTables({"udf:tree:18.Action": {"LIKE": "%Watering%"}}, undefined);
        var expectedSql = "treemap_mapfeature LEFT OUTER JOIN treemap_tree " +
                "ON treemap_mapfeature.id = treemap_tree.plot_id " +
                "LEFT OUTER JOIN treemap_userdefinedcollectionvalue " +
                "ON (treemap_tree.id = treemap_userdefinedcollectionvalue.model_id AND " +
                "treemap_userdefinedcollectionvalue.field_definition_id = 18)";
        assert.equal(sql, expectedSql);
    });

    it('returns udfd/udcv and joins for udf mapfeature filter objects', function () {
        var sql = filtersToTables({"udf:mapFeature:18.Action": {"LIKE": "%Watering%"}}, undefined);
        var expectedSql =
                "treemap_mapfeature LEFT OUTER JOIN treemap_userdefinedcollectionvalue " +
                "ON (treemap_mapfeature.id = treemap_userdefinedcollectionvalue.model_id AND " +
                "treemap_userdefinedcollectionvalue.field_definition_id = 18)";
        assert.equal(sql, expectedSql);
    });
});
