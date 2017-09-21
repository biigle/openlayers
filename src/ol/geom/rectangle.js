goog.provide('ol.geom.Rectangle');

goog.require('ol');
goog.require('ol.geom.Polygon');


/**
 * @classdesc
 * Rectangle geometry.
 *
 * @constructor
 * @extends {ol.geom.Polygon}
 * @param {Array.<Array.<ol.Coordinate>>} coordinates Coordinates.
 * @param {ol.geom.GeometryLayout=} opt_layout Layout.
 * @api experimental
 */
ol.geom.Rectangle = function(coordinates, opt_layout) {
  ol.geom.Polygon.call(this, coordinates, opt_layout);
};
ol.inherits(ol.geom.Rectangle, ol.geom.Polygon);


/**
 * @inheritDoc
 * @api experimental
 */
ol.geom.Rectangle.prototype.getType = function() {
  return ol.geom.GeometryType.RECTANGLE;
};

/**
 * @inheritDoc
 */
ol.geom.Rectangle.prototype.closestPointXY = function(x, y, closestPoint, minSquaredDistance) {
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
};
