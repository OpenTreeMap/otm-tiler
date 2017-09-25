"use strict";

// Convert an OpenTreeMap 2 filter string to a Postgres/PostGIS-compatible
// SQL WHERE clause.

// A filter string must be valid JSON and conform to the following grammar:
//
//     literal        = json literal | GMT date string in 'YYYY-MM-DD HH:mm:ss'
//     model-name     = 'mapFeature' | 'tree' | 'species' | 'mapFeaturePhoto'
//     model          = 'udf:'model-name | model-name
//     value-property = 'MIN'
//                    | 'MAX'
//                    | 'EXCLUSIVE'
//                    | 'IN'
//                    | 'IS'
//                    | 'ISNULL'
//                    | 'LIKE'
//                    | 'WITHIN_RADIUS'
//                    | 'IN_BOUNDARY'
//     combinator     = 'AND' | 'OR'
//     predicate      = { model.['udf:']field: literal }
//                    | { model.['udf:']field: { (value-property: literal)* }}
//     filter         = predicate
//                    | [combinator, filter*]

var _ = require('underscore'),
    config = require('./config'),
    utils = require('./filterObjectUtils'),
    format = require('util').format;

// Exports
//---------------------------

// This module exports a single conversion function that takes a JSON format
// string.

exports = module.exports = function (object) {
    if (_.isUndefined(object) || _.isNull(object)) {
        throw new Error('A null or undefined filter object cannot be converted to SQL');
    }
    return filterToSql(object);
};

// Constants
//---------------------------

// The `PREDICATE_TYPES` dictionary is used for validating predicates and
// providing values and methods used to convert predicates into SQL strings.
var PREDICATE_TYPES = {
    IS: {
        combinesWith: [],
        matcher: '=',
        valueConverter: utils.convertValueToEscapedSqlLiteral
    },
    ISNULL: {
        combinesWith: [],
        matcher: 'IS',
        valueConverter: convertValueForIsNull
    },
    IN: {
        combinesWith: [],
        matcher: 'IN',
        valueConverter: convertArrayValueToEscapedSqlLiteral
    },
    LIKE: {
        combinesWith: [],
        matcher: 'ILIKE',
        valueConverter: convertValueForLike
    },
    MIN: {
        combinesWith: ['MAX'],
        matcher: '>=',
        exclusiveMatcher: '>',
        valueConverter: utils.convertValueToEscapedSqlLiteral
    },
    MAX: {
        combinesWith: ['MIN'],
        matcher: '<=',
        exclusiveMatcher: '<',
        valueConverter: utils.convertValueToEscapedSqlLiteral
    },
    IN_BOUNDARY: {
        combinesWith: ['WITHIN_RADIUS'],
        predicateTransform: transformBoundaryPredicate
    },
    WITHIN_RADIUS: {
        combinesWith: ['IN_BOUNDARY'],
        predicateTransform: transformWithinRadiusPredicate
    }
};

// `transformBoundaryPredicate` transform a predicate that contains a single value
// representing a boundary. In particular, this is used with the IN_BOUNDARY
function transformBoundaryPredicate(boundaryId) {
    var selectTemplate = _.template(config.getBoundarySql),
        selectStatement = selectTemplate({boundaryId: boundaryId});

    return 'ST_Contains((' + selectStatement + '), <%= column %>)';
}

// `transformWithinRadiusPredicate` takes an object containing point and radius
// data. It returns an underscore template that is used to produce an SQL where
// clause.
function transformWithinRadiusPredicate(predicateValue) {
    var point = predicateValue.POINT,
        radius = predicateValue.RADIUS,

        template = "ST_DWithin(<%= column %>, ST_GeomFromEWKT('SRID=3587;POINT(" +
            point.x + " " + point.y + ")'), " + radius + ")";

    return template;
}

