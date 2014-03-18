var assert = require("assert");
var filterStringToTables = require("../filterStringToTables");
var config = require("../config.json");

describe('filterStringToTables', function() {
    it('raises an error when passed an unknown model in the filter object', function() {
        assert.throws(function() {
            filterStringToTables({"fountain.material": {"IS": "Marble"}});
        }, Error);
    });

    it('returns the "mapfeature" table when the filter object is empty', function() {
        var sql = filterStringToTables({});
        assert.equal(sql, config.sqlForMapFeatures.tables.mapfeature.sql);
    });

    it('returns "mapfeature" tables when "mapfeature" is in the filter object', function() {
        var sql = filterStringToTables({"mapfeature.id":{"IS":"1"}});
        assert.equal(sql, config.sqlForMapFeatures.tables.mapfeature.sql);
    });

    it('returns tree JOINed to mapfeature when "tree" is in the filter object', function() {
        var sql = filterStringToTables({"tree.id":{"ISNULL":true}});
        var expectedSql = "treemap_mapfeature " +
            "LEFT OUTER JOIN treemap_tree ON treemap_mapfeature.id = treemap_tree.plot_id";
        assert.equal(sql, expectedSql);
    });

    it('returns tree and species JOINs when "species" is in the filter object', function() {
        var sql = filterStringToTables({"species.id":{"ISNULL":true}});
        var expectedSql = "treemap_mapfeature " +
            "LEFT OUTER JOIN treemap_tree ON treemap_mapfeature.id = treemap_tree.plot_id " +
            "LEFT OUTER JOIN treemap_species ON treemap_tree.species_id = treemap_species.id";
        assert.equal(sql, expectedSql);
    });

    it('returns tree and treephoto JOINs when "treephoto" is in the filter object', function() {
        var sql = filterStringToTables({"treephoto.id":{"ISNULL":true}});
        var expectedSql = "treemap_mapfeature " +
            "LEFT OUTER JOIN treemap_tree ON treemap_mapfeature.id = treemap_tree.plot_id " +
            "LEFT OUTER JOIN treemap_treephoto ON treemap_tree.id = treemap_treephoto.tree_id";
        assert.equal(sql, expectedSql);
    });

    it('returns tree joined once when species and photo are both in the filter object', function() {
        var sql = filterStringToTables({"treephoto.id":{"ISNULL":true}, "species.id": {"IS": 17}});
        var expectedSql = "treemap_mapfeature " +
            "LEFT OUTER JOIN treemap_tree ON treemap_mapfeature.id = treemap_tree.plot_id " +
            "LEFT OUTER JOIN treemap_treephoto ON treemap_tree.id = treemap_treephoto.tree_id " +
            "LEFT OUTER JOIN treemap_species ON treemap_tree.species_id = treemap_species.id";
        assert.equal(sql, expectedSql);
    });
});
