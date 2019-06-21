import intersect from '@turf/intersect'
import union from '@turf/union'
import difference from '@turf/difference'
import {polygon as turfPolygon} from '@turf/helpers'
import {multiPolygon as turfMultiPolygon} from '@turf/helpers'
import booleanContains from '@turf/boolean-contains'
import booleanOverlap from '@turf/boolean-overlap'
import {getUid} from '../util.js';
import Collection from '../Collection.js';
import CollectionEventType from '../CollectionEventType.js';
import Feature from '../Feature.js';
import MapBrowserEventType from '../MapBrowserEventType.js';
import {equals} from '../array.js';
import {equals as coordinatesEqual, distance as coordinateDistance, squaredDistance as squaredCoordinateDistance, squaredDistanceToSegment, closestOnSegment} from '../coordinate.js';
import {listen, unlisten} from '../events.js';
import Event from '../events/Event.js';
import EventType from '../events/EventType.js';
import {always, primaryAction, altKeyOnly, singleClick} from '../events/condition.js';
import {boundingExtent, buffer, createOrUpdateFromCoordinate} from '../extent.js';
import GeometryType from '../geom/GeometryType.js';
import Point from '../geom/Point.js';
import Circle from '../geom/Circle.js';
import PointerInteraction from './Pointer.js';
import VectorLayer from '../layer/Vector.js';
import VectorSource from '../source/Vector.js';
import VectorEventType from '../source/VectorEventType.js';
import RBush from '../structs/RBush.js';
import {createEditingStyle} from '../style/Style.js';
import Modify from './Modify.js'
import {ModifyEvent} from './Modify.js'
import {ModifyEventType} from './Modify.js'
import {shiftKeyOnly,altShiftKeysOnly} from '../events/condition.js';
import {fromCircle} from '../geom/Polygon.js'
import {DrawEvent} from './Draw.js';
import {DrawEventType} from './Draw.js';
import {differenceCoords} from './polygonInteractionHelpers.js';


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


/**
 * @typedef {Object} SegmentData
 * @property {Array<number>} [depth]
 * @property {Feature} feature
 * @property {import("../geom/SimpleGeometry.js").default} geometry
 * @property {number} [index]
 * @property {Array<import("../extent.js").Extent>} segment
 * @property {Array<SegmentData>} [featureSegments]
 */


/**
 * @typedef {Object} Options
 * @property {import("../events/condition.js").Condition} [condition] A function that
 * takes an {@link module:ol/MapBrowserEvent~MapBrowserEvent} and returns a
 * boolean to indicate whether that event will be considered to add or move a
 * vertex to the sketch. Default is
 * {@link module:ol/events/condition~primaryAction}.
 * @property {import("../events/condition.js").Condition} [deleteCondition] A function
 * that takes an {@link module:ol/MapBrowserEvent~MapBrowserEvent} and returns a
 * boolean to indicate whether that event should be handled. By default,
 * {@link module:ol/events/condition~singleClick} with
 * {@link module:ol/events/condition~altKeyOnly} results in a vertex deletion.
 * @property {import("../events/condition.js").Condition} [insertVertexCondition] A
 * function that takes an {@link module:ol/MapBrowserEvent~MapBrowserEvent} and
 * returns a boolean to indicate whether a new vertex can be added to the sketch
 * features. Default is {@link module:ol/events/condition~always}.
 * @property {number} [pixelTolerance=10] Pixel tolerance for considering the
 * pointer close enough to a segment or vertex for editing.
 * @property {import("../style/Style.js").StyleLike} [style]
 * Style used for the features being modified. By default the default edit
 * style is used (see {@link module:ol/style}).
 * @property {VectorSource} [source] The vector source with
 * features to modify.  If a vector source is not provided, a feature collection
 * must be provided with the features option.
 * @property {Collection<Feature>} [features]
 * The features the interaction works on.  If a feature collection is not
 * provided, a vector source must be provided with the source option.
 * @property {boolean} [wrapX=false] Wrap the world horizontally on the sketch
 * overlay.
 */


