import {polygon as turfPolygon} from '@turf/helpers'
import booleanOverlap from '@turf/boolean-overlap'
import Draw from './Draw.js';
import {DrawEvent} from './Draw.js';
import {DrawEventType} from './Draw.js';
import Circle from '../geom/Circle.js';
import Feature from '../Feature.js';
import Polygon from '../geom/Polygon.js'
import MapBrowserEventType from '../MapBrowserEventType.js';
import EventType from '../events/EventType.js';
import {shiftKeyOnly} from '../events/condition.js';
import {fromCircle} from '../geom/Polygon.js';
import {unionCoords} from './polygonInteractionHelpers.js';

class PolygonAdd extends Draw {

  constructor(options) {

    super(options)
    this.circleRadius_ = 10000  //TODO better value
    this.drawmode_ = false;
    this.newFeature = null;
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
      this.startDrawing_(event);
      this.continueDrawing();
      this.createOrUpdateSketchPoint_(event);
    }
    if (this.drawmode_ && type === MapBrowserEventType.POINTERMOVE) {
      pass = false;
      this.startDrawing_(event);
      this.continueDrawing();
      this.createOrUpdateSketchPoint_(event);
    }
    if (btn == 0 && this.drawmode_ && type === MapBrowserEventType.POINTERUP) {
      this.finishDrawing();
//      this.createOrUpdateSketchPoint_(event);
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
  continueDrawing() {
    const sketchFeature = this.abortDrawing_();
    if (!sketchFeature) {
      return;
    }
    const geometry = fromCircle(sketchFeature.getGeometry());
    sketchFeature.setGeometry(geometry);

    var currentPolygon = turfPolygon(geometry.getCoordinates())

    // Then insert feature
    if (this.newFeature == null) {
        if (this.features_) {
          this.features_.push(sketchFeature);
        }
        if (this.source_) {
          this.source_.addFeature(sketchFeature);
        }
        this.newFeature = sketchFeature;
    }

    if (this.newFeature != sketchFeature) {
        var compareCoords = this.newFeature.getGeometry().getCoordinates();
        var comparePoly = turfPolygon(compareCoords);
        if (booleanOverlap(currentPolygon,comparePoly)) {
            var coords = unionCoords(currentPolygon,comparePoly);
            this.newFeature.getGeometry().setCoordinates(coords);
        }
    }
  }

  finishDrawing() {
      this.drawmode_ = false;
      this.dispatchEvent(new DrawEvent(DrawEventType.DRAWEND, this.newFeature));
      this.newFeature = null;
  }

  fixLastCoordinate(coords) {
    if (coords[0][0] != coords[0][coords.length-1]) {
        coords[0].push(coords[0]);
        console.log("Safety coords pushed");
    }
    return coords;
  }
}

export default PolygonAdd;
