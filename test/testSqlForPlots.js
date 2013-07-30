var assert = require("assert");
var makeSql = require("../makeSql");
var config = require("../config.json");

describe('testSqlForPlots', function() {

    var filterString = '{"tree.id":{"IS":"1"}}';

    function assertSqlContains(options) {
        assert.ok(testSql(options) > -1);
    }

    function assertSqlLacks(options) {
        assert.ok(testSql(options) === -1);
    }

    function testSql(options) {
        var sql = makeSql.makeSqlForPlots(options.filter, options.instanceId, options.isUtfGridRequest);
        return sql.indexOf(options.expected);
    }

    // Fields

    it('has base fields for plain request', function() {
        assertSqlContains({
            expected: config.sqlForPlots.fields.base
        });
    });

    it('has extra fields for UTF grid request', function() {
        assertSqlContains({
            isUtfGridRequest: true,
            expected: config.sqlForPlots.fields.utfGrid
        });
    });

    // Tables

    it('has base tables for plain request', function() {
        assertSqlContains({
            expected: config.sqlForPlots.tables.base
        });
    });

    it('has tree tables when filtering trees', function() {
        assertSqlContains({
            filter: filterString,
            expected: config.sqlForPlots.tables.tree
        });
    });
       
    it('has plot tables for UTF grid without filter', function() {
        assertSqlContains({
            isUtfGridRequest: true,
            expected: config.sqlForPlots.tables.plot
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
