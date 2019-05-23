import Draw from './Draw.js';
import DrawEvent from './Draw.js';
import DrawEventType from './Draw.js';
import createRegularPolygon from './Draw.js';
import Circle from '../geom/Circle.js';
import Feature from '../Feature.js';
import MapBrowserEventType from '../MapBrowserEventType.js';
import EventType from '../events/EventType.js';
import {shiftKeyOnly} from '../events/condition.js';
import {TRUE, FALSE} from '../functions.js';

class PolygonBrush extends Draw {

  constructor(options) {

    const pointerOptions = /** @type {import("./Pointer.js").Options} */ (options);
    if (!pointerOptions.stopDown) {
      pointerOptions.stopDown = FALSE;
    }

    console.log(pointerOptions);

    super(pointerOptions)

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
    console.log(this.sketchCoords_)
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
    const geometry = new Circle(this.sketchCoords_,this.circleRadius_);
    this.sketchFeature_ = new Feature();
    if (this.geometryName_) {
      this.sketchFeature_.setGeometryName(this.geometryName_);
    }
    this.sketchFeature_.setGeometry(geometry);
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
