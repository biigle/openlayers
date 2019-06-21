import intersect from '@turf/intersect'
import union from '@turf/union'
import difference from '@turf/difference'
import {polygon as turfPolygon} from '@turf/helpers'
import {multiPolygon as turfMultiPolygon} from '@turf/helpers'
import booleanContains from '@turf/boolean-contains'
import booleanOverlap from '@turf/boolean-overlap'
import Circle from '../geom/Circle.js';
import Feature from '../Feature.js';
import Polygon from '../geom/Polygon.js'

export function unionCoords(currentPolygon,comparePolygon) {
    var unionPolygon = union(currentPolygon,comparePolygon);
    if (unionPolygon.geometry.type == 'MultiPolygon') {
        unionPolygon = turfPolygon(unionPolygon.geometry.coordinates[0]);
    }
    var coords = unionPolygon.geometry.coordinates;
    return coords;
}

//order of polygons is important
export function differenceCoords(comparePolygon,currentPolygon) {
    var differencePolygon = difference(comparePolygon,currentPolygon);
    if (differencePolygon.geometry.type == 'MultiPolygon') {
        differencePolygon = turfPolygon(differencePolygon.geometry.coordinates[0])
    }
    var coords = differencePolygon.geometry.coordinates;
    return coords;
}
