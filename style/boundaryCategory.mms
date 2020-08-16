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
	line-width: 0.5;
	line-color: #444;
	line-dasharray: 10, 8;
    polygon-fill: #55A9F2;
  	polygon-opacity: 0.2;

	  [category="Parcels"] {
		line-width: 0.5;
		line-color: #444;
		line-dasharray: 10, 8;
		polygon-fill: #ED9FA7;
		polygon-opacity: 0.2;
      }

	  [category="Zones"] {
		line-width: 0.5;
		line-color: #444;
		line-dasharray: 10, 8;
		polygon-fill: #ED9FA7;
		polygon-opacity: 0.2;
      }

	  [category="SID"] {
		line-width: 0.5;
		line-color: #444;
		line-dasharray: 10, 8;
		polygon-fill: #ED9FA7;
		polygon-opacity: 0.2;
      }
	  
	  [category="Park"] {
		line-width: 0.5;
		line-color: #444;
		line-dasharray: 10, 8;
		polygon-fill: #ED9FA7;
		polygon-opacity: 0.2;
      }

	  [category="Main Neighborhood"] {
		line-width: 0.5;
		line-color: #444;
		line-dasharray: 10, 8;
		polygon-fill: #55A9F2;
		polygon-opacity: 0.2;
      }

	  [category="Neighborhood"] {
		line-width: 0.5;
		line-color: #444;
		line-dasharray: 10, 8;
		polygon-fill: #55A9F2;
		polygon-opacity: 0.2;
      }

	  [category="Ward"] {
		line-width: 0.5;
		line-color: #444;
		line-dasharray: 10, 8;
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
    text-avoid-edges: true;

    [zoom < 14] { text-name: ''; }
    [category="Parcels"] { text-name: ''; }
  }
}
