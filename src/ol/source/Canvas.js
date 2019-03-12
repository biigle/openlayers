/**
 * @module ol/source/Canvas
 */
import Image from './Image.js';
import ImageCanvas from '../ImageCanvas.js';
import {listen} from '../events.js';
import EventType from '../events/EventType.js';
import {intersects} from '../extent.js';

/**
 * @typedef {Object} Options
 * @property {import("./Source.js").AttributionLike} [attributions]
 * @property {import("../extent.js").Extent} canvasExtent Extent.
 * @property {import("../size.js").Size} canvasSize Size.
 * @property {import("../proj.js").ProjectionLike} projection
 * @property {HTMLCanvasElement} canvas
 */

/**
 * @classdesc
 * Base class for canvas sources where a canvas element is the canvas.
 * @api
 */
class Canvas extends Image {
  /**
   * @param {Options} options Single image source options.
   */
  constructor(options) {
    super({
      attributions: options.attributions,
      projection: options.projection,
      resolutions: options.resolutions,
      state: options.state
    })

    /**
     * @private
     * @type {import("../ImageCanvas.js").ImageCanvas}
     */
    this.canvas_ = new ImageCanvas(options.canvasExtent, undefined, 1, options.canvas);

    /**
     * @private
     * @type {import("../size.js").Size}
     */
    this.canvasSize_ = options.canvasSize ? options.canvasSize : null;

    listen(this.canvas_, EventType.CHANGE, this.handleImageChange, this);
  }

  /**
   * @inheritDoc
   */
  getImageInternal(extent, resolution, pixelRatio, projection) {
    if (intersects(extent, this.canvas_.getExtent())) {
      return this.canvas_;
    }
    return null;
  };
}

export default Canvas;
