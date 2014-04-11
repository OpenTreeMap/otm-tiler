"use strict";

var _ = require('underscore');
var moment = require('moment');
var config = require('./config.json');

// The `DATETIME_FORMATS` dictionary contains constant strings used to validate
// and format date and datetime strings.
var DATETIME_FORMATS = {
    full: 'YYYY-MM-DD HH:mm:ss',
    date: 'YYYY-MM-DD',
    time: 'HH:mm:ss'
};

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

function traverseCombinator (array, callback) {
    if (array.length === 0) {
        throw new Error("An empty array is not a valid combinator");
    }
    if (array[0] !== "AND" && array[0] !== "OR") {
        throw new Error('The first element of a combinator array must be "AND" or "OR", not ' + array[0]);
    }
    // Use _.rest to skip the "AND"/"OR"
    _.each(_.rest(array), callback);
}

function isTreeInDisplayFilters (displayFilters) {
    if (_.isArray(displayFilters)) {
        return _.any(displayFilters, function(filter) {
            return _.contains(config.treeDisplayFilters, filter);
        });
    }
    return false;
}

// `convertValueToEscapedSqlLiteral` converts a string or number literal
// to be used as SQL query values by wrapping non-numeric values in single quotes,
// escaping single quotes within string literals by converting them into
// a pair of single quotes, converting YYYY-MM-DD HH:mm:ss datetime strings
// into the correct Postgres literal, and converting null into the string NULL.
function convertValueToEscapedSqlLiteral (value) {
    if (_.isNumber(value)) {
        return value;
    } else if (value === null) {
        return "NULL";
    } else if (isDateTimeString(value)) {
        return dateTimeStringToSqlValue(value);
    } else {
        return "'" + sanitizeSqlString(value).replace("'", "''") + "'";
    }
}

// The tiler is built on top of Windshaft, which uses sql strings for filtering
// rather than a more complex (but safer) parameterized query system. As a result
// we need this 'sanitizeSqlString' method to remove malicous SQL injection tricks.
function sanitizeSqlString (value) {
    // Strip off a trailing statement to prevent "value = 4; DROP TABLE FOO;"
    return value.replace(/;[\w\s;]*$/, '');
}

// Clauses in the filterObject that correspond to
// `(python)UserDefinedCollectionValue` data are transmitted as keys
// with a special syntax. `parseUdfCollectionFieldName` parses this
// syntax into an object of the relevant components.
function parseUdfCollectionFieldName (fieldName) {
    var tokens = fieldName.split(':'),
        fieldDefIdAndHStoreMember;

    if (tokens.length !== 3) {
        return null;
    }

    fieldDefIdAndHStoreMember = tokens[2].split('.');

    return {
        modelName: 'udf:' + tokens[1],
        fieldDefId: fieldDefIdAndHStoreMember[0],
        hStoreMember: fieldDefIdAndHStoreMember[1]
    };
}

// `getUdfFieldDefId` examines a filterObject to determine if it has
// predicates for `(python)UserDefinedCollectionValues`. This is
// necessary for adding an additional component to the where clause to
// filter on the `(python)UserDefinedFieldDefinition` id.  When ids
// are found, they are validated not to allow multiple ids, which are
// not supported.  returns null for non UDCV queries.
function getUdfFieldDefId (filterObject) {
    var udfCollectionValues = _.reject(_(_.keys(filterObject)).map(parseUdfCollectionFieldName), _.isNull),
        udfFieldDefIds = _.uniq(_.pluck(udfCollectionValues, 'fieldDefId'));
    if (udfFieldDefIds.length === 1) {
        return udfFieldDefIds[0];
    } else if (udfFieldDefIds.length === 0) {
        return null;
    } else {
        throw ("Multiple UserDefinedFieldDefinition ids found in filterObject. " +
               "Only one is supported per request.");
    }
}


module.exports = {
    traverseCombinator: traverseCombinator,

    isTreeInDisplayFilters: isTreeInDisplayFilters,

    convertValueToEscapedSqlLiteral: convertValueToEscapedSqlLiteral,

    sanitizeSqlString: sanitizeSqlString,

    parseUdfCollectionFieldName: parseUdfCollectionFieldName,

    getUdfFieldDefId: getUdfFieldDefId,

    DATETIME_FORMATS: DATETIME_FORMATS
};
