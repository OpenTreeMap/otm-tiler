"use strict";

var _ = require('underscore');
var config = require('./config.json');
var utils = require("./filterObjectUtils");

exports = module.exports = function (object) {
    if (_.isUndefined(object) || _.isNull(object)) {
        throw new Error('A null or undefined filter object cannot be converted to SQL');
    }
    var models = getModelsForObject(object);
    if (models.length === 0) {
        models = [config.sqlForMapFeatures.baseTable];
    }
    return getSqlForModels(models);
};

function getSqlForModels(models) {
    var sql = [];
    var modelsAdded = [];

    _.each(models, function addModelToSql(model) {
        if (! _.contains(modelsAdded, model)) {
            var depends = config.sqlForMapFeatures.tables[model].depends;
            depends = _.without(depends, modelsAdded);
            if (depends.length > 0) {
                _.each(depends, addModelToSql);
            }

            sql.push(config.sqlForMapFeatures.tables[model].sql);
            modelsAdded.push(model);
        }
    });
    return sql.join(" ");
}

function getModelsForObject(object) {
    var models = [];
    if (_.isArray(object)) {
        utils.traverseCombinator(object, function(filter) {
            models.concat(getModelsForObject(filter));
        });
    } else if (_.isObject(object) && _.size(object) > 0) {
        utils.traverseObject(object, function(predicate, fieldName) {
            var model = fieldName.split('.')[0];
            if (!config.modelMapping[model]) {
                throw new Error('The model name must be one of the following: ' + Object.keys(config.modelMapping).join(', ') + '. Not ' + model);
            }
            models.push(model);
        });
    }

    return _.uniq(models);
}
