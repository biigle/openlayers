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
