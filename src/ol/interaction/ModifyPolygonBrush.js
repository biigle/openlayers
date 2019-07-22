import {polygon as turfPolygon} from '@turf/helpers'
import booleanContains from '@turf/boolean-contains'
import booleanOverlap from '@turf/boolean-overlap'
import Feature from '../Feature.js';
import MapBrowserEventType from '../MapBrowserEventType.js';
import Event from '../events/Event.js';
import EventType from '../events/EventType.js';
import GeometryType from '../geom/GeometryType.js';
import Point from '../geom/Point.js';
import Circle from '../geom/Circle.js';
import VectorLayer from '../layer/Vector.js';
import VectorSource from '../source/Vector.js';
import VectorEventType from '../source/VectorEventType.js';
import {createEditingStyle} from '../style/Style.js';
import Modify from './Modify.js'
import {ModifyEvent} from './Modify.js'
import {ModifyEventType} from './Modify.js'
import {shiftKeyOnly} from '../events/condition.js';
import {fromCircle} from '../geom/Polygon.js'
import {DrawEvent} from './Draw.js';
import {DrawEventType} from './Draw.js';
import {union} from '../geom/flat/union.js';
import {difference} from '../geom/flat/difference.js';

const ZoomDirection = {
  UP: 'up',
  DOWN: 'down'
};

/**
 * The segment index assigned to a circle's center when
 * breaking up a circle into ModifySegmentDataType segments.
 * @type {number}
 */
const CIRCLE_CENTER_INDEX = 0;

/**
 * The segment index assigned to a circle's circumference when
 * breaking up a circle into ModifySegmentDataType segments.
 * @type {number}
 */
const CIRCLE_CIRCUMFERENCE_INDEX = 1;

class ModifyPolygonBrush extends Modify {
  /**
   * @param {Options} options Options.
   */
  constructor(options) {

    super(/** @type {import("./Pointer.js").Options} */ (options));

    this.sketchFeature_ = null;

    this.modifyFeature_ = null;

    this.sketchPoint_ = null;

    this.mode_ = options.mode ? options.mode : 'add';

    this.setMap(options.map);

    this.resolution_ = this.getMap().getView().getResolution();

    this.circleRadius_ = this.resolution_ * 100;

    this.zoomDirection_ = null;

    /**
     * Draw overlay where sketch features are drawn.
     * @type {VectorLayer}
     * @private
     */
    this.overlay_ = new VectorLayer({
      source: new VectorSource({
        useSpatialIndex: false,
        wrapX: options.wrapX ? options.wrapX : false
      }),
      style: options.style ? options.style :
        getDefaultStyleFunction(),
      updateWhileInteracting: true
    });

    /**
     * @type {VectorSource}
     * @private
     */
    this.source_ = null;

    /**
     * @type {import("../MapBrowserPointerEvent.js").default}
     * @private
     */
    this.lastPointerEvent_ = null;

    this.drawmode_ = false;

  }

  /**
   * Redraw the sketch features.
   * @private
   */
  updateSketchFeatures_() {
    const sketchFeatures = [];
    if (this.sketchFeature_) {
      sketchFeatures.push(this.sketchFeature_);
    }
    if (this.sketchLine_) {
      sketchFeatures.push(this.sketchLine_);
    }
    if (this.sketchPoint_) {
      sketchFeatures.push(this.sketchPoint_);
    }
    const overlaySource = /** @type {VectorSource} */ (this.overlay_.getSource());
    overlaySource.clear(true);
    overlaySource.addFeatures(sketchFeatures);
  }

  /**
   * @param {import("../MapBrowserEvent.js").default} event Event.
   * @private
   */
  createOrUpdateSketchPoint_(event) {
    const coordinates = event.coordinate.slice();
    if (!this.sketchPoint_) {
      this.sketchPoint_ = new Feature(new Circle(coordinates, this.circleRadius_));
      this.updateSketchFeatures_();
    } else {
      const sketchPointGeom = /** @type {Circle} */ (this.sketchPoint_.getGeometry());
      sketchPointGeom.setCenter(coordinates);
    }
  }

  fitSketchPointRadius_(event) {
    let radiusFactor = this.getMap().getView().getResolution() / this.resolution_;
    let zoomDirection = null;
    if (event.originalEvent.deltaY > 0) {
      zoomDirection = ZoomDirection.UP;
      if (this.zoomDirection_ === null) {
        radiusFactor = radiusFactor * 2;
      }
      else if (this.zoomDirection_ !== zoomDirection) {
        radiusFactor = radiusFactor * 4;
      }
    }
    if (event.originalEvent.deltaY < 0) {
      zoomDirection = ZoomDirection.DOWN;
      if (this.zoomDirection_ === null) {
        radiusFactor = radiusFactor * 0.5;
      }
      else if (this.zoomDirection_ !== zoomDirection) {
        radiusFactor = radiusFactor * 0.25;
      }
    }
    if (this.sketchPoint_) {
      const sketchPointGeom = this.sketchPoint_.getGeometry();
      this.circleRadius_ = this.circleRadius_ * radiusFactor;
      this.resolution_ = this.getMap().getView().getResolution();
      sketchPointGeom.setRadius(this.circleRadius_);
      this.zoom_ = this.getMap().getView().getZoom();
    }
    this.zoomDirection_ = zoomDirection;
  }

  updateSketchPointRadius_(event) {
    if (this.sketchPoint_) {
      const sketchPointGeom = this.sketchPoint_.getGeometry();
      if (event.originalEvent.deltaY > 0) {
        this.circleRadius_ = sketchPointGeom.getRadius() + sketchPointGeom.getRadius() / 10;
      }
      if (event.originalEvent.deltaY < 0) {
        this.circleRadius_ = sketchPointGeom.getRadius() - sketchPointGeom.getRadius() / 10;
      }
      sketchPointGeom.setRadius(this.circleRadius_);
    }
  }

