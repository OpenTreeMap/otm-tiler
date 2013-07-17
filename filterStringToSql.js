// Convert an OpenTreeMap 2 filter string to a Postgres/PostGIS-compatible
// SQL WHERE clause.

// A filter string must be valid JSON and conform to the following grammar:
//
//     literal        = json literal | GMT date string in 'YYYY-MM-DD HH:mm:ss'
//     model          = 'plot' | 'tree'
//     value-property = 'MIN' | 'MAX' | 'EXCLUSIVE' | 'IN' | 'IS' | 'LIKE' | 'WITHIN_RADIUS' | 'IN_BOUNDARY'
//     combinator     = 'AND' | 'OR'
//     predicate      = { model.field: literal }
//                    | { model.field: { (value-property: literal)* }}
//     filter         = predicate
//                    | [combinator, filter*]

var _ = require('underscore');
var moment = require('moment');
var config = require('./config.json');

// Exports
//---------------------------

// This module exports a single conversion function that takes a JSON format
// string.

exports = module.exports = function (s) {
    if (!s) {
        throw new Error('A null, undefined, or empty filter string cannot be converted to SQL');
    }
    return filterToSql(JSON.parse(s));
};

// Constants
//---------------------------

// The `MODEL_MAPPING` dictionary is used to convert a short model name to a
// physical table name.
var MODEL_MAPPING = {
    plot: 'treemap_plot',
    tree: 'treemap_tree',
    species: 'treemap_species'
};

// The `PREDICATE_TYPES` dictionary is used for validating predicates and
// providing values and methods used to convert predicates into SQL strings.
var PREDICATE_TYPES = {
    IS: {
        combinesWith: [],
        matcher: '=',
        valueConverter: convertValueToEscapedSqlLiteral
    },
    IN: {
        combinesWith: [],
        matcher: 'IN',
        valueConverter: convertArrayValueToEscapedSqlLiteral
    },
    LIKE: {
        combinesWith: [],
        matcher: 'ILIKE',
        valueConverter: convertValueToEscapedSqlLiteral
    },
    MIN: {
        combinesWith: ['MAX'],
        matcher: '>=',
        exclusiveMatcher: '>',
        valueConverter: convertValueToEscapedSqlLiteral
    },
    MAX: {
        combinesWith: ['MIN'],
        matcher: '<=',
        exclusiveMatcher: '<',
        valueConverter: convertValueToEscapedSqlLiteral
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
function transformBoundaryPredicate(boundaryid) {
    var select = "SELECT the_geom_webmercator " +
            "FROM treemap_boundary WHERE id=" +
            boundaryid;

    return 'ST_Contains((' + select + '), <%= column %>)';
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

// The `DATETIME_FORMATS` dictionary contains constant strings used to validate
// and format date and datetime strings.
var DATETIME_FORMATS = {
    full: 'YYYY-MM-DD HH:mm:ss',
    date: 'YYYY-MM-DD',
    time: 'HH:mm:ss'
};

// Internal Methods
//---------------------------

// The tiler is built on top of Windshaft, which uses sql strings for filtering
// rather than a more complex (but safer) parameterized query system. As a result
// we need this 'sanitizeSqlString' method to remove malicous SQL injection tricks.
function sanitizeSqlString(value) {
    // Strip off a trailing statement to prevent "value = 4; DROP TABLE FOO;"
    return value.replace(/;[\w\s;]*$/, '');
}

// `fieldNameToColumnName` converts a string of the format model.column
// to "physicalTableName"."column"
function fieldNameToColumnName(fieldName) {
    var modelAndColumn = fieldName.split('.');
    var model, column, customColumnName;
    if (modelAndColumn.length != 2) {
        throw new Error('Field names in predicate objects should be of the form "model.field", not "' + fieldName + '"');
    }
    if (!MODEL_MAPPING[modelAndColumn[0]]) {
        throw new Error('The model name must be one of the following: ' + Object.keys(MODEL_MAPPING).join(', ') + '. Not ' + modelAndColumn[0]);
    }
    model = MODEL_MAPPING[modelAndColumn[0]]; // model is not sanitized because there is a whitelist
    column =  sanitizeSqlString(modelAndColumn[1]);
    customColumnName = config.customDbFieldNames[column];

    column = customColumnName || column;

    if (!MODEL_MAPPING[modelAndColumn[0]]) {
        throw new Error('The model name must be one of the following: ' + Object.keys(MODEL_MAPPING).join(', ') + '. Not ' + modelAndColumn[0]);
    }
    return '"' + model + '"."' + column + '"';
}

// `isDateString` returns a boolean indicating whether or not the string value
// should be treated as datetime.
function isDateTimeString(value) {
    return moment(value, DATETIME_FORMATS.full).isValid();
}

// `dateTimeStringToSqlValue` converts a datetime string into a Postgres
// compatible literal date and time value.
function dateTimeStringToSqlValue(dtString) {
    var m = moment(dtString, DATETIME_FORMATS.full);
    return "(DATE '" + m.format(DATETIME_FORMATS.date) +
        "' + TIME '" + m.format(DATETIME_FORMATS.time) + "')";
}

// `convertValueToEscapedSqlLiteral` converts a string or number literal
// to be used as SQL query values by wrapping non-numeric values in single quotes,
// escaping single quotes within string literals by converting them into
// a pair of single quotes, and converting YYYY-MM-DD HH:mm:ss datetime strings
// into the correct Postgres literal.
function convertValueToEscapedSqlLiteral(value) {
    if (_.isNumber(value)) {
        return value;
    } else if (isDateTimeString(value)) {
        return dateTimeStringToSqlValue(value);
    } else {
        return "'" + sanitizeSqlString(value).replace("'", "''") + "'";
    }
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
    return _.map(values, convertValueToEscapedSqlLiteral);
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
    return _.map(predicate, predicateValueAndTypeToFilterObject);
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
            return _.template(f.sql_template, { 'column': columnName });
        } else {
            return columnName + ' ' + f.matcher + ' ' + f.value;
        }
    });
    return '(' + filterStatements.join(' AND ') + ')' ;
}

// `objectToSql` converts a filter object to a valid SQL WHERE clause.
function objectToSql(o) {
    var statements = [];
    if (Object.keys(o).length === 0) {
        throw new Error("An empty object cannot be converted to SQL");
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
    if (a.length === 0) {
        throw new Error("An empty array is not a valid combinator");
    }
    if (a[0] !== "AND" && a[0] !== "OR") {
        throw new Error('The first element of a combinator array must be "AND" or "OR", not ' + a[0]);
    }
    _.each(a, function(filter, index) {
        if (index > 0) {
            statements.push(filterToSql(filter));
        }
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
