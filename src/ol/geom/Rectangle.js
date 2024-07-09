/**
 * @module ol/geom/Rectangle
 */
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
    return 'Rectangle';
  }

  /**
   * @inheritDoc
   */
  closestPointXY(x, y, closestPoint, minSquaredDistance) {
    const flatCoordinates = this.flatCoordinates;
    let distance = minSquaredDistance;
    let d, dx, dy;
    closestPoint[0] = flatCoordinates[0];
    closestPoint[1] = flatCoordinates[1];

    for (let i = 0, l = flatCoordinates.length; i < l; i += 2) {
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
