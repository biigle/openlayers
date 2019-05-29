import intersect from '@turf/intersect'
import union from '@turf/union'
import {polygon as turfPolygon} from '@turf/helpers'
import Draw from './Draw.js';
import {DrawEvent} from './Draw.js';
import {DrawEventType} from './Draw.js';
import createRegularPolygon from './Draw.js';
import Circle from '../geom/Circle.js';
import Feature from '../Feature.js';
import MapBrowserEventType from '../MapBrowserEventType.js';
import EventType from '../events/EventType.js';
import {shiftKeyOnly} from '../events/condition.js';
import {TRUE, FALSE} from '../functions.js';
import Polygon from '../geom/Polygon.js'
import {fromCircle} from '../geom/Polygon.js'

class PolygonBrush extends Draw {


  constructor(options) {

//    const pointerOptions = /** @type {import("./Pointer.js").Options} */ (options);
//    if (!pointerOptions.stopDown) {
//      pointerOptions.stopDown = FALSE;
//    }

//    console.log(pointerOptions);

    super(options)

    this.circleRadius_ = 10000  //TODO better value
  }

  handleEvent(event) {
    let pass = super.handleEvent(event);
    const type = event.type;
    if (shiftKeyOnly(event) && (type === EventType.WHEEL || type === EventType.MOUSEWHEEL)) {
      pass = false; 
      console.log(event.originalEvent.deltaY)
      this.updateSketchPointRadius_(event);
    }
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
//    if (this.mode_ === Mode.POINT) {
    this.sketchCoords_ = start.slice();
//    console.log(this.sketchCoords_)
//    console.log(this.mode_)
//    } else if (this.mode_ === Mode.POLYGON) {
//      this.sketchCoords_ = [[start.slice(), start.slice()]];
//      this.sketchLineCoords_ = this.sketchCoords_[0];
//    } else {
//      this.sketchCoords_ = [start.slice(), start.slice()];
//    }
//    if (this.sketchLineCoords_) {
//      this.sketchLine_ = new Feature(
//        new LineString(this.sketchLineCoords_));
//    }
//    const circle_ = new Circle(this.sketchCoords_,this.circleRadius_);
    const geometry = new Circle(this.sketchCoords_,this.circleRadius_);
    this.sketchFeature_ = new Feature(geometry);
//    if (this.geometryName_) {
//      this.sketchFeature_.setGeometryName(this.geometryName_);
//    }
//    this.sketchFeature_.setGeometry(geometry);
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
    console.log(geometry)

//    let coordinates = this.sketchCoords_;
//    const geometry = /** @type {import("../geom/SimpleGeometry.js").default} */ (sketchFeature.getGeometry());
//    if (this.mode_ === Mode.LINE_STRING) {
//      // remove the redundant last point
//      coordinates.pop();
//      this.geometryFunction_(coordinates, geometry);
//    } else if (this.mode_ === Mode.POLYGON) {
//      // remove the redundant last point in ring
//      /** @type {PolyCoordType} */ (coordinates)[0].pop();
//      this.geometryFunction_(coordinates, geometry);
//      coordinates = geometry.getCoordinates();
//    }

//    // cast multi-part geometries
//    if (this.type_ === GeometryType.MULTI_POINT) {
//      sketchFeature.setGeometry(new MultiPoint([/** @type {PointCoordType} */(coordinates)]));
//    } else if (this.type_ === GeometryType.MULTI_LINE_STRING) {
//      sketchFeature.setGeometry(new MultiLineString([/** @type {LineCoordType} */(coordinates)]));
//    } else if (this.type_ === GeometryType.MULTI_POLYGON) {
//      sketchFeature.setGeometry(new MultiPolygon([/** @type {PolyCoordType} */(coordinates)]));
//    }

    var current_poly = turfPolygon(geometry.getCoordinates())
    console.log("Turf polygon:", current_poly)

    var features_to_remove = [];
    console.log(this.source_.getFeatures())
    for (var i = 0; i < this.source_.getFeatures().length; i++) {
        var compareFeature = this.source_.getFeatures()[i];
        console.log(compareFeature);
        var compareCoords = compareFeature.getGeometry().getCoordinates();
        var comparePoly = turfPolygon(compareCoords);
        console.log("Turf compare polygon:", comparePoly);
        var polygon_intersection = intersect(current_poly,comparePoly);
        console.log(polygon_intersection)
        if (polygon_intersection !== null) {
            features_to_remove.push(compareFeature);
            var polygonUnion = union(current_poly, comparePoly);
            console.log(features_to_remove);
            sketchFeature.getGeometry().setCoordinates(polygonUnion.geometry["coordinates"]);
        }
    }

    console.log(this.source_.getFeatures().splice())
    console.log(features_to_remove)
    console.log("Before:",this.source_.getFeatures())
    for (var j = 0; j < features_to_remove.length; j++) {
        this.source_.removeFeature(features_to_remove[j]);
    }
    console.log("After:",this.source_.getFeatures())



    // First dispatch event to allow full set up of feature
    this.dispatchEvent(new DrawEvent(DrawEventType.DRAWEND, sketchFeature));

    // Then insert feature
    if (this.features_) {
      this.features_.push(sketchFeature);
    }
    if (this.source_) {
      this.source_.addFeature(sketchFeature);
    }



//    var features = vector.getSource().getFeatures();
//    console.log("Features:",features)

////    features.forEach(function(feature) {
////       console.log(feature.getGeometry().getCoordinates());
////       for (var i = 0; i < features.length; i++) {

////       }
////    });
//    for (var i = 0; i < features.length; i++) {
//        console.log(features[i].getGeometryName())
////        for (var j = 0; j < features.length; j++) {
////            console.log(new Intersets)
////            console.log()
////        }
//    })

  }

  //TODO super.pointerOptions not defined if the lines below are used
  //TODO draw polygons of the form of the sketch point circle on mouse-over
  //TODO merge polygons already drawn

//    this.updateSketchFeatures_();
//    this.dispatchEvent(new DrawEvent(DrawEventType.DRAWSTART, this.sketchFeature_));
//    console.log(this.sketchFeature_);
//    console.log(this.geometryName_);
//    console.log(this.geometryFunction_);

}

export default PolygonBrush;
