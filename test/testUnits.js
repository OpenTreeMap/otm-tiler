"use strict";

var assert = require("assert");
var _ = require("underscore");
var units = require("../units");
var config = require("../config");

describe('convertFilterUnits', function() {
    var round = function(number, precision) {
        var factor = Math.pow(10, precision);
        var tempNumber = number * factor;
        var roundedTempNumber = Math.round(tempNumber);
        return roundedTempNumber / factor;
    };

    it('exists', function() {
        assert.ok(_.isFunction(units.convertFilterUnits),
                  'convertFilterUnits function should exist');
    });

    it('ignores non-convertible fields', function(){
        var filter = {'tree.something': {'IS': 'some value'}};
        var config = {value_display: {tree: {diameter: {'units': 'in'}}}};
        var expectedFilter = _.clone(filter);
        units.convertFilterUnits(filter, config);
        assert.deepEqual(filter, expectedFilter, 'Filter should not change');
    });

    it('does not change a value with default unit', function(){
        var filter = {'tree.diameter': {'MIN': 1, 'MAX': 2}};
        var config = {value_display: {tree: {diameter: {'units': 'in'}}}};
        var expectedFilter = _.clone(filter);
        units.convertFilterUnits(filter, config);
        assert.deepEqual(filter, expectedFilter, 'Filter should not change');
    });

    it('converts min and max diameter filter', function(){
        var filter = {'tree.diameter': {'MIN': 1, 'MAX': 2}};
        var config = {value_display: {tree: {diameter: {'units': 'cm'}}}};
        var expectedFilter = {'tree.diameter': {'MIN': 0.393701, 'MAX': 0.787402}};
        units.convertFilterUnits(filter, config);
        // Round before asserting because the actual conversion to compare floats with a known level of precision
        filter['tree.diameter'].MIN = round(filter['tree.diameter'].MIN, 6);
        filter['tree.diameter'].MAX = round(filter['tree.diameter'].MAX, 6);
        assert.deepEqual(filter, expectedFilter, 'Filter should show cm->in conversion');
    });

    it('converts min and max filter with alternate syntax', function(){
        var filter = {'tree.diameter': {'MIN': {'VALUE': 1}, 'MAX': {'VALUE': 2}}};
        var config = {value_display: {tree: {diameter: {'units': 'cm'}}}};
        var expectedFilter = {'tree.diameter': {'MIN': {'VALUE': 0.393701}, 'MAX': {'VALUE': 0.787402}}};
        units.convertFilterUnits(filter, config);
        // Round before asserting because the actual conversion to compare floats with a known level of precision
        filter['tree.diameter'].MIN.VALUE = round(filter['tree.diameter'].MIN.VALUE, 6);
        filter['tree.diameter'].MAX.VALUE = round(filter['tree.diameter'].MAX.VALUE, 6);
        assert.deepEqual(filter, expectedFilter, 'Filter should show cm->in conversion');
    });

    it('converts min and max bioswale filter', function(){
        var filter = {'bioswale.drainage_area': {'MIN': 1, 'MAX': 2}};
        var config = {value_display: {bioswale: {drainage_area: {'units': 'sq_m'}}}};
        var expectedFilter = {'bioswale.drainage_area': {'MIN': 10.7643, 'MAX': 21.5285}};
        units.convertFilterUnits(filter, config);
        // Round before asserting because the actual conversion to compare floats with a known level of precision
        filter['bioswale.drainage_area'].MIN = round(filter['bioswale.drainage_area'].MIN, 4);
        filter['bioswale.drainage_area'].MAX = round(filter['bioswale.drainage_area'].MAX, 4);
        assert.deepEqual(filter, expectedFilter, 'Filter should show sq_ft->sq_m conversion');
    });

});
