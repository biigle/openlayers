import intersect from '@turf/intersect'
import union from '@turf/union'
import difference from '@turf/difference'
import {polygon as turfPolygon} from '@turf/helpers'
import {multiPolygon as turfMultiPolygon} from '@turf/helpers'
import booleanContains from '@turf/boolean-contains'
import Draw from './Draw.js';
import PolygonBrush from './PolygonBrush.js'
import {DrawEvent} from './Draw.js';
import {DrawEventType} from './Draw.js';
import createRegularPolygon from './Draw.js';
import Circle from '../geom/Circle.js';
import Feature from '../Feature.js';
import MapBrowserEventType from '../MapBrowserEventType.js';
import EventType from '../events/EventType.js';
import {shiftKeyOnly,altShiftKeysOnly,altKeyOnly} from '../events/condition.js';
import {TRUE, FALSE} from '../functions.js';
import Polygon from '../geom/Polygon.js'
import {fromCircle} from '../geom/Polygon.js'
import Style from '../style/Style.js'
import Stroke from '../style/Stroke.js'

class PolygonAdd extends PolygonBrush {

  constructor(options) {

    super(options)
  }

  /**
   * Stop drawing and add the sketch feature to the target layer.
   * The {@link module:ol/interaction/Draw~DrawEventType.DRAWEND} event is
   * dispatched before inserting the feature.
   * @api
   */
  finishDrawing() {
    const sketchFeature = this.abortDrawing_();
    if (!sketchFeature) {
      return;
    }
    const geometry = fromCircle(sketchFeature.getGeometry());
    sketchFeature.setGeometry(geometry);

    var current_poly = turfPolygon(geometry.getCoordinates())

    // First dispatch event to allow full set up of feature
    this.dispatchEvent(new DrawEvent(DrawEventType.DRAWEND, sketchFeature));

    // Then insert feature
    if (this.features_) {
      this.features_.push(sketchFeature);
    }
    if (this.source_) {
      this.source_.addFeature(sketchFeature);
    }

    this.features_to_remove_ = [];
    for (var i = 0; i < this.source_.getFeatures().length; i++) {
        var compareFeature = this.source_.getFeatures()[i];
        if (compareFeature != sketchFeature) {
            var compareCoords = compareFeature.getGeometry().getCoordinates();
            var comparePoly = turfPolygon(compareCoords);
            var polygon_intersection = intersect(current_poly,comparePoly);
            if (polygon_intersection !== null) {
                this.features_to_remove_.push(compareFeature);
            }
//            }
        }
//        console.log("All features:",this.source_.getFeatures())
//        console.log("Ft to remove",this.features_to_remove_)
//        console.log("tmp ft",this.tmp_features_array_)
    }

    this.features_to_remove_.forEach(function(entry) {
        current_poly = union(current_poly, turfPolygon(entry.getGeometry().getCoordinates()));
    })
    if (current_poly.geometry.type == 'MultiPolygon') {
        current_poly = turfPolygon(current_poly.geometry.coordinates[0])
    }
    var coords = current_poly.geometry.coordinates
    coords = this.fixLastCoordinate(coords);
    sketchFeature.getGeometry().setCoordinates(coords);

    for (var j = 0; j < this.features_to_remove_.length; j++) {
        this.source_.removeFeature(this.features_to_remove_[j]);
    }
  }
}

export default PolygonAdd;