  handleEvent(event) {
    let pass = true;
    const type = event.type;
    const btn = event.originalEvent.button;
    if (shiftKeyOnly(event) && (type === EventType.WHEEL || type === EventType.MOUSEWHEEL)) {
      pass = false;
      this.updateSketchPointRadius_(event);
    }
    if (btn === 0 && (type === MapBrowserEventType.POINTERDOWN)) {
      pass = false;
      this.drawmode_ = true;
      this.startModifying_(event);
      this.continueModifying_();
      this.createOrUpdateSketchPoint_(event);
    }
    if (this.drawmode_ && type === MapBrowserEventType.POINTERMOVE) {
      pass = false;
      this.startModifying_(event);
      this.continueModifying_();
      this.createOrUpdateSketchPoint_(event);
    }
    if (btn === 0 && this.drawmode_ && type === MapBrowserEventType.POINTERUP) {
      this.finishModifying_(event);
    }
    this.createOrUpdateSketchPoint_(event);
    if (!shiftKeyOnly(event) && event.type === EventType.WHEEL) {
      this.fitSketchPointRadius_(event);
      pass = true;
    }

    return pass
  }

  startModifying_(event) {
    const start = event.coordinate;
    this.finishCoordinate_ = start;
    this.sketchCoords_ = start.slice();

    const geometry = new Circle(this.sketchCoords_, this.circleRadius_);
    this.sketchFeature_ = new Feature(geometry);
    this.updateSketchFeatures_();
  }

  /**
   * Stop drawing and add the sketch feature to the target layer.
   * The {@link module:ol/interaction/Draw~DrawEventType.DRAWEND} event is
   * dispatched before inserting the feature.
   * @api
   */
  continueModifying_() {
    const sketchFeature = this.abortDrawing_();
    if (!sketchFeature) {

      return;
    }
    const geometry = fromCircle(sketchFeature.getGeometry());
    sketchFeature.setGeometry(geometry);

    var sketchFeaturePolygon = turfPolygon(geometry.getCoordinates());

    if (this.source_) {
      this.source_.addFeature(sketchFeature);
    }

    if (this.modifyFeature_ === null) {
      for (var i = 0; i < this.features_.getLength(); i++) {
        var modifyFeature = this.features_.getArray()[i];
        if (modifyFeature != sketchFeature) {
          var modifyCoords = modifyFeature.getGeometry().getCoordinates();
          var modifyPolygon = turfPolygon(modifyCoords);
          if (booleanOverlap(sketchFeaturePolygon, modifyPolygon)) {
            this.willModifyFeatures_(event);
            this.modifyFeature_ = modifyFeature;
            if (this.mode_ === 'subtract') {
              var coords = difference(modifyPolygon, sketchFeaturePolygon);
            } else {
              var coords = union(sketchFeaturePolygon, modifyPolygon);
            }
            this.modifyFeature_.getGeometry().setCoordinates(coords);
          }
          if (booleanContains(sketchFeaturePolygon, modifyPolygon)) {
            // sketchFeaturePolygon contains modifyPolygon completely
            this.willModifyFeatures_(event);
            this.modifyFeature_ = modifyFeature;
            if (this.mode_ === 'subtract') {
              this.features_.remove(modifyFeature);
              this.modifyFeature_ = null;
            }
            else {
              coords = sketchFeature.getGeometry().getCoordinates();
              this.modifyFeature_.getGeometry().setCoordinates(coords);
            }
          }
        }
      }
    }
    else {
      var modifyCoords = this.modifyFeature_.getGeometry().getCoordinates();
      var modifyPolygon = turfPolygon(modifyCoords);
      if (booleanOverlap(sketchFeaturePolygon, modifyPolygon)) {
        this.willModifyFeatures_(event);
        if (this.mode_ === 'subtract') {
          var coords = difference(modifyPolygon, sketchFeaturePolygon);
        } else {
          var coords = union(sketchFeaturePolygon, modifyPolygon);
        }
        this.modifyFeature_.getGeometry().setCoordinates(coords);
      } else if (booleanContains(sketchFeaturePolygon, modifyPolygon)) {
        // sketchFeaturePolygon contains modifyPolygon completely
        this.willModifyFeatures_(event);
        if (this.mode_ === 'subtract') {
          this.features_.remove(modifyFeature);
          this.modifyFeature_ = null;
        }
        else {
          coords = sketchFeature.getGeometry().getCoordinates();
          this.modifyFeature_.getGeometry().setCoordinates(coords);
        }
      }
    }
  }

  finishModifying_(event) {
      this.drawmode_ = false;
      this.createOrUpdateSketchPoint_(event);
      this.dispatchEvent(new ModifyEvent(ModifyEventType.MODIFYEND, this.features_, event));
      this.modifyFeature_ = null;
  }

  abortDrawing_() {
    this.finishCoordinate_ = null;
    const sketchFeature = this.sketchFeature_;
    if (sketchFeature) {
      this.sketchFeature_ = null;
      this.sketchPoint_ = null;
      this.sketchLine_ = null;
      /** @type {VectorSource} */ (this.overlay_.getSource()).clear(true);
    }

    return sketchFeature;
  }

}
/**
 * @param {SegmentData} a The first segment data.
 * @param {SegmentData} b The second segment data.
 * @return {number} The difference in indexes.
 */
function compareIndexes(a, b) {

  return a.index - b.index;
}


/**
 * @return {import("../style/Style.js").StyleFunction} Styles.
 */
function getDefaultStyleFunction() {
  const style = createEditingStyle();

  return function(feature, resolution) {

    return style[GeometryType.CIRCLE];
  }
}


export default ModifyPolygonBrush;
