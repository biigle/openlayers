import {polygon as turfPolygon} from '@turf/helpers'
import booleanContains from '@turf/boolean-contains'
import booleanOverlap from '@turf/boolean-overlap'
import Feature from '../Feature.js';
import EventType from '../events/EventType.js';
import GeometryType from '../geom/GeometryType.js';
import Circle from '../geom/Circle.js';
import Polygon from '../geom/Polygon.js';
import {createEditingStyle} from '../style/Style.js';
import Modify from './Modify.js'
import {ModifyEvent} from './Modify.js'
import {ModifyEventType} from './Modify.js'
import {shiftKeyOnly} from '../events/condition.js';
import {fromCircle} from '../geom/Polygon.js'
import {union} from '../geom/flat/union.js';
import {difference} from '../geom/flat/difference.js';
import {always} from '../events/condition.js';
import Collection from '../Collection.js';

/**
 * @enum {string}
 */
export const ModifyPolygonBrushEventType = {
  /**
   * Triggered upon feature modification start
   * @event ModifyPolygonBrushEvent#modifyremove
   * @api
   */
  MODIFYREMOVE: 'modifyremove',
};

const MIN_BRUSH_SIZE = 5;
const BRUSH_RESIZE_STEP = 10;

class ModifyPolygonBrush extends Modify {
  /**
   * @param {Options} options Options.
   */
  constructor(options) {

    super(options);

    this.overlay_.setStyle(options.style ? options.style : getDefaultStyleFunction());

    this.sketchPoint_ = null;
    this.sketchPointRadius_ = options.brushRadius !== undefined ?
      options.brushRadius : 100;
    this.addCondition_ = options.addCondition !== undefined ?
      options.addCondition : always;
    this.subtractCondition_ = options.subtractCondition !== undefined ?
      options.subtractCondition : always;
    this.allowRemove_ = options.allowRemove !== undefined ?
      options.allowRemove : true;

  }

  setMap(map) {
    super.setMap(map);
    if (map) {
      map.getView().on('change:resolution', this.updateRelativeSketchPointRadius_.bind(this));
    }
  }

  createOrUpdateSketchPoint_(event) {
    const coordinates = event.coordinate.slice();
    if (!this.sketchPoint_) {
      let relativeRadius = event.map.getView().getResolution() * this.sketchPointRadius_;
      this.sketchPoint_ = new Feature(new Circle(coordinates, relativeRadius));
      this.overlay_.getSource().addFeature(this.sketchPoint_)
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

  handleEvent(event) {
    const type = event.type;
    let pass = true;
    if (shiftKeyOnly(event) && type === EventType.WHEEL) {
      this.updateAbsoluteSketchPointRadius_(event);
      pass = false;
    }

    return super.handleEvent(event) && pass;
  }

  handlePointerMove_(event) {
    this.createOrUpdateSketchPoint_(event);
  }

  handleDownEvent(event) {
    if (!this.handlingDownUpSequence) {
      this.startModifying_(event);

      return true;
    }

    return false;
  }

  handleUpEvent(event) {
    if (this.handlingDownUpSequence) {
      this.finishModifying_(event);

      return true;
    }

    return false;
  }

  startModifying_(event) {
    this.willModifyFeatures_(event);
    this.modifyCurrentFeatures_(event);
  }

  handleDragEvent(event) {
    this.createOrUpdateSketchPoint_(event);
    this.modifyCurrentFeatures_(event);
  }

  modifyCurrentFeatures_(event) {
    const sketchPointGeom = fromCircle(this.sketchPoint_.getGeometry());
    let sketchPointPolygon = turfPolygon(sketchPointGeom.getCoordinates());
    let sketchPointArea = sketchPointGeom.getArea();
    this.features_.getArray().forEach(function (feature) {
      let featurePolygon = turfPolygon(feature.getGeometry().getCoordinates());
      if (booleanOverlap(sketchPointPolygon, featurePolygon)) {
        if (this.subtractCondition_()) {
          var coords = difference(featurePolygon, sketchPointPolygon);
          if (!this.allowRemove_ && sketchPointArea > (new Polygon(coords)).getArea()) {
            // If allowRemove_ is false, the modified polygon may not become smaller than
            // the sketchPointPolygon.
            return;
          }
        } else if (this.addCondition_()) {
          var coords = union(sketchPointPolygon, featurePolygon);
        }
        feature.getGeometry().setCoordinates(coords);
      } else if (booleanContains(sketchPointPolygon, featurePolygon)) {
        if (this.subtractCondition_()) {
          if (this.allowRemove_) {
            this.dispatchEvent(
              new ModifyEvent(ModifyPolygonBrushEventType.MODIFYREMOVE, new Collection([feature]), event)
            );
          }
        } else if (this.addCondition_()) {
          feature.getGeometry().setCoordinates(sketchPointGeom.getCoordinates());
        }
      }
    }, this);
  }

  finishModifying_(event) {
    this.dispatchEvent(new ModifyEvent(ModifyEventType.MODIFYEND, this.features_, event));
  }
}

function getDefaultStyleFunction() {
  const style = createEditingStyle();

  return function(feature, resolution) {
    return style[GeometryType.CIRCLE];
  }
}


export default ModifyPolygonBrush;
