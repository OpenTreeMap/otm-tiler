"use strict";

var _ = require('underscore');
var config = require('./config.json');
var utils = require("./filterObjectUtils");

exports = module.exports = function (filterObject, displayFilters) {
    if (_.isUndefined(filterObject) || _.isNull(filterObject)) {
        throw new Error('A null or undefined filter object cannot be converted to SQL');
    }
    var models = getModelsForFilterObject(filterObject);
    if (displayFilters && utils.isTreeInDisplayFilters(displayFilters)) {
        models = _.union(models, ['tree']);
    }
    if (models.length === 0) {
        models = [config.sqlForMapFeatures.baseTable];
    }
    return getSqlForModels(models, utils.getUdfFieldDefId(filterObject));
};

function getSqlForModels(models, maybeUdfFieldDefId) {
    var sql = [];
    var modelsAdded = [];

    _.each(models, function addModelToSql(model) {
        if (! _.contains(modelsAdded, model)) {
            var depends = config.sqlForMapFeatures.tables[model].depends;
            depends = _.without(depends, modelsAdded);
            if (depends.length > 0) {
                _.each(depends, addModelToSql);
            }

            var template = config.sqlForMapFeatures.tables[model].sqlTemplate;
            if (_.isUndefined(template)) {
                sql.push(config.sqlForMapFeatures.tables[model].sql);
            } else {
                sql.push(_.template(template)({udfFieldDefId: maybeUdfFieldDefId}));
            }

            modelsAdded.push(model);
        }
    });
    return sql.join(" ");
}

// `getModelsForFilterObject` looks at a nested filterObject with
// clauses and produces a flat list of models to use in FROM/JOIN
// clauses.
function getModelsForFilterObject(object) {
    var models = [];
    if (_.isArray(object)) {
        utils.traverseCombinator(object, function(filter) {
            models = models.concat(getModelsForFilterObject(filter));
        });
    } else if (_.isObject(object) && _.size(object) > 0) {
        _.each(object, function(predicate, fieldName) {
            var model;
            if (fieldName.indexOf('udf:') === 0) {
                model = utils.parseUdfCollectionFieldName(fieldName).modelName;
            } else {
                model = fieldName.split('.')[0];
            }
            if (!config.modelMapping[model]) {
                throw new Error('The model name must be one of the following: ' +
                        Object.keys(config.modelMapping).join(', ') + '. Not ' + model);
            }
            models.push(model);
        });
    }

    return _.uniq(models);
}

