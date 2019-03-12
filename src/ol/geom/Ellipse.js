/**
 * @module ol/geom/Ellipse
 */
import GeometryType from './GeometryType.js';
import Polygon from './Polygon.js';

/**
 * @classdesc
 * Ellipse geometry.
 *
 * @api
 */
class Ellipse extends Polygon {
  /**
   * @inheritDoc
   * @api
   */
  getType() {
    return GeometryType.ELLIPSE;
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

  /**
   * Return the area of the ellipse.
   * @return {number} Area
   * @api
   */
  getArea() {
    var coords = this.flatCoordinates;
    // Diameter along first principal axis.
    var a = Math.sqrt(Math.pow(coords[0] - coords[4], 2) + Math.pow(coords[1] - coords[5], 2));
    // Diameter along second principal axis.
    var b = Math.sqrt(Math.pow(coords[2] - coords[6], 2) + Math.pow(coords[3] - coords[7], 2));

    // Multiply by 0.25 because the area is calculated with the radius, not the diameter.
    return Math.PI * a * b * 0.25;
  }
}

export default Ellipse;