// `accessHstore` takes an HStore column name and a key for that collection and
// returns a sql escaped string for accessing that member in the SELECT clause
// of a SQL statement.
// accessHStore('grab_bag', 'is_valid') -> "grab_bag"->'is_valid'
function accessHStore(hStoreColumn, accessor) {
    // TODO: sql injection? why don't we call sanitize?
    var t = _.template('"<%= hStoreColumn %>"::hstore->\'<%= accessor %>\'');
    return t({hStoreColumn: hStoreColumn,
              accessor: accessor.replace(/'/g, "''")});
}


// Internal Methods
//---------------------------

// `fieldNameToColumnName` converts a string of the format model.column
// to "physicalTableName"."column" for simple fieldNames. For udf scalar or collection
// fieldNames, the fieldName is converted to "physicalTableName"."column"->"hStoreMember".
function fieldNameToColumnName(fieldName) {
    var concreteModel, model, column, customColumnName,
        tableName, modelAndColumn, udfCollectionData;

    if (fieldName.indexOf('udf:') === 0) {
        udfCollectionData = utils.parseUdfCollectionFieldName(fieldName);
        model = udfCollectionData.modelName;
        column = accessHStore('data', udfCollectionData.hStoreMember);
        tableName = config.modelMapping.udf;
    } else {
        modelAndColumn = fieldName.split('.');

        if (modelAndColumn.length != 2) {
            throw new Error('Field names in predicate objects ' +
                            'should be of the form "model.field", not "' +
                            fieldName + '"');
        }

        concreteModel = modelAndColumn[0];

        // The `modelMapping` dictionary is used to convert a short model name to a
        // physical table name.
        if (!config.modelMapping[concreteModel]) {
            throw new Error('The model name must be one of the following: ' +
                            Object.keys(config.modelMapping).join(', ') + '. Not ' + model);
        }

        column = modelAndColumn[1];
        // udf columns are prefixed by 'udf:'
        if (column.indexOf('udf:') === 0) {
            column = accessHStore(config.scalar_udf_field, column.substring(4));
            model = concreteModel === 'tree' ? 'tree' : 'mapFeature';
        } else {
            column = utils.sanitizeSqlString(modelAndColumn[1]);
            customColumnName = config.customDbFieldNames[column];

            column = customColumnName || column;
            column = '"' + column + '"';
            model = concreteModel;
        }

        tableName = config.modelMapping[model]; // model is not sanitized because there is a whitelist
    }

    return '"' + tableName + '".' + column;
}

// `convertArrayValueToEscapedSqlLiteral` converts an array of string or number
// literals to be used as a SQL query values by wrapping each non-numeric value
// in single quotes, escaping single quotes within individual string
// literals by converting them into a pair of single quotes, and converting
// individual datetime string values matching the defined datetime format
// into the correct Postgres literal. Individual values are then joined into
// a CSV string wrapped with (), suitable for use in a SQL IN clause.
function convertArrayValueToEscapedSqlLiteral(arrayValue) {
    if (_.isArray(arrayValue)) {
        return '(' + convertValuesToEscapedSqlLiterals(arrayValue).join(',') + ')';
    } else {
        throw new Error("Non-array passed to convertArrayValueToEscapedSqlLiteral");
    }
}

// `convertValuesToEscapedSqlLiterals` converts an array of string or number literals
// to be used as SQL query values by wrapping non-numeric values in single quotes,
// escaping single quotes within string literals by converting them into
// a pair of single quotes, and converting YYYY-MM-DD HH:mm:ss datetime strings
// into the correct Postgres literal.
function convertValuesToEscapedSqlLiterals(values) {
    return _.map(values, utils.convertValueToEscapedSqlLiteral);
}

// `convertValueForIsNull` converts a literal to "NULL" or "NOT NULL" based on its
// truthiness.  Truthy values -> "NULL", falsey values -> "NOT NULL"
function convertValueForIsNull(value) {
    return !!value ? "NULL" : "NOT NULL";
}

function convertValueForLike(value) {
    return "'%" + utils.sanitizeSqlString(value).replace(/'/g, "''") + "%'";
}

// `validatePredicate` throws an error if the specified `predicate` object
// is not valid.
function validatePredicate(predicate) {
    var keys;
    if (!_.isObject(predicate)) {
        throw new Error('Predicates must be objects');
    }
    keys = Object.keys(predicate);
    _.each(keys, function(key) {
        if (!PREDICATE_TYPES[key]) {
            throw new Error('Predicates support the following keys: ' +
                Object.keys(PREDICATE_TYPES).join(',') + ' not ' + key);
        }
        if (!_.all(keys, function(otherKey) {
            return (key === otherKey ||
                _.contains(PREDICATE_TYPES[key].combinesWith, otherKey));
        })) {
            throw new Error('A predicate with keys ' + keys.join(',') +
                ' is not valid because the predicate key ' + key +
                ' can only be combined with the following keys: ' +
                PREDICATE_TYPES[key].combinesWith.join(','));
        }
    });
}

// `predicateValueAndTypeToFilterObject` converts a value and type to
function predicateValueAndTypeToFilterObject(predicateValue, predicateType) {
    var matcher;
    var value;
    var t = PREDICATE_TYPES[predicateType];

    // Predicate transforms override matchers and can return
    // literal SQL
    if (t.predicateTransform) {
        return { sql_template: t.predicateTransform(predicateValue) };
    } else {
        // _.isObject can be truthy for arrays
        if (_.isObject(predicateValue) && !_.isArray(predicateValue)) {
            matcher = predicateValue.EXCLUSIVE ? t.exclusiveMatcher : t.matcher;
            value = predicateValue.value;
        } else if (_.contains(['MAX', 'MIN'], predicateType) &&
                   _.contains([undefined, null, ""], predicateValue)) {
            return null;
        } else {
            matcher = t.matcher;
            value = predicateValue;
        }

        return { matcher: matcher, value: t.valueConverter(value) };
    }
}

// `predicateToFilterObjects` converts the specified `predicate` object into
// an array of filter objects. Each element in the returned array will
// be an object with two keys, `matcher` and `value` e.g. {matcher: "=", value: 4}
// or an object with a single key called `sql_template` that contains an
// underscore template that accepts a `column` parameter. If `sql_template` is
// provided, the template is evaluated and the result is used as the SQL.
function predicateToFilterObjects(predicate) {
    validatePredicate(predicate);
    return _.reject(_.map(predicate, predicateValueAndTypeToFilterObject), _.isNull);
}

// `fieldNameAndPredicateToSql` converts the specified `fieldName` and `predicate`
// object into a valid SQL WHERE clause.
function fieldNameAndPredicateToSql(fieldName, predicate) {
    var columnName = fieldNameToColumnName(fieldName);
    var filters = predicateToFilterObjects(predicate);
    var filterStatements = _.map(filters, function(f) {
        // If a literal value is found it probably needs the column
        // name somewhere besides the LHS so we provide it via
        // an underscore template
        if (f.sql_template) {
            return _.template(f.sql_template)({ 'column': columnName });
        } else {
            if (columnName.indexOf('->') !== -1) {
                // if the column is an hstore field and the value is a
                // datestring literal the hstore field must be converted
                // from text to date before comparsion
                if (_.isString(f.value) && f.value.indexOf('(DATE') === 0) {
                    columnName = format("to_date(%s::text, '%s')",
                                        columnName, utils.DATETIME_FORMATS.date);
                } else if (_.isNumber(f.value)) {
                    columnName = format("( %s )::float ", columnName);
                } else {
                    columnName = format("(%s)", columnName);
                }
            }
            return columnName + ' ' + f.matcher + ' ' + f.value;
        }
    });
    // If this is a query for collection UDFs, we need extra information in the
    // WHERE clause to act as a join criteria, since the table is CROSS JOINed
    if (fieldName.indexOf('udf:') === 0) {
        var udfCollectionData = utils.parseUdfCollectionFieldName(fieldName);
        var model = udfCollectionData.modelName;

        // Most collection UDFs relate to MapFeatures.  The odd duck
        // is Tree Collection UDFs
        var udfcTemplate = _.template(model === "tree" ?
                                      config.udfcTemplates.tree :
                                      config.udfcTemplates.mapFeature);

        filterStatements.push(
            udfcTemplate({fieldDefId: udfCollectionData.fieldDefId}));
    }
    return '(' + filterStatements.join(' AND ') + ')' ;
}

// `objectToSql` converts a filter object to a valid SQL WHERE clause.
function objectToSql(o) {
    var statements = [];
    if (Object.keys(o).length === 0) {
        return '';
    }
    _.each(o, function (valueOrPredicate, fieldName) {
        var predicate;
        if (!_.isObject(valueOrPredicate)) {
            predicate = {"IS": valueOrPredicate};
        } else {
            predicate = valueOrPredicate;
        }
        statements.push(fieldNameAndPredicateToSql(fieldName, predicate));
    });
    return statements.join(' AND ');
}

// `arrayToSql` converts a combinator array into a valid SQL WHERE clause.
function arrayToSql(a) {
    var statements = [];
    utils.traverseCombinator(a, function(filter, index) {
        statements.push(filterToSql(filter));
    });
    return '(' + statements.join(' ' + a[0] + ' ') + ')';
}

// `filterToSql` converts any filter object or combinator array into a valid SQL WHERE clause.
function filterToSql(f) {
    if (_.isArray(f)) {
        return arrayToSql(f);
    } else if (_.isObject(f)) {
        return objectToSql(f);
    } else {
        throw new Error('A filter must be an Object or an Array');
    }
}
