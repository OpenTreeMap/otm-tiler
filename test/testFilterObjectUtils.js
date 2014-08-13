"use strict";

var assert = require("assert");
var utils = require("../filterObjectUtils");

function udfForJSON (json) {
    return utils.getUdfFieldDefId(JSON.parse(json));
}

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

