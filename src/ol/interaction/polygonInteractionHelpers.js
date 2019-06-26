import intersect from '@turf/intersect';
import union from '@turf/union';
import difference from '@turf/difference';
import {polygon as turfPolygon} from '@turf/helpers';
import {multiPolygon as turfMultiPolygon} from '@turf/helpers';
import {convertArea} from '@turf/helpers';
import booleanContains from '@turf/boolean-contains';
import booleanOverlap from '@turf/boolean-overlap';
import area from '@turf/area';
import Circle from '../geom/Circle.js';
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
//        var maxArea = 0;
        var maxAreaOL = 0;
        var maxPoly;
        for (var i = 0; i < differencePolygon.geometry.coordinates.length; i++) {
            var currentPolygon = turfPolygon(differencePolygon.geometry.coordinates[i]);
//            var polygonArea = area(currentPolygon);
            var olPoly = new Feature(new Polygon(differencePolygon.geometry.coordinates[i]))
            var olArea = olPoly.getGeometry().getArea()
//            console.log("OL Poly area:",olArea,"Max area:",maxOL)
//            console.log("Polygon Area:",polygonArea,"Max area:",maxArea);
            if (olArea > maxAreaOL) {
//                maxArea = polygonArea;
                maxAreaOL = olArea;
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
