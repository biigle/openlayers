import turfUnion from '@turf/union';
import {polygon as turfPolygon} from '@turf/helpers';

export function union(currentPolygon, comparePolygon) {
    var unionPolygon = turfUnion(currentPolygon, comparePolygon);
    if (unionPolygon.geometry.type === 'MultiPolygon') {
        unionPolygon = turfPolygon(unionPolygon.geometry.coordinates[0]);
    }

    return unionPolygon.geometry.coordinates;
}
