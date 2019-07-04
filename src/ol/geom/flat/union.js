import turfUnion from '@turf/union';
import {polygon as turfPolygon} from '@turf/helpers';

function reducePrecision(coordinates) {
  return coordinates.map(function (ring) {
    return ring.map(function (coordinate) {
      return coordinate.map(function (value) {
        return Math.round(value * 1000) / 1000;
      });
    });
  });
}

export function union(first, second) {
  // Reduce the precision of the coordinates to avoid artifacts from the union operation.
  // If the full precision is used, some coordinates that should be equal are not
  // considered equal and the union operation returns a multipolygon where it shouldn't.
  first.geometry.coordinates = reducePrecision(first.geometry.coordinates);
  second.geometry.coordinates = reducePrecision(second.geometry.coordinates);
  var unionPolygon = turfUnion(first, second);
  if (unionPolygon.geometry.type === 'MultiPolygon') {
    // Fill any holes in the polygon that may appear after union, i.e. take only the
    // outline.
    return unionPolygon.geometry.coordinates[0];
  }

  return unionPolygon.geometry.coordinates;
}
