// If any changes are made to this stylesheet, make sure those
// changes are replicated in uncoloredMapFeature.mms (if necessary)
#treemap_mapfeature {
    [tree_id!=null][feature_type="Plot"] {
        marker-fill: #8BAA3D;
    }
    [tree_id=null][feature_type="Plot"] {
        marker-fill: #BCA371;
    }

    [feature_type!="Plot"] {
        marker-fill: #388E8E;
    }

    marker-allow-overlap: true;


    [tree_id=null][feature_type="Plot"][zoom >= 15] {
        marker-line-color: #D3C3A5;
    }
    [tree_id!=null][feature_type="Plot"][zoom >= 15] {
        marker-line-color: #b6ce78;
    }
    [feature_type!="Plot"][zoom >= 15] {
        marker-line-color: #b6ce78;
    }
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
