import Map from '../src/ol/Map.js';
import View from '../src/ol/View.js';
import PolygonBrush from '../src/ol/interaction/PolygonBrush.js'
import ModifyPolygonBrush from '../src/ol/interaction/ModifyPolygonBrush.js';
import {Tile as TileLayer, Vector as VectorLayer} from '../src/ol/layer.js';
import {OSM, Vector as VectorSource} from '../src/ol/source.js';
import {always, never} from '../src/ol/events/condition.js';

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

let draw, modify; // global so we can remove them later
const typeSelect = document.getElementById('type');

function addInteractions() {
  const value = typeSelect.value;
  if (value === 'Draw') {
    draw = new PolygonBrush({
      source: source,
      map: map,
    });
    map.addInteraction(draw);
  }
  if (value === 'Add') {
    modify = new ModifyPolygonBrush({
      addCondition: always,
      subtractCondition: never,
      source: source,
      map: map,
    });
    map.addInteraction(modify);
  }
  if (value === 'Subtract') {
    modify = new ModifyPolygonBrush({
      addCondition: never,
      subtractCondition: always,
      source: source,
      map: map,
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
