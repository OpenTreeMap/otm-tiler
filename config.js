"use strict";

var canopyBoundarySql = [
    "SELECT the_geom_webmercator",
    ", canopy_percent * 100 as percent",
    ", FORMAT('%s (%s%%)',",
    // Remove parent boundary name suffix.
    // Ex. Pittsburgh (Allegheny) -> Pittsburgh
    "    SPLIT_PART(name, ' (', 1),",
    "    ROUND(CAST(canopy_percent * 100 AS numeric), 1)) as label",
    " FROM treemap_boundary AS b",
    " INNER JOIN treemap_instance_boundaries AS ib ON ib.boundary_id = b.id",
    " WHERE ib.instance_id = <%= instanceid %>",
    " AND b.category = '<%= category %>'",
    " AND b.canopy_percent IS NOT NULL",
    " AND b.canopy_percent >= <%= canopy_min %>",
    " AND b.canopy_percent <= <%= canopy_max %>",
].join('');

module.exports = {
    "filterQueryArgumentName": "q",
    "displayQueryArgumentName": "show",
    "restrictFeatureQueryArgumentName": "restrict",
    // This is the column name of the hstore column used for scalar udfs
    "scalar_udf_field": "udfs",
    "sqlForMapFeatures": {
        "fields": {
            "geom": {
                "point": "the_geom_webmercator",
                "polygon": "stormwater_polygonalmapfeature.polygon"
            },
            "base": "feature_type, treemap_tree.id AS tree_id",
            "polygon": "feature_type",
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
            "plot": {
                "depends": ["mapFeature"],
                "sql": "JOIN treemap_plot ON treemap_mapfeature.id = treemap_plot.mapfeature_ptr_id"
            },
            "rainBarrel": {
                "depends": ["mapFeature"],
                "sql": "JOIN stormwater_rainbarrel ON treemap_mapfeature.id = stormwater_rainbarrel.mapfeature_ptr_id"
            },
            "rainGarden": {
                "depends": ["mapFeature"],
                "sql": "JOIN stormwater_raingarden ON treemap_mapfeature.id = stormwater_raingarden.polygonalmapfeature_ptr_id"
            },
            "bioswale": {
                "depends": ["mapFeature"],
                "sql": "JOIN stormwater_bioswale ON treemap_mapfeature.id = stormwater_bioswale.polygonalmapfeature_ptr_id"
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
    "boundaryGrainstoreSql": "SELECT the_geom_webmercator FROM treemap_boundary JOIN treemap_instance_boundaries ON treemap_instance_boundaries.boundary_id = treemap_boundary.id WHERE treemap_instance_boundaries.instance_id=<%= instanceid %> AND treemap_boundary.searchable=true",
    "getBoundarySql" : "SELECT the_geom_webmercator FROM treemap_boundary WHERE id=<%= boundaryId %>",
    "canopyBoundarySql": canopyBoundarySql,
    "showAtZoomSql": "(treemap_mapfeature.hide_at_zoom IS NULL OR treemap_mapfeature.hide_at_zoom < <%= zoom %>)",
    "customDbFieldNames": {
        "geom": "the_geom_webmercator"
    },
    "interactivityForUtfGridRequests": "id",
    "modelMapping": {
        "mapFeature": "treemap_mapfeature",
        "polygonalMapFeature": "stormwater_polygonalmapfeature",
        "tree": "treemap_tree",
        "plot": "treemap_plot",
        "rainBarrel": "stormwater_rainbarrel",
        "rainGarden": "stormwater_raingarden",
        "bioswale": "stormwater_bioswale",
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
