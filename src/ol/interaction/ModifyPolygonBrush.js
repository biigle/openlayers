/**
 * @module ol/interaction/ModifyPolygonBrush
 */
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

export const ModifyPolygonBrushEventType = {
  MODIFYREMOVE: 'modifyremove',
};

const MIN_BRUSH_SIZE = 5;
const BRUSH_RESIZE_STEP = 10;

/**
 * @classdesc
 * Interaction for modifying polygons with a brush.
 *
 * @fires ModifyEvent
 * @api
 */
class ModifyPolygonBrush extends Modify {
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
    this.resizeCondition_ = options.resizeCondition !== undefined ?
      options.resizeCondition : shiftKeyOnly;
    this.allowRemove_ = options.allowRemove !== undefined ?
      options.allowRemove : true;

    this.isAdding_ = false;
    this.isSubtracting_ = false;

  }

  setMap(map) {
    super.setMap(map);
    if (map) {
      let view = map.getView();
      if (view) {
        this.watchViewForChangedResolution(view);
      }

      map.on('change:view', (function (e) {
        this.watchViewForChangedResolution(e.target.getView());
      }).bind(this));
    }
  }

  watchViewForChangedResolution(view) {
    view.on('change:resolution', this.updateRelativeSketchPointRadius_.bind(this));
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
    let delta = event.originalEvent.deltaY;
    // Take the delta from deltaX if deltyY is 0 because some systems toggle the scroll
    // direction with certain keys pressed (e.g. Mac with Shift+Scroll).
    if (event.type == EventType.MOUSEWHEEL) {
      delta = -event.originalEvent.wheelDeltaY;
      if (delta === 0) {
        delta = -event.originalEvent.wheelDeltaX;
      }
    } else if (delta === 0) {
      delta = event.originalEvent.deltaX;
    }

    if (this.sketchPoint_) {
      if (delta > 0) {
        this.sketchPointRadius_ += BRUSH_RESIZE_STEP;
      }
      if (delta < 0) {
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
    if (this.resizeCondition_(event) &&
      (type === EventType.WHEEL || EventType.MOUSEWHEEL)) {
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
      this.createOrUpdateSketchPoint_(event);

      if (this.subtractCondition_(event)) {
        this.startSubtracting_(event);

        return true;
      } else if (this.addCondition_(event)) {
        this.startAdding_(event);

        return true;
      }
    }

    return false;
  }

  handleUpEvent(event) {
    if (this.handlingDownUpSequence && (this.isSubtracting_ || this.isAdding_)) {
      this.finishModifying_(event);

      return true;
    }

    return false;
  }

  startSubtracting_(event) {
    this.isSubtracting_ = true;
    this.willModifyFeatures_(event);
    this.subtractCurrentFeatures_(event);
  }

  startAdding_(event) {
    this.isAdding_ = true;
    this.willModifyFeatures_(event);
    this.addCurrentFeatures_(event);
  }

  handleDragEvent(event) {
    this.createOrUpdateSketchPoint_(event);
    if (this.isSubtracting_) {
      this.subtractCurrentFeatures_(event);
    } else if (this.isAdding_) {
      this.addCurrentFeatures_(event);
    }
  }

  subtractCurrentFeatures_(event) {
    const sketchPointGeom = fromCircle(this.sketchPoint_.getGeometry());
    let sketchPointPolygon = turfPolygon(sketchPointGeom.getCoordinates());
    let sketchPointArea = sketchPointGeom.getArea();
    this.features_.getArray().forEach(function (feature) {
      let featureGeom = feature.getGeometry();
      try {
        var featurePolygon = turfPolygon(featureGeom.getCoordinates());
      } catch (e) {
        // Skip features that can't be represented as polygon.
        return;
      }
      if (booleanOverlap(sketchPointPolygon, featurePolygon)) {
        var coords = difference(featurePolygon, sketchPointPolygon);
        if (!this.allowRemove_ && sketchPointArea > (new Polygon(coords)).getArea()) {
          // If allowRemove_ is false, the modified polygon may not become smaller than
          // the sketchPointPolygon.
          return;
        }
        featureGeom.setCoordinates(coords);
      } else if (booleanContains(sketchPointPolygon, featurePolygon)) {
        if (this.allowRemove_) {
          this.features_.remove(feature);
          if (this.source_) {
            this.source_.removeFeature(feature);
          }
          this.dispatchEvent(
            new ModifyEvent(ModifyPolygonBrushEventType.MODIFYREMOVE, new Collection([feature]), event)
          );
        }
      }
    }, this);
  }

  addCurrentFeatures_(event) {
    const sketchPointGeom = fromCircle(this.sketchPoint_.getGeometry());
    let sketchPointPolygon = turfPolygon(sketchPointGeom.getCoordinates());
    this.features_.getArray().forEach(function (feature) {
      let featureGeom = feature.getGeometry();
      try {
        var featurePolygon = turfPolygon(featureGeom.getCoordinates());
      } catch (e) {
        // Skip features that can't be represented as polygon.
        return;
      }
      if (booleanOverlap(sketchPointPolygon, featurePolygon)) {
        featureGeom.setCoordinates(union(sketchPointPolygon, featurePolygon));
      } else if (booleanContains(sketchPointPolygon, featurePolygon)) {
        featureGeom.setCoordinates(sketchPointGeom.getCoordinates());
      }
    }, this);
  }

  finishModifying_(event) {
    this.isSubtracting_ = false;
    this.isAdding_ = false;
    this.dispatchEvent(new ModifyEvent(ModifyEventType.MODIFYEND, this.features_, event));
  }

  getBrushRadius() {
    return this.sketchPointRadius_;
  }
}

function getDefaultStyleFunction() {
  const style = createEditingStyle();

  return function(feature, resolution) {
    return style[GeometryType.CIRCLE];
  }
}


export default ModifyPolygonBrush;
