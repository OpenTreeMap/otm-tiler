var assert = require("assert");
var filterStringToTables = require("../filterStringToTables");
var config = require("../config.json");

describe('filterStringToTables', function() {
    it('returns "mapfeature" tables when "mapfeature" is in the filter string', function() {
        var sql = filterStringToTables('{"mapfeature.id":{"IS":"1"}}');
        assert.equal(sql, config.sqlForMapFeatures.tables.mapfeature);
    });
});
