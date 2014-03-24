"use strict";

var assert = require("assert");
var displayFiltersToWhere = require("../displayFiltersToWhere");

var assertSql = function(list, expectedSql) {
    var result = displayFiltersToWhere(list);
    assert.equal(result, expectedSql);
};

describe('displayFiltersToWhere', function() {

    // NULL AND EMPTY HANDLING
    it('raises an error when passed undefined', function() {
        assert.throws(function() {
            displayFiltersToWhere(undefined);
        }, Error);
    });

    it('raises an error when passed null', function() {
        assert.throws(function() {
            displayFiltersToWhere(null);
        }, Error);
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
