goog.provide('ol.source.Canvas');

goog.require('ol.ImageCanvas');
goog.require('ol.extent');
goog.require('ol.source.Image');



/**
 * @classdesc
 * Base class for image sources where a canvas element is the image.
 *
 * @constructor
 * @extends {ol.source.Image}
 * @param {olx.source.CanvasOptions} options
 * @api
 */
ol.source.Canvas = function(options) {

  var attributions = options.attributions !== undefined ?
      options.attributions : null;

  var canvasExtent = options.canvasExtent;

  var resolution, resolutions;
  if (options.canvasSize !== undefined) {
    resolution = ol.extent.getHeight(canvasExtent) / options.canvasSize[1];
    resolutions = [resolution];
  }

  goog.base(this, {
    attributions: attributions,
    logo: options.logo,
    projection: ol.proj.get(options.projection),
    resolutions: resolutions
  });

  /**
   * @private
   * @type {ol.ImageCanvas}
   */
  this.canvas_ = new ol.ImageCanvas(canvasExtent, resolution, 1,
        attributions, options.canvas);
  goog.events.listen(this.canvas_, goog.events.EventType.CHANGE,
    this.handleImageChange, false, this);
};
goog.inherits(ol.source.Canvas, ol.source.Image);


/**
 * @inheritDoc
 */
ol.source.Canvas.prototype.getImageInternal =
    function(extent, resolution, pixelRatio, projection) {

  if (ol.extent.intersects(extent, this.canvas_.getExtent())) {
    return this.canvas_;
  }
  return null;
};
