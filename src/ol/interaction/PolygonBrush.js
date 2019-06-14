import intersect from '@turf/intersect'
import union from '@turf/union'
import difference from '@turf/difference'
import {polygon as turfPolygon} from '@turf/helpers'
import {multiPolygon as turfMultiPolygon} from '@turf/helpers'
import booleanContains from '@turf/boolean-contains'
import Draw from './Draw.js';
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

class PolygonBrush extends Draw {

  constructor(options) {

    super(options)
    this.circleRadius_ = 10000  //TODO better value
    this.drawmode_ = false;
    this.newFeature = null;
    this.tmp_features_array_ = [];
    this.intersect_features_ = [];
  }

  handleEvent(event) {
    let pass = super.handleEvent(event);
    const type = event.type;
    const btn = event.originalEvent.button;
    if (shiftKeyOnly(event) && (type === EventType.WHEEL || type === EventType.MOUSEWHEEL)) {
      pass = false; 
      this.updateSketchPointRadius_(event);
    }
    if (btn == 0 && (type === MapBrowserEventType.POINTERDOWN)) {
      pass = false;
      this.drawmode_ = true;
      this.createOrUpdateSketchPoint_(event);
    }
    if (this.drawmode_ && type === MapBrowserEventType.POINTERMOVE) {
      pass = false;
      this.startDrawing_(event);
      this.finishDrawing();
      this.createOrUpdateSketchPoint_(event);
    }
    if (btn == 0 && this.drawmode_ && type === MapBrowserEventType.POINTERUP) {
      this.startDrawing_(event);
      this.finishDrawing();
      this.drawmode_ = false;
      this.createOrUpdateSketchPoint_(event);
      this.dispatchEvent(new DrawEvent(DrawEventType.DRAWEND, this.newFeature));
    }
    return pass
  }

  handleUpEvent(event) {
    //this is overridden because nothing should happen here
  }

  /**
   * @param {import("../MapBrowserEvent.js").default} event Event.
   * @private
   */
  createOrUpdateSketchPoint_(event) {
    const coordinates = event.coordinate.slice();
    if (!this.sketchPoint_) {
      this.sketchPoint_ = new Feature(new Circle(coordinates,this.circleRadius_));
      this.updateSketchFeatures_();
    } else {
      const sketchPointGeom = /** @type {Circle} */ (this.sketchPoint_.getGeometry());
      sketchPointGeom.setCenter(coordinates);
    }
  }

  updateSketchPointRadius_(event) {
    if (this.sketchPoint_) {
      const sketchPointGeom = /** @type {Circle} */ (this.sketchPoint_.getGeometry());
      if (event.originalEvent.deltaY > 0) {
        this.circleRadius_ = sketchPointGeom.getRadius() + 1000;  //TODO better value
      }
      if (event.originalEvent.deltaY < 0) {
        this.circleRadius_ = sketchPointGeom.getRadius() - 1000;  //TODO better value
      }
      sketchPointGeom.setRadius(this.circleRadius_);
    }
  }

  startDrawing_(event) {
    const start = event.coordinate;
    this.finishCoordinate_ = start;
    this.sketchCoords_ = start.slice();

    const geometry = new Circle(this.sketchCoords_,this.circleRadius_);
    this.sketchFeature_ = new Feature(geometry);
  }

  /**
   * Stop drawing and add the sketch feature to the target layer.
   * The {@link module:ol/interaction/Draw~DrawEventType.DRAWEND} event is
   * dispatched before inserting the feature.
   * @api
   */
  finishDrawing() {
    //this is overridden by subclasses
  }

    mergeNewPolygon() {
        for (var i = 0; i < this.tmp_features_array_.length; i++) {
            const currentFeature = this.tmp_features_array_[i];
            const geometry = currentFeature.getGeometry();
            var current_poly = turfPolygon(geometry.getCoordinates())
            this.intersect_features_ = [];

            for (var j = 0; j < this.source_.getFeatures().length; j++) {
                var compareFeature = this.source_.getFeatures()[j];
                if (compareFeature != currentFeature) {
                    var compareCoords = compareFeature.getGeometry().getCoordinates();
                    var comparePoly = turfPolygon(compareCoords);
                    var polygon_intersection = intersect(current_poly,comparePoly);
                    if (polygon_intersection !== null) {
                        this.intersect_features_.push(compareFeature);
                    }
                }
            }
            this.intersect_features_.forEach(function(entry) {
                current_poly = union(current_poly, turfPolygon(entry.getGeometry().getCoordinates()));
            })
            if (current_poly.geometry.type == 'MultiPolygon') {
                current_poly = turfPolygon(current_poly.geometry.coordinates[0])
            }
            currentFeature.getGeometry().setCoordinates(current_poly.geometry["coordinates"]);

            for (var k = 0; k < this.intersect_features_.length; k++) {
                this.source_.removeFeature(this.intersect_features_[k]);
            }
        }
        this.tmp_features_array_ = [];
    }

    subtractNewPolygon() {
        for (var i = 0; i < this.tmp_features_array_.length; i++) {
            const currentFeature = this.tmp_features_array_[i];
            const geometry = currentFeature.getGeometry();
            var current_poly = turfPolygon(geometry.getCoordinates())
            this.intersect_features_ = [];

            for (var j = 0; j < this.source_.getFeatures().length; j++) {
                var compareFeature = this.source_.getFeatures()[j];
                if (compareFeature != currentFeature) {
                    var compareCoords = compareFeature.getGeometry().getCoordinates();
                    var comparePoly = turfPolygon(compareCoords);
                    var polygon_intersection = intersect(current_poly,comparePoly);
                    if (polygon_intersection !== null) {
                        this.intersect_features_.push(compareFeature);
                    }
                }
            }
            this.intersect_features_.forEach(function(entry) {
                current_poly = difference(turfPolygon(entry.getGeometry().getCoordinates()),current_poly);
            })
            if (current_poly.geometry.type == 'MultiPolygon') {
                current_poly = turfPolygon(current_poly.geometry.coordinates[0])
            }
            currentFeature.getGeometry().setCoordinates(current_poly.geometry["coordinates"]);

            for (var k = 0; k < this.intersect_features_.length; k++) {
                this.source_.removeFeature(this.intersect_features_[k]);
            }
        }
        this.tmp_features_array_ = [];
    }

    fixLastCoordinate(coords) {
        if (coords[0][0] != coords[0][coords.length-1]) {
            coords[0].push(coords[0]);
            console.log("Safety coords pushed");
        }
        return coords;
    }
}

export default PolygonBrush;
