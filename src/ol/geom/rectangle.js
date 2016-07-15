goog.provide('ol.geom.Rectangle');

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

  this.setCoordinates(coordinates, opt_layout);

};
goog.inherits(ol.geom.Rectangle, ol.geom.Polygon);


/**
 * @inheritDoc
 * @api experimental
 */
ol.geom.Rectangle.prototype.getType = function() {
  return ol.geom.GeometryType.RECTANGLE;
};
