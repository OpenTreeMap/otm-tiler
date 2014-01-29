var config = require('./config.json');

exports = module.exports = function (s) {
    if (!s) {
        throw new Error('A null, undefined, or empty filter string cannot be converted to SQL');
    }

    if (s.match(/(tree\.|species\.)/)) {
        return config.sqlForMapFeatures.tables.tree;
    } else {
        return config.sqlForMapFeatures.tables.mapfeature;
    }
};
