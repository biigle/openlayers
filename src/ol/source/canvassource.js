goog.provide('ol.source.Canvas');

goog.require('ol.ImageCanvas');
goog.require('ol.extent');
goog.require('ol.source.Image');



/**
 * @classdesc
 * Base class for canvas sources where a canvas element is the canvas.
 *
 * @constructor
 * @extends {ol.source.Image}
 * @param {olx.source.CanvasOptions} options
 * @api
 */
ol.source.Canvas = function(options) {

  var canvasExtent = options.canvasExtent;

  ol.source.Image.call(this, {
    attributions: options.attributions,
    logo: options.logo,
    projection: ol.proj.get(options.projection)
  });

  /**
   * @private
   * @type {ol.ImageCanvas}
   */
  this.canvas_ = new ol.ImageCanvas(canvasExtent, undefined, 1,
        this.getAttributions(), options.canvas);

  /**
   * @private
   * @type {ol.Size}
   */
  this.canvasSize_ = options.canvasSize ? options.canvasSize : null;

  ol.events.listen(this.canvas_, ol.events.EventType.CHANGE,
    this.handleImageChange, this);
};
ol.inherits(ol.source.Canvas, ol.source.Image);


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
