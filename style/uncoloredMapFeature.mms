// This stylesheet is the same as mapFeature.mms, but without any color information,
// which is used for UTF Grid requests for map features
//
// Since Windshaft automatically includes attributes in the CartoCSS into the SQL query,
// we can avoid needing to join to the treemap_tree table by maintaining a separate style
// that does not need attributes from the tree table
#treemap_mapfeature {
    marker-allow-overlap: true;

    [zoom >= 15] {
        marker-line-width: 1;
    }
    [zoom < 15] {
        marker-line-width: 0;
    }


    [zoom >= 18] {
        marker-width: 20;
    }
    [zoom = 17] {
        marker-width: 15;
    }
    [zoom = 16] {
        marker-width: 12;
    }
    [zoom = 15] {
        marker-width: 8;
    }
    [zoom <= 14] {
        marker-width: 5;
    }

}
