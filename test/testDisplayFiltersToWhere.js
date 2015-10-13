"use strict";

var assert = require("assert");
var displayFiltersToWhere = require("../displayFiltersToWhere");

var assertSqlForModels = function(displayFilter, restrictFeatureFilter,
                                  displayPlotsOnly, expectedSql) {
    var result = displayFiltersToWhere(displayFilter, restrictFeatureFilter,
                                       displayPlotsOnly);
    assert.equal(result, expectedSql);
};

var assertSql = function(displayFilter, restrictFeatureFilter, expectedSql) {
    assertSqlForModels(displayFilter, restrictFeatureFilter, false, expectedSql);
};

describe('displayFiltersToWhere', function() {

    // NULL AND EMPTY HANDLING
    it('raises an error when passed a non-boolean for displayPlotsOnly', function() {
        assert.throws(function() {
            displayFiltersToWhere(null, null, null);
        }, Error);

        assert.throws(function() {
            displayFiltersToWhere(null, undefined, null);
        }, Error);

        assert.throws(function() {
            displayFiltersToWhere(['Tree'], undefined, undefined);
        }, Error);

        assert.throws(function() {
            displayFiltersToWhere(['Tree'], null, undefined);
        }, Error);

        assert.throws(function() {
            displayFiltersToWhere(['Tree'], undefined, 2);
        }, Error);

        assert.throws(function() {
            displayFiltersToWhere(['Tree'], null, 2);
        }, Error);

        assert.throws(function() {
            displayFiltersToWhere(['Tree'], undefined, []);
        }, Error);
    });

    it('defaults to plot restriction when passed null/null and not instructed to show only plots', function() {
        assertSqlForModels(null, null, false,
                           "\"treemap_mapfeature\".\"feature_type\" IN ( 'Plot' )");
    });

    it('defaults to plot restriction when passed null/undefined and not instructed to show only plots', function() {
        assertSqlForModels(null, undefined, false,
                           "\"treemap_mapfeature\".\"feature_type\" IN ( 'Plot' )");
    });

    it('defaults to plot restriction when passed undefined/undefined and not instructed to show only plots', function() {
        assertSqlForModels(undefined, undefined, false,
                          "\"treemap_mapfeature\".\"feature_type\" IN ( 'Plot' )");
    });

    // MODEL LIST HANDLING
    it('returns an IN clause for only Plots when instructed to show only plots', function() {
        assertSqlForModels(null, undefined,
                           true, '"treemap_mapfeature"."feature_type" IN ( \'Plot\' )');
    });

    // EMPTY LIST HANDLING
    it('returns a FALSE where clause for an empty list', function() {
        assertSql([], undefined, 'FALSE');
    });

    it('returns a FALSE where clause for an empty list with full restrict filters', function() {
        assertSql([], [], 'FALSE');
    });

    it('returns a FALSE where clause for an empty list with some filters', function() {
        assertSql([], ['Plot'], 'FALSE');
    });

    // ABITRARY INTERSECT HANDLING
    it('returns unrestricted output when restriction equals display filter', function() {
        assertSql(['Tree'], ['Tree'],
                  '(("treemap_tree"."id" IS NOT NULL) AND ("treemap_mapfeature"."feature_type" = \'Plot\'))');
    });

    it('returns unrestricted output when restriction is superset of display filter', function() {
        assertSql(['Tree'], ['Tree', 'Plot'],
                  '(("treemap_tree"."id" IS NOT NULL) AND ("treemap_mapfeature"."feature_type" = \'Plot\'))');
    });


    it('returns fully restricted output when restriction has no intersect with display filter', function() {
        assertSql(['BikeRack'], ['FireHydrant'], 'FALSE');
    });


    // TREE MODEL HANDLING
    it('returns two clauses ANDed together w/ is NOT NULL for ["Tree"]', function() {
        assertSql(['Tree'], undefined,
                  '(("treemap_tree"."id" IS NOT NULL) AND ("treemap_mapfeature"."feature_type" = \'Plot\'))');
    });

    it('returns two clauses ANDed together w/ IS NULL for ["EmptyPlot"]', function() {
        assertSql(['EmptyPlot'], undefined,
                  '(("treemap_tree"."id" IS NULL) AND ("treemap_mapfeature"."feature_type" = \'Plot\'))');
    });

    it('returns two ANDed clauses ORed w/ third clause for ["Tree", "FireHydrant"]', function() {
        assertSql(['Tree', 'FireHydrant'], ['FireHydrant'],
                  '(("treemap_tree"."id" IS NOT NULL) AND ("treemap_mapfeature"."feature_type" = \'Plot\'))' +
                  ' OR ("treemap_mapfeature"."feature_type" = \'FireHydrant\')');
    });

    it('returns IN clause for all non-plot models', function() {
        assertSql(['FireHydrant'], ['FireHydrant'],
                  '"treemap_mapfeature"."feature_type" IN ( \'FireHydrant\' )');
    });

    // MapFeature HANDLING
    it('returns IN clause for all non-tree models', function() {
        assertSql(['FireHydrant', 'Plot'], ['FireHydrant'],
                  '"treemap_mapfeature"."feature_type" IN ( \'FireHydrant\', \'Plot\' )');
    });
});
