"use strict";

var assert = require("assert");
var utils = require("../filterObjectUtils");

function udfForJSON (json) {
    return utils.getUdfFieldDefId(JSON.parse(json));
}

describe('testGetUdfFieldDefId', function() {

    it('returns null for empty filterObject', function() {
        assert.equal(udfForJSON('{}'), null);
    });
    it('returns null for non udfc queries', function() {
        assert.equal(udfForJSON('{"tree.diameter": {"IS": 11}}'), null);
    });
    it('returns the correct udfd id for udfc queries', function() {
        assert.equal(18,
                     udfForJSON('{"udf:plot:18.Action":"Watered", ' +
                                '"udf:plot:18.Date":"2014-03-31"}'));
    });
    it('raises when multiple udfd ids are present', function() {
        assert.throws(udfForJSON,
                      '{"udf:plot:18.Action":"Watered", ' +
                      '"udf:plot:19.Action":"Watered"}');
    });
    it('returns the correct udfd id for multi-predicate queries', function() {
        assert.equal(18, udfForJSON('{"udf:plot:18.Action":"Watered", ' +
                                    '"udf:plot:18.Date":"2014-03-31",' +
                                    ' "tree.diameter": 15}'));
    });
});


describe('testParseUdfCollectionFieldName', function() {
    it('returns the correct parsed object for udfc keys', function () {
        var results = utils.parseUdfCollectionFieldName('udf:plot:18.Action');
        assert.equal(results.modelName, 'udf:plot');
        assert.equal(results.fieldDefId, '18');
        assert.equal(results.hStoreMember, 'Action');
    });
    it('returns nill for non udfc keys', function () {
        assert.equal(null,
            utils.parseUdfCollectionFieldName('tree.diameter'));
    });
});

