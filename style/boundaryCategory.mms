#treemap_boundary {
  ::case {
	  line-width: 1;
	  line-color:#000;
      line-opacity: 0.6;

	  [category="Neighborhood"] {
		line-width: 5;
		line-color:#ddd;
		line-opacity: 0.7;
      }
	  [category="Main Neighborhood"] {
		line-width: 5;
		line-color:#ddd;
		line-opacity: 0.7;
      }
	  [category="Ward"] {
		line-width: 5;
		line-color:#ddd;
		line-opacity: 0.7;
      }
  }

  ::fill {
	line-width: 0.75;
	line-color: #000;
	line-opacity: 0.8;
    polygon-fill: #55A9F2;
  	polygon-opacity: 0.2;

	  [category="Parcels"] {
		polygon-fill: #ED9FA7;
		polygon-opacity: 0.2;
      }

	  [category="Zones"] {
		polygon-fill: #ED9FA7;
		polygon-opacity: 0.2;
      }

	  [category="SID"] {
		polygon-fill: #ED9FA7;
		polygon-opacity: 0.2;
      }
	  
	  [category="Park"] {
		polygon-fill: #ED9FA7;
		polygon-opacity: 0.2;
      }

	  [category="Main Neighborhood"] {
		polygon-fill: #55A9F2;
		polygon-opacity: 0.2;
      }

	  [category="Neighborhood"] {
		polygon-fill: #557CF2;
		polygon-opacity: 0.2;
      }

	  [category="Ward"] {
		polygon-fill: #55A9F2;
		polygon-opacity: 0.2;
      }
  }

  ::label {
    text-name: '[name]';
    text-face-name: 'DejaVu Sans Bold';
    text-fill: #000;
    text-size: 12;
    text-halo-fill: rgba(255, 255, 255, 0.5);
    text-halo-radius: 1;
    text-placement: interior;
    text-avoid-edges: false;

    [zoom < 14] { text-name: ''; }
    [category="Parcels"] { text-name: ''; }
  }
}
