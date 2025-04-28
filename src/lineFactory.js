import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import * as THREE from "three"

class LineFactory {

    static createEdgeLine(startXYZ, endXYZ, lineMaterial) {
        // Create array of positions for the line geometry
        const xyzList = [
            startXYZ.x, startXYZ.y, startXYZ.z,
            endXYZ.x, endXYZ.y, endXYZ.z
        ];

        // Create and configure the line geometry
        const lineGeometry = new LineGeometry();
        lineGeometry.setPositions(xyzList);

        // Create the line object
        const line = new Line2(lineGeometry, lineMaterial);

        // Set up the line properties
        line.computeLineDistances();
        line.scale.set(1, 1, 1);

        return line;
    }

    static createNodeLine(nodeName, spline, doRGBList, divisionsMultiplier, lineMaterial) {

        const divisions = Math.round(divisionsMultiplier * spline.points.length);
        // const divisions = 5;

        const xyz = new THREE.Vector3();
        const rgbList = [];
        const xyzList = [];

        for (let i = 0; i < 1 + divisions; i++) {

            const t = i/divisions;
            // console.log(`t: ${t}`);

            spline.getPoint(t, xyz);
            xyzList.push(xyz.x, xyz.y, xyz.z);

            if (true === doRGBList) {
                const color = new THREE.Color();
                color.setHSL(t, 1.0, 0.5, THREE.SRGBColorSpace);
                   rgbList.push(color.r, color.g, color.b);
            }

        }

        const lineGeometry = new LineGeometry();
        lineGeometry.setPositions(xyzList);

        if (true === doRGBList) {
            lineGeometry.setColors(rgbList);
        }

        const line = new Line2(lineGeometry, lineMaterial);
        line.userData = { nodeName }

        line.computeLineDistances();
        line.scale.set(1, 1, 1);

        return line;
    }
}

export default LineFactory;
