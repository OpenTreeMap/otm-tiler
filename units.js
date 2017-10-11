"use strict";

var _ = require("underscore");

var convertableFields = ['tree.diameter', 'tree.height', 'tree.canopy_height',
                         'plot.width', 'plot.length', 'bioswale.drainage_area',
                         'rainBarrel.capacity', 'rainGarden.drainage_area'];

var unitDefaults = {
    plot: {
        width: 'in',
        length: 'in'
    },
    tree: {
        diameter: 'in',
        height: 'ft',
        canopy_height: 'ft'
    },
    bioswale: {
        drainage_area: 'sq_ft'
    },
    rainBarrel: {
        capacity: 'gal'
    },
    rainGarden: {
        drainage_area: 'sq_ft'
    }
};

var unitConversions = {
    'in': {'in': 1, 'ft': 1 / 12, 'cm': 2.54, 'm': 0.0254},
    'ft': {'in': 12, 'ft': 1, 'cm': 30.48, 'm': 0.3048},
    'lbs/year': {'lbs/year': 1, 'kg/year': 0.453592},
    'lbs': {'lbs': 1, 'kg': 0.453592},
    'gal': {'gal': 1, 'L': 3.785},
    'gal/year': {'gal/year': 1, 'L/year': 3.785},
    'kwh/year': {'kwh/year': 1},
    'sq_m': {'sq_m': 1, 'sq_ft': 10.7639},
    'sq_ft': {'sq_m': 0.0929, 'sq_ft': 1}
};

function getFilterFactor(instanceConfig, model, field) {
    var unit, defaultUnit,
        factor = 1;
    if (instanceConfig.value_display[model]) {
        if (instanceConfig.value_display[model][field]) {
            unit = instanceConfig.value_display[model][field].units;
            defaultUnit = unitDefaults[model][field];
            factor = 1 / unitConversions[defaultUnit][unit];
        }
    }
    return factor;
}

function convertFilterValue(value, factor) {
    if (_.isObject(value)) {
        _.each(['MIN', 'MAX', 'IS'], function(k) {
            var floatValue;
            if (value[k]) {
                if (_.isObject(value[k])) {
                    floatValue = parseFloat(value[k].VALUE);
                    if (_.isNumber(floatValue)) {
                        value[k].VALUE = floatValue * factor;
                    }
                } else {
                    floatValue = parseFloat(value[k]);
                    if (_.isNumber(floatValue)) {
                        value[k] =  floatValue * factor;
                    }
                }
            }
        });
    }
    return value;
}

function convertFilterUnits(filterObject, instanceConfig) {
    // if there is no unit configuration, there is no need to convert
    if (instanceConfig && instanceConfig.value_display) {
        _.each(_.keys(filterObject), function(fieldName) {
            var value = filterObject[fieldName];
            if (_.contains(convertableFields, fieldName)) {
                var model = fieldName.split('.')[0],
                    field = fieldName.substring(fieldName.indexOf('.') + 1),
                    factor = getFilterFactor(instanceConfig, model, field);
                convertFilterValue(value, factor);
            }
        });
    }
    return filterObject;
}

exports = module.exports = {
    convertFilterUnits: convertFilterUnits
};
