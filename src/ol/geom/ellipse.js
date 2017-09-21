goog.provide('ol.geom.Ellipse');

goog.require('ol');
goog.require('ol.geom.Polygon');


/**
 * @classdesc
 * Ellipse geometry.
 *
 * @constructor
 * @extends {ol.geom.Polygon}
 * @param {Array.<Array.<ol.Coordinate>>} coordinates Coordinates.
 * @param {ol.geom.GeometryLayout=} opt_layout Layout.
 * @api experimental
 */
ol.geom.Ellipse = function(coordinates, opt_layout) {
  ol.geom.Polygon.call(this, coordinates, opt_layout);
};
ol.inherits(ol.geom.Ellipse, ol.geom.Polygon);


/**
 * @inheritDoc
 * @api experimental
 */
ol.geom.Ellipse.prototype.getType = function() {
  return ol.geom.GeometryType.ELLIPSE;
};

/**
 * @inheritDoc
 */
ol.geom.Ellipse.prototype.closestPointXY = function(x, y, closestPoint, minSquaredDistance) {
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
