import Map from '../src/ol/Map.js';
import View from '../src/ol/View.js';
import PolygonAdd from '../src/ol/interaction/PolygonAdd.js';
import PolygonSubtract from '../src/ol/interaction/PolygonSubtract.js';
import {Tile as TileLayer, Vector as VectorLayer} from '../src/ol/layer.js';
import {OSM, Vector as VectorSource} from '../src/ol/source.js';

const raster = new TileLayer({
  source: new OSM()
});

const source = new VectorSource({wrapX: false});

const vector = new VectorLayer({
  source: source
});

const map = new Map({
  layers: [raster, vector],
  target: 'map',
  view: new View({
    center: [-11000000, 4600000],
    zoom: 4
  })
});

const typeSelect = document.getElementById('type');

let polygonBrush; // global so we can remove it later
function addInteraction() {
  const value = typeSelect.value;
  if (value === 'Add') {
    polygonBrush = new PolygonAdd({
      source: source,
      type: 'Point'
    });
    map.addInteraction(polygonBrush);
  }
  else {
    polygonBrush = new PolygonSubtract({
      source: source,
      type: 'Point'
    });
    map.addInteraction(polygonBrush);
  }
}


/**
 * Handle change event.
 */
typeSelect.onchange = function() {
  map.removeInteraction(polygonBrush);
  addInteraction();
};

addInteraction();
