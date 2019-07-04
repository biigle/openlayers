import Map from '../src/ol/Map.js';
import View from '../src/ol/View.js';
import PolygonBrush from '../src/ol/interaction/PolygonBrush.js'
import {Draw, Snap} from '../src/ol/interaction.js';
import {Tile as TileLayer, Vector as VectorLayer} from '../src/ol/layer.js';
import {OSM, Vector as VectorSource} from '../src/ol/source.js';
import {Circle as CircleStyle, Fill, Stroke, Style} from '../src/ol/style.js';
import ModifyPolygonBrush from '../src/ol/interaction/ModifyPolygonBrush.js'

const raster = new TileLayer({
  source: new OSM()
});

const source = new VectorSource();
const vector = new VectorLayer({
  source: source,
});

const map = new Map({
  layers: [raster, vector],
  target: 'map',
  view: new View({
    center: [-11000000, 4600000],
    zoom: 4
  })
});

let modify;

let draw, snap; // global so we can remove them later
const typeSelect = document.getElementById('type');

function addInteractions() {
  const value = typeSelect.value;
  if (value === 'Draw') {
    draw = new PolygonBrush({
      source: source,
      type: 'Point'
    });
    map.addInteraction(draw);
  }
  if (value === 'Add') {
    modify = new ModifyPolygonBrush({
      mode: 'add',
      source: source,
    });
    map.addInteraction(modify);
  }
  if (value === 'Subtract') {
    modify = new ModifyPolygonBrush({
      mode: 'subtract',
      source: source,
    });
    map.addInteraction(modify);
  }
}

/**
 * Handle change event.
 */
typeSelect.onchange = function() {
  map.removeInteraction(draw);
  map.removeInteraction(modify);
  addInteractions();
};

addInteractions();
