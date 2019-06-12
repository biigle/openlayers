import intersect from '@turf/intersect'
import union from '@turf/union'
import difference from '@turf/difference'
import {polygon as turfPolygon} from '@turf/helpers'
import {multiPolygon as turfMultiPolygon} from '@turf/helpers'
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
    this.erasemode_ = false;
    this.tmp_features_array_ = [];
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
    }
    if (btn == 2 && (type === MapBrowserEventType.POINTERDOWN)) {
      pass = false;
      this.erasemode_ = true;
    }
    if (this.drawmode_ && type === MapBrowserEventType.POINTERMOVE) {
      pass = false;
      this.startDrawing_(event);
      this.finishDrawing();
    }
    if (this.erasemode_ && type === MapBrowserEventType.POINTERMOVE) {
      pass = false;
      this.startDrawing_(event);
      this.finishErasing();
    }
    if ((this.drawmode_ || this.erasemode_) && type === MapBrowserEventType.POINTERUP) {
      this.drawmode_ = false;
      this.erasemode_ = false;
//      this.mergeNewPolygon();
    }
//    if (altShiftKeysOnly(event) && this.drawmode_ == true && type === MapBrowserEventType.POINTERUP) {
//      this.drawmode_ = false;
//      this.subtractNewPolygon()
//    }
    return pass
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
//    if (this.drawmode_) {
//      this.sketchFeature_.setStyle()
//    }
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
//      if (this.drawmode_) {
//        this.tmp_features_array_.push(sketchFeature);
//        var stl = new Style();
//        var strk = new Stroke()
//        strk.setColor()
//        stl.setStroke()
//        this.sketchFeature_.set
//      }
    }

    var features_to_remove = [];
    for (var i = 0; i < this.source_.getFeatures().length; i++) {
        var compareFeature = this.source_.getFeatures()[i];
        if (compareFeature != sketchFeature) {
            var compareCoords = compareFeature.getGeometry().getCoordinates();
            var comparePoly = turfPolygon(compareCoords);
            var polygon_intersection = intersect(current_poly,comparePoly);
//            if (this.drawmode_) {
//                if (polygon_intersection !== null) {
//                    if (this.tmp_features_array_.includes(compareFeature)) {
//                        features_to_remove.push(compareFeature);
//                    }
//                }
//            }
//            else {
            if (polygon_intersection !== null) {
                features_to_remove.push(compareFeature);
            }
//            }
        }
    }

    features_to_remove.forEach(function(entry) {
        current_poly = union(current_poly, turfPolygon(entry.getGeometry().getCoordinates()));
    })
    if (current_poly.geometry.type == 'MultiPolygon') {
        current_poly = turfPolygon(current_poly.geometry.coordinates[0])
    }
    sketchFeature.getGeometry().setCoordinates(current_poly.geometry["coordinates"]);

    for (var j = 0; j < features_to_remove.length; j++) {
        this.source_.removeFeature(features_to_remove[j]);
//        if (this.drawmode_) {
//            const idx = this.tmp_features_array_.indexOf(features_to_remove[j]);
//            this.tmp_features_array_.splice(idx,1);
//        }
    }
  }

    mergeNewPolygon() {
        for (var i = 0; i < this.tmp_features_array_.length; i++) {
            const currentFeature = this.tmp_features_array_[i];
            const geometry = currentFeature.getGeometry();
            var current_poly = turfPolygon(geometry.getCoordinates())
            var features_to_remove = [];

            for (var j = 0; j < this.source_.getFeatures().length; j++) {
                var compareFeature = this.source_.getFeatures()[j];
                if (compareFeature != currentFeature) {
                    var compareCoords = compareFeature.getGeometry().getCoordinates();
                    var comparePoly = turfPolygon(compareCoords);
                    var polygon_intersection = intersect(current_poly,comparePoly);
                    if (polygon_intersection !== null) {
                        features_to_remove.push(compareFeature);
                    }
                }
            }
            features_to_remove.forEach(function(entry) {
                current_poly = union(current_poly, turfPolygon(entry.getGeometry().getCoordinates()));
            })
            if (current_poly.geometry.type == 'MultiPolygon') {
                current_poly = turfPolygon(current_poly.geometry.coordinates[0])
            }
            currentFeature.getGeometry().setCoordinates(current_poly.geometry["coordinates"]);

            for (var k = 0; k < features_to_remove.length; k++) {
                this.source_.removeFeature(features_to_remove[k]);
            }
        }
        this.tmp_features_array_ = [];
    }

  finishErasing() {
    const sketchFeature = this.abortDrawing_();
    if (!sketchFeature) {
      return;
    }
    const geometry = fromCircle(sketchFeature.getGeometry());
    sketchFeature.setGeometry(geometry);

    var current_poly = turfMultiPolygon([geometry.getCoordinates()])

    // First dispatch event to allow full set up of feature
    this.dispatchEvent(new DrawEvent(DrawEventType.DRAWEND, sketchFeature));

    // Then insert feature
    if (this.features_) {
      this.features_.push(sketchFeature);
    }
    if (this.source_) {
      this.source_.addFeature(sketchFeature);
//      if (this.drawmode_) {
//        this.tmp_features_array_.push(sketchFeature);
//        var stl = new Style();
//        var strk = new Stroke()
//        strk.setColor()
//        stl.setStroke()
//        this.sketchFeature_.set
//      }
    }

    var features_to_remove = [];
    for (var i = 0; i < this.source_.getFeatures().length; i++) {
        var compareFeature = this.source_.getFeatures()[i];
        if (compareFeature != sketchFeature) {
            var compareCoords = compareFeature.getGeometry().getCoordinates();
            var comparePoly = turfMultiPolygon([compareCoords]);
            var polygon_intersection = intersect(current_poly,comparePoly);
            if (polygon_intersection !== null) {
                features_to_remove.push(compareFeature);
            }
        }
    }

    for (var l = 0; l < features_to_remove.length; l++) {
        var entry = features_to_remove[l];
        current_poly = difference(turfMultiPolygon([entry.getGeometry().getCoordinates()]),current_poly);
        if (current_poly == null) {
            this.source_.removeFeature(entry);
        }
        else {
            if (current_poly.geometry.type == 'MultiPolygon') {
                for (var m = 0; m < current_poly.geometry.coordinates.length; m++) {
                    this.source_.addFeature(new Feature(new Polygon(current_poly.geometry.coordinates[m])))
                }
                this.source_.removeFeature(entry);
            }
            else {
                entry.getGeometry().setCoordinates(current_poly.geometry["coordinates"]);
            }
        }
    }
    this.source_.removeFeature(sketchFeature);
  }

    mergeNewPolygon() {
        for (var i = 0; i < this.tmp_features_array_.length; i++) {
            const currentFeature = this.tmp_features_array_[i];
            const geometry = currentFeature.getGeometry();
            var current_poly = turfPolygon(geometry.getCoordinates())
            var features_to_remove = [];

            for (var j = 0; j < this.source_.getFeatures().length; j++) {
                var compareFeature = this.source_.getFeatures()[j];
                if (compareFeature != currentFeature) {
                    var compareCoords = compareFeature.getGeometry().getCoordinates();
                    var comparePoly = turfPolygon(compareCoords);
                    var polygon_intersection = intersect(current_poly,comparePoly);
                    if (polygon_intersection !== null) {
                        features_to_remove.push(compareFeature);
                    }
                }
            }
            features_to_remove.forEach(function(entry) {
                current_poly = union(current_poly, turfPolygon(entry.getGeometry().getCoordinates()));
            })
            if (current_poly.geometry.type == 'MultiPolygon') {
                current_poly = turfPolygon(current_poly.geometry.coordinates[0])
            }
            currentFeature.getGeometry().setCoordinates(current_poly.geometry["coordinates"]);

            for (var k = 0; k < features_to_remove.length; k++) {
                this.source_.removeFeature(features_to_remove[k]);
            }
        }
        this.tmp_features_array_ = [];
    }

    subtractNewPolygon() {
        for (var i = 0; i < this.tmp_features_array_.length; i++) {
            const currentFeature = this.tmp_features_array_[i];
            const geometry = currentFeature.getGeometry();
            var current_poly = turfPolygon(geometry.getCoordinates())
            var features_to_remove = [];

            for (var j = 0; j < this.source_.getFeatures().length; j++) {
                var compareFeature = this.source_.getFeatures()[j];
                if (compareFeature != currentFeature) {
                    var compareCoords = compareFeature.getGeometry().getCoordinates();
                    var comparePoly = turfPolygon(compareCoords);
                    var polygon_intersection = intersect(current_poly,comparePoly);
                    if (polygon_intersection !== null) {
                        features_to_remove.push(compareFeature);
                    }
                }
            }
            features_to_remove.forEach(function(entry) {
                current_poly = difference(turfPolygon(entry.getGeometry().getCoordinates()),current_poly);
            })
            if (current_poly.geometry.type == 'MultiPolygon') {
                current_poly = turfPolygon(current_poly.geometry.coordinates[0])
            }
            currentFeature.getGeometry().setCoordinates(current_poly.geometry["coordinates"]);

            for (var k = 0; k < features_to_remove.length; k++) {
                this.source_.removeFeature(features_to_remove[k]);
            }
        }
        this.tmp_features_array_ = [];
    }
}

export default PolygonBrush;
