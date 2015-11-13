# OpenTreeMap 2 Map Tile Server
[![Build Status](https://travis-ci.org/OpenTreeMap/otm-tiler.svg?branch=master)](https://travis-ci.org/OpenTreeMap/otm-tiler) [![Coverage Status](https://coveralls.io/repos/OpenTreeMap/otm-tiler/badge.png?branch=master)](https://coveralls.io/r/OpenTreeMap/otm-tiler?branch=master)

This project requires several environment variables, containing connection information.

They should be similar to:
```
OTM_DB_USER = 'otm',
OTM_DB_PASSWORD = 'otm',
OTM_DB_HOST = 'localhost',
OTM_DB_PORT = 5432

OTM_CACHE_HOST = '127.0.0.1',
OTM_CACHE_PORT = 6379
```

Please view the [javascript documentation](http://opentreemap.github.io/otm-tiler/server.html).
