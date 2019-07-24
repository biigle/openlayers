import {polygon as turfPolygon} from '@turf/helpers'
import GeometryType from '../geom/GeometryType.js';
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
import {union} from '../geom/flat/union.js';
import {createEditingStyle} from '../style/Style.js';

const MIN_BRUSH_SIZE = 5;
const BRUSH_RESIZE_STEP = 10;

class PolygonBrush extends Draw {

  constructor(options) {
    super(options);
    this.overlay_.setStyle(options.style ? options.style : getDefaultStyleFunction());
    this.sketchPointRadius_ = options.brushRadius ? options.brushRadius : 100;
  }

  setMap(map) {
    super.setMap(map);
    if (map) {
      map.getView().on('change:resolution', this.updateRelativeSketchPointRadius_.bind(this));
    }
  }

  handleEvent(event) {
    const type = event.type;
    let pass = true;
    if (shiftKeyOnly(event) && type === EventType.WHEEL) {
      this.updateAbsoluteSketchPointRadius_(event);
      pass = false;
    }

    if (event.type === MapBrowserEventType.POINTERDRAG && this.handlingDownUpSequence) {
      pass = false;
    }

    return super.handleEvent(event) && pass;
  }

  /**
   * @inheritDoc
   */
  handleDownEvent(event) {
    if (!this.handlingDownUpSequence) {
      this.startDrawing_(event);

      return true;
    }

    return false;
  }

  /**
   * @inheritDoc
   */
  handleUpEvent(event) {
    if (this.handlingDownUpSequence) {
      this.finishDrawing();

      return true;
    }

    return false;
  }

  /**
   * @param {import("../MapBrowserEvent.js").default} event Event.
   * @private
   */
  createOrUpdateSketchPoint_(event) {
    const coordinates = event.coordinate.slice();
    if (!this.sketchPoint_) {
      let relativeRadius = event.map.getView().getResolution() * this.sketchPointRadius_;
      this.sketchPoint_ = new Feature(new Circle(coordinates, relativeRadius));
      this.updateSketchFeatures_();
    } else {
      const sketchPointGeom = this.sketchPoint_.getGeometry();
      sketchPointGeom.setCenter(coordinates);
    }
  }

  updateRelativeSketchPointRadius_(event) {
    if (this.sketchPoint_) {
      this.sketchPoint_.getGeometry().setRadius(
        this.sketchPointRadius_ * event.target.getResolution()
      );
    }
  }

  updateAbsoluteSketchPointRadius_(event) {
    if (this.sketchPoint_) {
      if (event.originalEvent.deltaY > 0) {
        this.sketchPointRadius_ += BRUSH_RESIZE_STEP;
      }
      if (event.originalEvent.deltaY < 0) {
        this.sketchPointRadius_ = Math.max(
          this.sketchPointRadius_ - BRUSH_RESIZE_STEP,
          MIN_BRUSH_SIZE
        );
      }
      this.sketchPoint_.getGeometry().setRadius(
        this.sketchPointRadius_ * event.map.getView().getResolution()
      );
    }
  }

  startDrawing_(event) {
    const start = event.coordinate;
    this.finishCoordinate_ = start;
    this.sketchFeature_ = new Feature(fromCircle(this.sketchPoint_.getGeometry()));
    this.updateSketchFeatures_();
    this.dispatchEvent(new DrawEvent(DrawEventType.DRAWSTART, this.sketchFeature_));
  }

  /**
   * Stop drawing and add the sketch feature to the target layer.
   * The {@link module:ol/interaction/Draw~DrawEventType.DRAWEND} event is
   * dispatched before inserting the feature.
   * @api
   */
  handlePointerMove_(event) {
    this.createOrUpdateSketchPoint_(event);

    if (this.sketchFeature_) {
      const sketchPointGeometry = fromCircle(this.sketchPoint_.getGeometry());
      const sketchPointPolygon = turfPolygon(sketchPointGeometry.getCoordinates());
      const sketchFeatureGeometry = this.sketchFeature_.getGeometry();
      const sketchFeaturePolygon = turfPolygon(sketchFeatureGeometry.getCoordinates());
      if (booleanOverlap(sketchPointPolygon, sketchFeaturePolygon)) {
          var coords = union(sketchPointPolygon, sketchFeaturePolygon);
          sketchFeatureGeometry.setCoordinates(coords);
      }
    }
  }

  finishDrawing() {
    const sketchFeature = this.abortDrawing_();
    if (!sketchFeature) {
      return;
    }

    this.dispatchEvent(new DrawEvent(DrawEventType.DRAWEND, sketchFeature));
    if (this.features_) {
      this.features_.push(sketchFeature);
    }
    if (this.source_) {
      this.source_.addFeature(sketchFeature);
    }
  }
}

function getDefaultStyleFunction() {
  let styles = createEditingStyle();
  styles[GeometryType.POLYGON] =
      styles[GeometryType.POLYGON].concat(
        styles[GeometryType.LINE_STRING]
      );

  return function(feature, resolution) {
    return styles[feature.getGeometry().getType()];
  };
}

export default PolygonBrush;
