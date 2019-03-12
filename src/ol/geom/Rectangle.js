/**
 * @module ol/geom/Rectangle
 */
import GeometryType from './GeometryType.js';
import Polygon from './Polygon.js';

/**
 * @classdesc
 * Rectangle geometry.
 *
 * @api
 */
class Rectangle extends Polygon {
  /**
   * @inheritDoc
   * @api
   */
  getType() {
    return GeometryType.RECTANGLE;
  }

  /**
   * @inheritDoc
   */
  closestPointXY(x, y, closestPoint, minSquaredDistance) {
    var flatCoordinates = this.flatCoordinates;
    var distance = minSquaredDistance;
    var d, dx, dy;
    closestPoint[0] = flatCoordinates[0];
    closestPoint[1] = flatCoordinates[1];

    for (var i = 0, l = flatCoordinates.length; i < l; i += 2) {
      dx = x - flatCoordinates[i];
      dy = y - flatCoordinates[i + 1];
      d = dx * dx + dy * dy;
      if (d < distance) {
        distance = d;
        closestPoint[0] = flatCoordinates[i];
        closestPoint[1] = flatCoordinates[i + 1];
      }
    }

    return distance;
  }
}

export default Rectangle;
