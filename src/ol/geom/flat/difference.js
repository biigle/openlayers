import turfDifference from '@turf/difference';
import {polygon as turfPolygon} from '@turf/helpers';
import Polygon from '../Polygon.js';
import {reducePrecision} from './simplify.js';

export function difference(first, second) {
  // Reduce the precision of the coordinates to avoid artifacts from the difference
  // operation. If the full precision is used, some coordinates that should be equal are
  // not considered equal and the difference operation returns a multipolygon where it
  // shouldn't.
  first.geometry.coordinates = reducePrecision(first.geometry.coordinates);
  second.geometry.coordinates = reducePrecision(second.geometry.coordinates);

  var differencePolygon = turfDifference(first, second);
  if (differencePolygon.geometry.type === 'MultiPolygon') {
      var maxArea = 0;
      var maxPoly;
      for (var i = 0; i < differencePolygon.geometry.coordinates.length; i++) {
          var second = turfPolygon(differencePolygon.geometry.coordinates[i]);
          var olPoly = new Polygon(differencePolygon.geometry.coordinates[i]);
          var area = olPoly.getArea();
          if (area > maxArea) {
              maxArea = area;
              maxPoly = second;
          }
      }
      differencePolygon = maxPoly;
  }

  return differencePolygon.geometry.coordinates;
}
