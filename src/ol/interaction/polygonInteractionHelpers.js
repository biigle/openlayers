import union from '@turf/union';
import difference from '@turf/difference';
import {polygon as turfPolygon} from '@turf/helpers';
import {multiPolygon as turfMultiPolygon} from '@turf/helpers';
import Feature from '../Feature.js';
import Polygon from '../geom/Polygon.js';

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
        var maxArea = 0;
        var maxPoly;
        for (var i = 0; i < differencePolygon.geometry.coordinates.length; i++) {
            var currentPolygon = turfPolygon(differencePolygon.geometry.coordinates[i]);
            var olPoly = new Feature(new Polygon(differencePolygon.geometry.coordinates[i]))
            var area = olPoly.getGeometry().getArea()
//            console.log("OL Poly area:",area,"Max area:",maxArea)
            if (area > maxArea) {
                maxArea = area;
                maxPoly = currentPolygon;
//                console.log(maxPoly)
            }
        }
        differencePolygon = maxPoly;
//        console.log("Result:",maxOL);
    }
    var coords = differencePolygon.geometry.coordinates;
    return coords;
}
