import Map from '../src/ol/Map.js';
import View from '../src/ol/View.js';
import PolygonBrush from '../src/ol/interaction/PolygonBrush.js';
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

let polygonBrush = new PolygonBrush({
  source: source,
  type: 'Point'
});
map.addInteraction(polygonBrush);

//let draw; // global so we can remove it later
//function addInteraction() {
//  const value = typeSelect.value;
//  if (value !== 'None') {
//    draw = new Draw({
//      source: source,
//      type: typeSelect.value
//    });
//    map.addInteraction(draw);
//  }
//}
