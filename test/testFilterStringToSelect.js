var assert = require("assert");
var filterStringToSelect = require("../filterStringToSelect");
var config = require("../config.json");

describe('filterStringToSelect', function() {

    it('returns returns tree select when tree is in the filter string', function() {
        var sql = filterStringToSelect('{"tree.id":{"IS":"1"}}');
        assert.equal(sql, config.selectAllFieldsSql.tree);
    });

    it('returns returns tree select when species is in the filter string', function() {
        var sql = filterStringToSelect('{"species.id":{"IS":"1"}}');
        assert.equal(sql, config.selectAllFieldsSql.tree);
    });

    it('returns returns plot select when plot is in the filter string', function() {
        var sql = filterStringToSelect('{"plot.id":{"IS":"1"}}');
        assert.equal(sql, config.selectAllFieldsSql.plot);
    });

    it('returns returns tree select when tree is nested in the filter string', function() {
        var sql = filterStringToSelect('["AND", {"plot.id":{"IS":"1"}, {"tree.id":{"IN":[1,2,3]}}}]');
        assert.equal(sql, config.selectAllFieldsSql.tree);
    });
});
