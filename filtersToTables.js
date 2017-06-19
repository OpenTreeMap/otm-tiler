"use strict";

var _ = require('underscore');
var config = require('./config');
var utils = require("./filterObjectUtils");

exports = module.exports = function (filterObject, displayFilters, isPolygonRequest, isUtfGridRequest) {
    if (_.isUndefined(filterObject) || _.isNull(filterObject)) {
        throw new Error('A null or undefined filter object cannot be converted to SQL');
    }
    var models = getModelsForFilterObject(filterObject);

    if ((!isPolygonRequest && !isUtfGridRequest) ||
        (displayFilters && utils.isTreeInDisplayFilters(displayFilters))) {
        models = _.union(models, ['tree']);
    }
    if (models.length === 0) {
        models = [config.sqlForMapFeatures.basePointModel];
    }

    if (isPolygonRequest) {
        models = _.union(models, [config.sqlForMapFeatures.basePolygonModel]);
    }

    return getSqlAndModels(models);
};

function getSqlAndModels(models) {
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
            }

            modelsAdded.push(model);
        }
    });

    return {
        sql: sql.join(" "),
        models: modelsAdded
    };
}

// `getModelsForFilterObject` looks at a nested filterObject with
// clauses and produces a flat list of models to use in FROM/JOIN
// clauses.
function getModelsForFilterObject(object) {
    function fieldNameToModel(fieldName) {
        var model;
        if (fieldName.indexOf('udf:') === 0) {
            model = utils.parseUdfCollectionFieldName(fieldName).modelName;
            if (model === "tree") {
                return ["tree", "udf"];
            }
            return ["udf"];
        }

        model = fieldName.split('.')[0];

        if (!config.modelMapping[model]) {
            throw new Error('The model name must be one of the following: ' +
                            Object.keys(config.modelMapping).join(', ') + '. Not ' + model);
        }
        return [model];
    }
    return _.uniq(_.flatten(_.map(utils.filterObjectKeys(object), fieldNameToModel)));
}

