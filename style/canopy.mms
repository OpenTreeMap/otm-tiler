#treemap_canopy_boundary {
  ::shape {
    line-width: 0.25;
    line-color: #000;
    [percent >= 10] { polygon-fill: #F6F9F4 }
    [percent >= 20] { polygon-fill: #D7EBC7 }
    [percent >= 30] { polygon-fill: #B8DD9B }
    [percent >= 40] { polygon-fill: #99CF6F }
    [percent >= 50] { polygon-fill: #7AC143 }
    [percent >= 60] { polygon-fill: #5BA63B }
    [percent >= 70] { polygon-fill: #3D8C33 }
    [percent >= 80] { polygon-fill: #1E722B }
    [percent >= 90] { polygon-fill: #005824 }
  }
  ::label {
    text-name: '[label]';
    text-face-name: 'DejaVu Sans Bold';
    text-fill: #000;
    text-size: 12;
    text-halo-fill: rgba(255, 255, 255, 0.5);
    text-halo-radius: 1;
    text-placement: interior;
    text-avoid-edges: true;

    [zoom < 10] { text-name: ''; }
  }
}
