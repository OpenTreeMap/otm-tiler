"use strict";

var assert = require("assert");
var makeSql = require("../makeSql");
var config = require("../config.json");

describe('testSqlForMapFeatures', function() {

    var filterString = '{"tree.id":{"IS":"1"}}';

    function assertSqlContains(options) {
        assert.ok(testSql(options) > -1);
    }

    function assertSqlLacks(options) {
        assert.ok(testSql(options) === -1);
    }

    function testSql(options) {
        var zoom = options.zoom || 11,
            sql = makeSql.makeSqlForMapFeatures(
                options.filter,
                options.displayFilter,
                options.instanceId,
                zoom,
                options.isUtfGridRequest,
                options.isPolygonRequest);
        return sql.indexOf(options.expected);
    }

    // Fields

    it('has base fields for plain request', function() {
        assertSqlContains({
            expected: config.sqlForMapFeatures.fields.base
        });
    });

    it('has correct column for polygon request', function() {
        assertSqlContains({
            isPolygonRequest: true,
            expected: config.sqlForMapFeatures.fields.geom.polygon
        });
    });

    it('has extra fields for UTF grid request', function() {
        assertSqlContains({
            isUtfGridRequest: true,
            expected: config.sqlForMapFeatures.fields.utfGrid
        });
    });

    // Tables

    it('has base tables for plain request', function() {
        assertSqlContains({
            expected: config.sqlForMapFeatures.tables.mapFeature.sql
        });
    });

    it('has base polygon table for polygon request', function() {
        assertSqlContains({
            isPolygonRequest: true,
            expected: config.sqlForMapFeatures.tables.polygonalMapFeature.sql
        });
    });

    it('has mapFeatures tables for UTF grid without filter', function() {
        assertSqlContains({
            isUtfGridRequest: true,
            expected: config.sqlForMapFeatures.tables.mapFeature.sql
        });
    });

    // WHERE

    it('has no WHERE clause for plain request', function() {
        assertSqlLacks({
            expected: 'WHERE'
        });
    });

    it('has WHERE clause when filter string passed', function() {
        assertSqlContains({
            filter: filterString,
            expected: ' WHERE '
        });
    });

    it('has WHERE clause when tree display filter passed', function() {
        assertSqlContains({
            displayFilter: '["Tree"]',
            expected: ' WHERE '
        });
    });

    it('has WHERE clause when plot display filter passed', function() {
        assertSqlContains({
            displayFilter: '["Plot"]',
            expected: ' WHERE '
        });
    });

    it('lacks WHERE clause when no display filter passed', function() {
        assertSqlLacks({
            expected: ' WHERE '
        });
    });

    it('has instance ID when one is passed', function() {
        assertSqlContains({
            instanceId: 2345,
            expected: '2345'
        });
    });

    it('has AND when both instance ID and filter passed', function() {
        assertSqlContains({
            filter: filterString,
            instanceId: 2345,
            expected: ' AND '
        });
    });

});
