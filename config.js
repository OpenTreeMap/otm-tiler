module.exports = {
    "filterQueryArgumentName": "q",
    "displayQueryArgumentName": "show",
    // This is the column name of the hstore column used for scalar udfs
    "scalar_udf_field": "udfs",
    "sqlForMapFeatures": {
        "fields": {
            "geom": {
                "point": "the_geom_webmercator",
                "polygon": "stormwater_polygonalmapfeature.polygon"
            },
            "base": "feature_type",
            "utfGrid": "feature_type, treemap_mapfeature.id AS id"
        },
        "basePointModel": "mapFeature",
        "basePolygonModel": "polygonalMapFeature",
        // The tables object gets walked by filtersToTables to build the FROM and JOIN clauses of the SQL string.
        // The "depends" property of each item should include any tables used in the "sql" property to JOIN to that table
        "tables": {
            "mapFeature": {
                "depends": [],
                "sql": "treemap_mapfeature"
            },
            "polygonalMapFeature": {
                "depends": ["mapFeature"],
                "sql": "LEFT OUTER JOIN stormwater_polygonalmapfeature ON stormwater_polygonalmapfeature.mapfeature_ptr_id = treemap_mapfeature.id"
            },
            "tree": {
                "depends": ["mapFeature"],
                "sql": "LEFT OUTER JOIN treemap_tree ON treemap_mapfeature.id = treemap_tree.plot_id"
            },
            "species": {
                "depends": ["mapFeature", "tree"],
                "sql": "LEFT OUTER JOIN treemap_species ON treemap_tree.species_id = treemap_species.id"
            },
            "mapFeaturePhoto": {
                "depends": ["mapFeature"],
                "sql": "LEFT OUTER JOIN treemap_mapfeaturephoto ON treemap_mapfeature.id = treemap_mapfeaturephoto.map_feature_id"
            },
            "udf": {
                // Despite mapFeature not being referenced in the "sql" property it will
                // be used in the filter for udf and so it is required
                "depends": ["mapFeature"],
                // udf uses a CROSS JOIN, but in filterObjectToWhere a restrictive WHERE clause is added
                "sql": "CROSS JOIN treemap_userdefinedcollectionvalue"
            }
        },
        "where": {
            "instance" : "treemap_mapfeature.instance_id = <%= instanceid %>"
        }
    },
    "treeDisplayFilters": ["EmptyPlot", "Tree"],
    "boundaryGrainstoreSql": "(SELECT the_geom_webmercator FROM treemap_boundary JOIN treemap_instance_boundaries ON treemap_instance_boundaries.boundary_id = treemap_boundary.id WHERE treemap_instance_boundaries.instance_id=<%= instanceid %>) otmfiltersql",
    "getBoundarySql" : "SELECT the_geom_webmercator FROM treemap_boundary WHERE id=<%= boundaryId %>",
    "customDbFieldNames": {
        "geom": "the_geom_webmercator"
    },
    "interactivityForUtfGridRequests": "id",
    "modelMapping": {
        "mapFeature": "treemap_mapfeature",
        "polygonalMapFeature": "stormwater_polygonalmapfeature",
        "tree": "treemap_tree",
        "species": "treemap_species",
        "mapFeaturePhoto": "treemap_mapfeaturephoto",
        "udf": "treemap_userdefinedcollectionvalue"
    },
    "udfcTemplates": {
        "tree": "treemap_userdefinedcollectionvalue.field_definition_id=<%= fieldDefId %> AND treemap_userdefinedcollectionvalue.model_id=treemap_tree.id",
        "mapFeature": "treemap_userdefinedcollectionvalue.field_definition_id=<%= fieldDefId %> AND treemap_userdefinedcollectionvalue.model_id=treemap_mapfeature.id",
    },
    "treeMarkerMaxWidth": 20
};
