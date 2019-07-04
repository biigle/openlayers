import turfDifference from '@turf/difference';
import {polygon as turfPolygon} from '@turf/helpers';
import Feature from '../../Feature.js';
import Polygon from '../Polygon.js';

//order of polygons is important
export function difference(comparePolygon,currentPolygon) {
    var differencePolygon = turfDifference(comparePolygon,currentPolygon);
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
