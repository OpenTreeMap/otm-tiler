module.exports = {
    instanceConfig: function(opts) {
        return function (req, res, next) {
            var start = Date.now();
            req.instanceConfig = {};
            opts.dbPool.connect(function(err, client, done) {
                if (!err) {
                    var instanceId = parseInt(req.query.instance_id, 10);
                    client.query('SELECT config FROM treemap_instance WHERE id = $1',
                                 [instanceId], function(err, result) {
                                     if (!err && result && result.rows && result.rows.length > 0) {
                                         req.instanceConfig = JSON.parse(result.rows[0].config);
                                     }
                                     done();
                                     if (opts.debug) {
                                         console.log('[instanceConfig] query time ' + (Date.now() - start));
                                     }
                                     next(err);
                                 });
                } else {
                    done();
                    if (opts.debug) {
                        console.log('[instanceConfig] query time ' + (Date.now() - start));
                    }
                    next(err);
                }
            });
        };
    }
};
