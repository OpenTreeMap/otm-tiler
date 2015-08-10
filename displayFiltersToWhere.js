"use strict";

var _ = require('underscore'),
    format = require('util').format,
    utils = require('./filterObjectUtils'),
    config = require('./config.json');

module.exports = function(displayFilters, displayPlotsOnly) {
    var featureTypes, inClause;

    if ( ! _.isBoolean(displayPlotsOnly)) {
        throw new Error('`displayPlotsOnly must be a boolean value.');
    }

    if (displayPlotsOnly) {
        if (_.isArray(displayFilters) && displayFilters.length > 0) {
            displayFilters = _.intersection(displayFilters, ['Tree', 'Plot', 'EmptyPlot']);
        } else {
            displayFilters = ['Plot'];
        }
    }

    // If there are still no display filters (none from query args, and we're
    // not filtering trees), return `null` to indicate that there is no SQL generated
    if (_.isUndefined(displayFilters) || _.isNull(displayFilters)) {
        return null;
    }

    if ( ! _.isArray(displayFilters)) {
        throw new Error('The display filter list must be a list to be converted to SQL');
    }
    if (_.isEmpty(displayFilters)) {
        // With empty display filters, nothing should ever be shown
        // 'WHERE FALSE' should override any other filters
        return 'FALSE';
    }

    if ( ! utils.isTreeInDisplayFilters(displayFilters)) {
        featureTypes = _.map(displayFilters, utils.convertValueToEscapedSqlLiteral);
        inClause = featureTypes.join(', ');
        return format('"%s"."feature_type" IN ( %s )', config.modelMapping.mapFeature, inClause);
    }

    var clauses = _.map(displayFilters, function(filter) {
        var modelSql, treeSql, modelNameString;
        if (_.contains(config.treeDisplayFilters, filter)) {
            if (filter === 'Tree') {
                treeSql = format('"%s"."id" IS NOT NULL', config.modelMapping.tree);
            } else {
                treeSql = format('"%s"."id" IS NULL', config.modelMapping.tree);
            }
            filter = 'Plot';
        }
        modelNameString = utils.convertValueToEscapedSqlLiteral(filter);
        modelSql = format('"%s"."feature_type" = %s', config.modelMapping.mapFeature, modelNameString);
        if (treeSql) {
            return format("(%s) AND (%s)", treeSql, modelSql);
        }
        return modelSql;
    });

    return '(' + clauses.join(") OR (") + ')';
};