/**
 * @classdesc
 * Interaction for modifying feature geometries.  To modify features that have
 * been added to an existing source, construct the modify interaction with the
 * `source` option.  If you want to modify features in a collection (for example,
 * the collection used by a select interaction), construct the interaction with
 * the `features` option.  The interaction must be constructed with either a
 * `source` or `features` option.
 *
 * By default, the interaction will allow deletion of vertices when the `alt`
 * key is pressed.  To configure the interaction with a different condition
 * for deletion, use the `deleteCondition` option.
 * @fires ModifyEvent
 * @api
 */
class ModifySubtract extends Modify {
  /**
   * @param {Options} options Options.
   */
  constructor(options) {

    super(/** @type {import("./Pointer.js").Options} */ (options));

    /**
     * Editing vertex.
     * @type {Feature}
     * @private
     */
    this.vertexFeature_ = null;

    this.sketchFeature_ = null;

    this.modifyFeature_ = null;

    this.sketchPoint_ = null;

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

    this.circleRadius_ = 10000;  //TODO better value
    this.drawmode_ = false;

  }


  /**
   * @param {import("../coordinate.js").Coordinate} coordinates Coordinates.
   * @return {Feature} Vertex feature.
   * @private
   */
  createOrUpdateVertexFeature_(coordinates) {
    let vertexFeature = this.vertexFeature_;
    if (!vertexFeature) {
      vertexFeature = new Feature(new Circle(coordinates,this.circleRadius_));
      this.vertexFeature_ = vertexFeature;
      /** @type {VectorSource} */ (this.overlay_.getSource()).addFeature(vertexFeature);
    } else {
      const geometry = /** @type {Point} */ (vertexFeature.getGeometry());
      geometry.setCenter(coordinates);
    }
    return vertexFeature;
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
      this.finishDrawing();
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
      //TODO dispatch other event
      this.dispatchEvent(new ModifyEvent(ModifyEventType.MODIFYEND, this.features_, event));
      this.modifyFeature_ = null;
    }
    if (this.drawmode_ && type === MapBrowserEventType.DOUBLECLICK) {

    }
    this.createOrUpdateSketchPoint_(event);
    return pass
  }

  startDrawing_(event) {
    const start = event.coordinate;
    this.finishCoordinate_ = start;
    this.sketchCoords_ = start.slice();

    const geometry = new Circle(this.sketchCoords_,this.circleRadius_);
    this.sketchFeature_ = new Feature(geometry);
    this.updateSketchFeatures_();
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

    var currentPolygon = turfPolygon(geometry.getCoordinates())

    //TODO dispatch event here or in the handler above? Then an event must be passed!
    // First dispatch event to allow full set up of feature
//    this.dispatchEvent(new DrawEvent(DrawEventType.DRAWEND, sketchFeature));

    // Then insert feature
    if (this.source_) {
      this.source_.addFeature(sketchFeature);
    }

    //TODO skip changes if modifyFeature_ contains sketchFeature_ other completely
    //remove ModifyFeature_ if sketchFeature_ contains modifyFeature_ completely
    if (this.modifyFeature_ == null) {
        for (var i = 0; i < this.features_.getLength(); i++) {
          var compareFeature = this.features_.getArray()[i];
          if (compareFeature != sketchFeature) {
            var compareCoords = compareFeature.getGeometry().getCoordinates();
            var comparePoly = turfPolygon(compareCoords);
            if (booleanOverlap(currentPolygon,comparePoly)) {
                this.modifyFeature_ = compareFeature;
                var coords = differenceCoords(comparePoly,currentPolygon);
                this.modifyFeature_.getGeometry().setCoordinates(coords);
            }
          }
        }
    }
    else {
        var compareCoords = this.modifyFeature_.getGeometry().getCoordinates();
        var comparePoly = turfPolygon(compareCoords);
        if (booleanOverlap(currentPolygon,comparePoly)) {
            var coords = differenceCoords(comparePoly,currentPolygon);
            this.modifyFeature_.getGeometry().setCoordinates(coords);
        }
    }
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

  handlePointerAtPixel_(pixel,map) {

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
    return style[GeometryType.CIRCLE];//TODO does this help?
  };
}


export default ModifySubtract;
