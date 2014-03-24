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

function traverseObject (object, callback) {
    if (Object.keys(object).length === 0) {
        throw new Error("An empty object cannot be converted to SQL");
    }
    _.each(object, callback);
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

module.exports = {
    traverseCombinator: traverseCombinator,

    traverseObject: traverseObject,

    isTreeInDisplayFilters: isTreeInDisplayFilters,

    convertValueToEscapedSqlLiteral: convertValueToEscapedSqlLiteral,

    sanitizeSqlString: sanitizeSqlString
};
