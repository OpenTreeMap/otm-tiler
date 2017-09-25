"use strict";

var assert = require("assert");
var filterObjectToWhere = require("../filterObjectToWhere");

var assertSql = function(objectString, expectedSql) {
    var result = filterObjectToWhere(objectString);
    assert.equal(result, expectedSql);
};

describe('filterObjectToWhere', function() {

    // NULL AND EMPTY HANDLING

    it('raises an error when passed undefined', function() {
        assert.throws(function() {
            filterObjectToWhere(undefined);
        }, Error);
    });

    it('raises an error when passed null', function() {
        assert.throws(function() {
            filterObjectToWhere(null);
        }, Error);
    });

    // MODEL NAME VALIDATION

    it('raises an error if the field is not prefixed with a model', function() {
        assert.throws(function() {
            filterObjectToWhere({"height": 1});
        }, Error);
    });

    it('raises an error if the field is not prefixed with a valid model', function() {
        assert.throws(function() {
            filterObjectToWhere({"foo.height": 1});
        }, Error);
    });

    it('accepts species as a valid model', function() {
        assertSql({"species.id": {"IS": 1}}, '("treemap_species"."id" = 1)');
    });

    it('accepts tree as a valid model', function() {
        assertSql({"tree.id": {"IS": 1}}, '("treemap_tree"."id" = 1)');
    });

    it('accepts plot as a valid model', function() {
        assertSql({"plot.id": {"IS": 1}}, '("treemap_plot"."id" = 1)');
    });

    it('accepts mapFeature as a valid model', function() {
        assertSql({"mapFeature.id": {"IS": 1}}, '("treemap_mapfeature"."id" = 1)');
    });

    // INVALID PREDICATE HANDLING

    it('raises an error with an invalid predicate', function() {
        assert.throws(function() {
            filterObjectToWhere({"tree.height": {"WILLBE": 1}});
        }, Error);
    });

    // SINGLE EXACT MATCHES

    it('returns a single numeric property match with IS syntax', function() {
        assertSql({"tree.height": {"IS": 1}}, '(\"treemap_tree\".\"height\" = 1)');
    });

    it('returns a single numeric property match with short syntax', function() {
        assertSql({"tree.height": 1}, '(\"treemap_tree\".\"height\" = 1)');
    });

    it('returns a single string property match with IS syntax', function() {
        assertSql({"mapFeature.address": {"IS": "1234 Market St"}},
                  "(\"treemap_mapfeature\".\"address\" = '1234 Market St')");
    });

    it('returns a single string property match with short syntax', function() {
        assertSql({"mapFeature.address": "1234 Market St"},
                  "(\"treemap_mapfeature\".\"address\" = '1234 Market St')");
    });

    // LIKE MATCHES

    it('returns a LIKE statement', function() {
        assertSql({"mapFeature.address": {"LIKE": "Market St"}},
                  "(\"treemap_mapfeature\".\"address\" ILIKE '%Market St%')");
    });

    it('escapes interior quotes in Hstore LIKE', function () {
        assertSql({"tree.udf:Dimensions": {"LIKE": "\"8'' x 10'\""}},
                  "((\"treemap_tree\".\"udfs\"::hstore->'Dimensions') ILIKE '%\"8'''' x 10''\"%')");
    });

    // UDF MATCHES
    it('processes udf values', function() {
        assertSql({"mapFeature.udf:Clever Name": {"LIKE": "Market St"}},
                  "((\"treemap_mapfeature\".\"udfs\"::hstore->'Clever Name') " +
                  "ILIKE '%Market St%')");
    });

    it('converts mf subclasses to mapfeature for scalar udf searches', function() {
        assertSql({"plot.udf:Clever Name": {"LIKE": "Market St"}},
                  "((\"treemap_mapfeature\".\"udfs\"::hstore->'Clever Name') " +
                  "ILIKE '%Market St%')");
        assertSql({"bioswale.udf:Clever Name": {"LIKE": "Market St"}},
                  "((\"treemap_mapfeature\".\"udfs\"::hstore->'Clever Name') " +
                  "ILIKE '%Market St%')");
        assert.throws(function () {
            filterObjectToWhere({"fool.udf:Clever Name": {"LIKE": "Market St"}});
        }, Error);
    });

    // UDF COLLECTION MATCHES
    it('processes udf values, includes JOIN criteria in WHERE clause', function() {
        assertSql({"udf:tree:18.Action": {"LIKE": "Watering"}},
                  "((\"treemap_userdefinedcollectionvalue\".\"data\"::hstore->'Action') ILIKE '%Watering%'" +
                  " AND treemap_userdefinedcollectionvalue.field_definition_id=18" +
                  " AND treemap_userdefinedcollectionvalue.model_id=treemap_tree.id)");
    });

    it('processes allows multiple UDF collections to be searched', function() {
        assertSql({"udf:tree:18.Action": {"LIKE": "Watering"}, "udf:plot:17.Action": {"LIKE": "Destroying"}},
                  "((\"treemap_userdefinedcollectionvalue\".\"data\"::hstore->'Action') ILIKE '%Watering%'" +
                  " AND treemap_userdefinedcollectionvalue.field_definition_id=18" +
                  " AND treemap_userdefinedcollectionvalue.model_id=treemap_tree.id)" +
                  " AND ((\"treemap_userdefinedcollectionvalue\".\"data\"::hstore->'Action') ILIKE '%Destroying%'" +
                  " AND treemap_userdefinedcollectionvalue.field_definition_id=17" +
                  " AND treemap_userdefinedcollectionvalue.model_id=treemap_mapfeature.id)");
    });

    // LIST MATCHES

    it('returns an IN clause for a numeric list', function () {
        assertSql({"mapFeature.type": {"IN": [1,2]}}, "(\"treemap_mapfeature\".\"type\" IN (1,2))");
    });

    it('returns an IN clause for a string list', function () {
        assertSql({"mapFeature.address": {"IN": ["1234 Market St", "123 Market St"]}},
                  "(\"treemap_mapfeature\".\"address\" IN ('1234 Market St','123 Market St'))");
    });

    it('raises an error when IN is mixed with IS', function() {
        assert.throws(function() {
            filterObjectToWhere({"mapFeature.type": {"IN": [1,2], "IS": "Array"}});
        }, Error);
    });

    // ISNULL MATCHES
    it('returns IS NULL for true', function() {
        assertSql({"species.id": {"ISNULL": true}}, '("treemap_species"."id" IS NULL)');
    });

    it('returns IS NOT NULL for false', function() {
        assertSql({"species.id": {"ISNULL": false}}, '("treemap_species"."id" IS NOT NULL)');
    });

    // IN_BOUNDARY MATCHES

    if ('returns a ST_Contains function', function() {
        assertSql({"mapFeature.geom": {"IN_BOUNDARY": 6}},
                  "(ST_Contains(" +
                    "(SELECT the_geom_webmercator " +
                    "FROM treemap_boundary WHERE id=6), " +
                  "treemap_mapfeature.the_geom_webmercator))");
    });

    // WITHIN_RADIUS MATCHES

    it('returns a ST_DWithin function', function() {
        var jsonQuery = {
                "mapFeature.geom": {
                    "WITHIN_RADIUS": {
                        "POINT": {
                            "x": 0,
                            "y": 0
                        },
                        "RADIUS": 10
                    }
                }
            },

            sqlQuery = ["(ST_DWithin(\"treemap_mapfeature\".\"the_geom_webmercator\", ",
                        "ST_GeomFromEWKT('SRID=3587;POINT(0 0)'), 10))"
                       ].join("");

        assertSql(jsonQuery, sqlQuery);
    });

    // MIN AND MAX MATCHES

    it('return a less or equal to clause', function () {
        assertSql({"tree.height": {"MAX": 2}}, "(\"treemap_tree\".\"height\" <= 2)");
    });

    it('return a less than clause', function () {
        assertSql({"tree.height": {"MAX": {"value": 2, "EXCLUSIVE": true}}},
                  "(\"treemap_tree\".\"height\" < 2)");
    });

    it('return a greater than or equal to clause', function () {
        assertSql({"tree.height": {"MIN": 2}}, "(\"treemap_tree\".\"height\" >= 2)");
    });

    it('return a greater than or equal to clause', function () {
        assertSql({"tree.height": {"MIN": {"value": 2, "EXCLUSIVE": true}}},
                  "(\"treemap_tree\".\"height\" > 2)");
    });

    it('return an inclusive min and max clause', function () {
        assertSql({"tree.height": {"MIN": 2, "MAX": 3}},
                  "(\"treemap_tree\".\"height\" >= 2 AND \"treemap_tree\".\"height\" <= 3)");
    });

    it('return an exclusive min and max clause', function () {
        assertSql({"tree.height": {"MIN": {"value": 2, "EXCLUSIVE": true}, "MAX": {"value": 3, "EXCLUSIVE": true}}},
                  "(\"treemap_tree\".\"height\" > 2 AND \"treemap_tree\".\"height\" < 3)");
    });

    it('ignores empty min or max predicate values', function () {
        assertSql({"tree.height": {"MIN": 0, "MAX": ""}}, "(\"treemap_tree\".\"height\" >= 0)");
        assertSql({"tree.height": {"MIN": 0, "MAX": undefined}}, "(\"treemap_tree\".\"height\" >= 0)");
        assertSql({"tree.height": {"MIN": 0, "MAX": null}}, "(\"treemap_tree\".\"height\" >= 0)");

        assertSql({"tree.height": {"MIN": "", "MAX": 2}}, "(\"treemap_tree\".\"height\" <= 2)");
        assertSql({"tree.height": {"MIN": undefined, "MAX": 2}}, "(\"treemap_tree\".\"height\" <= 2)");
        assertSql({"tree.height": {"MIN": null, "MAX": 2}}, "(\"treemap_tree\".\"height\" <= 2)");
    });

    it('raises an error when MIN is mixed with IN', function() {
        assert.throws(function() {
            filterObjectToWhere({"tree.height": {"MIN": 1, "IN": [1]}});
        }, Error);
    });

    it('raises an error when MAX is mixed with IN', function() {
        assert.throws(function() {
            filterObjectToWhere({"tree.height": {"MAX": 1, "IN": [1]}});
        }, Error);
    });

    it('raises an error when MIN is mixed with IS', function() {
        assert.throws(function() {
            filterObjectToWhere({"tree.height": {"MIN": 1, "IS": 1}});
        }, Error);
    });

    it('raises an error when MAX is mixed with IN', function() {
        assert.throws(function() {
            filterObjectToWhere({"tree.height": {"MAX": 1, "IS": 1}});
        }, Error);
    });

    it('raises an error when MIN is mixed with LIKE', function() {
        assert.throws(function() {
            filterObjectToWhere({"tree.height": {"MIN": 1, "LIKE": "%market%"}});
        }, Error);
    });

    it('raises an error when MAX is mixed with LIKE', function() {
        assert.throws(function() {
            filterObjectToWhere({"tree.height": {"MAX": 1, "LIKE": "%market%"}});
        }, Error);
    });

    // MULTIPLE FIELDS

    it('supports ANDing multiple fields', function () {
        assertSql({"tree.height": {"MIN": 1, "MAX": 2}, "mapFeature.type": {"IN": [1,2]}},
                  "(\"treemap_tree\".\"height\" >= 1 AND \"treemap_tree\".\"height\" <= 2) " +
                      "AND (\"treemap_mapfeature\".\"type\" IN (1,2))");
    });

    // COMBINATORS

    it('supports OR with a combinator', function () {
        assertSql(["OR", {"tree.height": {"MIN": 1}}, {"mapFeature.type": {"IN": [1,2]}}],
                  "((\"treemap_tree\".\"height\" >= 1) OR (\"treemap_mapfeature\".\"type\" IN (1,2)))");
    });

    it('supports nested combinators', function () {
        assertSql(["AND", {"tree.height": {"MIN": 1}}, ["OR", {"mapFeature.type": {"IN": [1,2]}}, {"tree.dbh": {"MIN": 3}}]],
                  "((\"treemap_tree\".\"height\" >= 1) AND ((\"treemap_mapfeature\".\"type\" IN (1,2)) OR (\"treemap_tree\".\"dbh\" >= 3)))");
    });

    it('generates working SQL from a one element AND combinator', function () {
        assertSql(["AND", {"tree.height": {"MIN": 1}}],
                  "((\"treemap_tree\".\"height\" >= 1))");
    });

    it('generates working SQL from a one element OR combinator', function () {
        assertSql(["OR", {"tree.height": {"MIN": 1}}],
                  "((\"treemap_tree\".\"height\" >= 1))");
    });

    it('raises an error when a combinator is empty', function() {
        assert.throws(function() {
            filterObjectToWhere([]);
        }, Error);
    });

    // DATETIME HANDLING

    it('supports datetimes in YYYY-MM-DDTHH:mm:ss format', function () {
        assertSql({"tree.created": {"MIN": "2013-07-15T15:13:01"}},
                  "(\"treemap_tree\".\"created\" >= (DATE '2013-07-15' + TIME '15:13:01'))");
    });

    it('supports datetimes in YYYY-MM-DD HH:mm:ss format', function () {
        assertSql({"tree.created": {"MIN": "2013-07-15 15:13:01"}},
                  "(\"treemap_tree\".\"created\" >= (DATE '2013-07-15' + TIME '15:13:01'))");
    });

    it('only dates that include times are recognized as dates', function () {
        assertSql({"tree.created": {"MIN": "2013-07-15"}},
                  "(\"treemap_tree\".\"created\" >= '2013-07-15')");
    });

    it('only dates that include military times are recognized as dates', function () {
        assertSql({"tree.created": {"MIN": "2013-07-15 2:12 PM"}},
                  "(\"treemap_tree\".\"created\" >= '2013-07-15 2:12 PM')");
    });

    // SANITIZING

    it('sanitizes column names', function () {
        assertSql({"tree.height; DROP TABLE treemap_tree;": {"IS": 1}}, '(\"treemap_tree\".\"height\" = 1)');
    });

    it('sanitizes values', function () {
        assertSql({"tree.height": {"IS": "1; SELECT 1; DROP TABLE treemap_tree;"}},
                  '(\"treemap_tree\".\"height\" = \'1\')');
    });

    it('converts "geom" columns to "the_geom_webmercator"', function() {
        assertSql({"mapFeature.geom": {"IS": 1}}, '(\"treemap_mapfeature\".\"the_geom_webmercator\" = 1)');
    });

    it('converts hstore date fields from string to postgres date without timezone', function () {
        assertSql({"tree.udf:Date": {"MIN": "2014-03-02 00:00:00"}},
                  "(to_date(\"treemap_tree\".\"udfs\"::hstore->'Date'::text, 'YYYY-MM-DD') " +
                  ">= (DATE '2014-03-02' + TIME '00:00:00'))");
    });

    it('casts hstore values to float for numerical hstore searches', function () {
        assertSql({"tree.udf:awesome": {"MIN": 1}},
                  "(( \"treemap_tree\".\"udfs\"::hstore->'awesome' )::float  >= 1)");
        assertSql({"tree.udf:awesome": {"MIN": 1.23}},
                  "(( \"treemap_tree\".\"udfs\"::hstore->'awesome' )::float  >= 1.23)");
    });

});
