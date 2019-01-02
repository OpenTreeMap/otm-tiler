// If any changes are made to this stylesheet, make sure those
// changes are replicated in uncoloredMapFeature.mms (if necessary)

@tree_fill_color: #8BAA3C;
@tree_stroke_color: #A5BF5B;

@empty_plot_fill_color: #E1C6FF;
@empty_plot_stroke_color: #D4B5F9;

@gsi_fill_color: #388E8E;

@tree_gsi_border_color: #b6ce78;

#treemap_mapfeature {
    [tree_id!=null][feature_type="Plot"] {
        marker-fill: @tree_fill_color;
    }
    [tree_id=null][feature_type="Plot"] {
        marker-fill: @empty_plot_fill_color;
    }

    [feature_type!="Plot"] {
        marker-fill: @gsi_fill_color;
    }

    marker-allow-overlap: true;

    [tree_id!=null][feature_type="Plot"][zoom >= 15] {
        marker-line-color: @tree_stroke_color;
    }
    [tree_id=null][feature_type="Plot"][zoom >= 15] {
        marker-line-color: @empty_plot_stroke_color;
    }
    [tree_id!=null][feature_type="Plot"][zoom >= 15] {
        marker-line-color: @tree_gsi_border_color;
    }
    [feature_type!="Plot"][zoom >= 15] {
        marker-line-color: @tree_gsi_border_color;
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
