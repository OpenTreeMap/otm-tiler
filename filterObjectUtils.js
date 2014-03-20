"use strict";

var _ = require('underscore');
var config = require('./config.json');

module.exports = {
    traverseCombinator: function(array, callback) {
        if (array.length === 0) {
            throw new Error("An empty array is not a valid combinator");
        }
        if (array[0] !== "AND" && array[0] !== "OR") {
            throw new Error('The first element of a combinator array must be "AND" or "OR", not ' + array[0]);
        }
        // Use _.rest to skip the "AND"/"OR"
        _.each(_.rest(array), callback);
    },
    traverseObject: function(object, callback) {
        if (Object.keys(object).length === 0) {
            throw new Error("An empty object cannot be converted to SQL");
        }
        _.each(object, callback);
    }
};
