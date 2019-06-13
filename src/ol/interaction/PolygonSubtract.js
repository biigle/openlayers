import intersect from '@turf/intersect'
import union from '@turf/union'
import difference from '@turf/difference'
import {polygon as turfPolygon} from '@turf/helpers'
import {multiPolygon as turfMultiPolygon} from '@turf/helpers'
import booleanContains from '@turf/boolean-contains'
import booleanOverlap from '@turf/boolean-overlap'
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

class PolygonSubtract extends PolygonBrush {

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

    var sketchPolygon = turfPolygon(geometry.getCoordinates())

    // First dispatch event to allow full set up of feature
    this.dispatchEvent(new DrawEvent(DrawEventType.DRAWEND, sketchFeature));

    // Then insert feature
    if (this.features_) {
      this.features_.push(sketchFeature);
    }
    if (this.source_) {
      this.source_.addFeature(sketchFeature);
    }

    this.intersect_features_ = [];
    for (var i = 0; i < this.source_.getFeatures().length; i++) {
        var compareFeature = this.source_.getFeatures()[i];
        if (compareFeature != sketchFeature) {
            var compareCoords = compareFeature.getGeometry().getCoordinates();
            try {
                var comparePoly = turfPolygon(compareCoords);
            }
            catch (error) {
                console.log("Error:",error)
                console.log("Coords:",compareCoords)
                console.log(compareCoords[0],compareCoords[compareCoords.length-1])
            }
            if (booleanOverlap(sketchPolygon,comparePoly) || booleanContains(sketchPolygon,comparePoly)) {
                this.intersect_features_.push(compareFeature);
            }
        }
    }

    for (var l = 0; l < this.intersect_features_.length; l++) {
        var intersectFeature = this.intersect_features_[l];
        var intersectFeatureAsPolygon = turfPolygon(intersectFeature.getGeometry().getCoordinates())
        if (!booleanContains(intersectFeatureAsPolygon,sketchPolygon)) {
            var intersectMultiPolygon = turfMultiPolygon([intersectFeature.getGeometry().getCoordinates()])
            intersectMultiPolygon = difference(intersectMultiPolygon,turfMultiPolygon([sketchPolygon.geometry.coordinates]));
            if (intersectMultiPolygon == null) {
                this.source_.removeFeature(intersectFeature);
                break;
            }
            else {
                if (intersectMultiPolygon.geometry.type == 'MultiPolygon') {
                    console.log(intersectMultiPolygon)
                    for (var m = 0; m < intersectMultiPolygon.geometry.coordinates.length; m++) {
                        var coords = intersectMultiPolygon.geometry.coordinates[m]
                        coords = this.fixLastCoordinate(coords);
                        this.source_.addFeature(new Feature(new Polygon(coords)))
                    }
                    this.source_.removeFeature(intersectFeature);
                }
                else {
                    var coords = intersectMultiPolygon.geometry.coordinates
                    coords = this.fixLastCoordinate(coords);
                    intersectFeature.getGeometry().setCoordinates(coords);
                }
            }
        }
    }
    this.source_.removeFeature(sketchFeature);
  }
}

export default PolygonSubtract;
