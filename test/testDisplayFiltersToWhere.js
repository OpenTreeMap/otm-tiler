"use strict";

var assert = require("assert");
var displayFiltersToWhere = require("../displayFiltersToWhere");

var assertSqlForModels = function(list, models, expectedSql) {
    var result = displayFiltersToWhere(list, models);
    assert.equal(result, expectedSql);
};

var assertSql = function(list, expectedSql) {
    assertSqlForModels(list, ['mapFeature'], expectedSql);
};

describe('displayFiltersToWhere', function() {

    // NULL AND EMPTY HANDLING
    it('raises an error when passed a non-empty array for models', function() {
        assert.throws(function() {
            displayFiltersToWhere(null, null);
        }, Error);

        assert.throws(function() {
            displayFiltersToWhere(['Tree'], undefined);
        }, Error);

        assert.throws(function() {
            displayFiltersToWhere(['Tree'], 2);
        }, Error);

        assert.throws(function() {
            displayFiltersToWhere(['Tree'], []);
        }, Error);
    });

    it('returns null when passed null or undefined for displayList w/ no tree models', function() {
        assertSqlForModels(null, ['mapFeature']);
    });

    // MODEL LIST HANDLING
    it('returns an IN clause for only Plots when tree is in the model filter', function() {
        assertSqlForModels(null, ['tree'], '"treemap_mapfeature"."feature_type" IN ( \'Plot\' )');
    });

    // EMPTY LIST HANDLING
    it('returns a FALSE where clause for an empty list', function() {
        assertSql([], 'FALSE');
    });

    // TREE MODEL HANDLING
    it('returns two clauses ANDed together w/ is NOT NULL for ["Tree"]', function() {
        assertSql(['Tree'], '(("treemap_tree"."id" IS NOT NULL) AND ("treemap_mapfeature"."feature_type" = \'Plot\'))');
    });

    it('returns two clauses ANDed together w/ IS NULL for ["EmptyPlot"]', function() {
        assertSql(['EmptyPlot'], '(("treemap_tree"."id" IS NULL) AND ("treemap_mapfeature"."feature_type" = \'Plot\'))');
    });

    it('returns two ANDed clauses ORed w/ third clause for ["Tree", "FireHydrant"]', function() {
        assertSql(['Tree', 'FireHydrant'],
            '(("treemap_tree"."id" IS NOT NULL) AND ("treemap_mapfeature"."feature_type" = \'Plot\'))' +
                ' OR ("treemap_mapfeature"."feature_type" = \'FireHydrant\')');
    });

    // MapFeature HANDLING
    it('returns IN cluase for all non-tree models', function() {
        assertSql(['FireHydrant', 'Plot'], '"treemap_mapfeature"."feature_type" IN ( \'FireHydrant\', \'Plot\' )');
    });
});
