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

    static createEdgeRect(startXYZ, endXYZ, lineMaterial) {

        // Calculate direction vector and length
        const direction = new THREE.Vector3().subVectors(endXYZ, startXYZ);
        direction.normalize();

        // Calculate perpendicular vector (90 degrees rotation in XY plane)
        const perpendicular = new THREE.Vector3(-direction.y, direction.x, 0);

        // Calculate the four corners of the rectangle
        const halfWidth = lineMaterial.linewidth / 2;
        const corners =
            [
                new THREE.Vector3().copy(startXYZ).addScaledVector(perpendicular, halfWidth),
                new THREE.Vector3().copy(startXYZ).addScaledVector(perpendicular, -halfWidth),
                new THREE.Vector3().copy(endXYZ).addScaledVector(perpendicular, -halfWidth),
                new THREE.Vector3().copy(endXYZ).addScaledVector(perpendicular, halfWidth)
            ];

        const vertices = [];
        for (const {x, y, z} of corners){
            vertices.push(x, y, z);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

        // Two triangles to form the rectangle
        geometry.setIndex([0, 1, 2, 0, 2, 3]);

        return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: lineMaterial.color, side: THREE.DoubleSide }));
    }

    static createNodeLine(nodeName, spline, divisionsMultiplier, zOffset, lineMaterial) {

        const divisions = Math.round(divisionsMultiplier * spline.points.length);

        const xyz = new THREE.Vector3();
        const xyzList = [];

        for (let i = 0; i < 1 + divisions; i++) {

            const t = i/divisions;
            spline.getPoint(t, xyz);

            // use zOffset to disambiguate node lines
            xyz.z = 2 * zOffset

            xyzList.push(xyz.x, xyz.y, xyz.z);
        }

        const lineGeometry = new LineGeometry();
        lineGeometry.setPositions(xyzList);

        const line = new Line2(lineGeometry, lineMaterial);
        line.userData = { nodeName }

        line.computeLineDistances();
        line.scale.set(1, 1, 1);

        return line;
    }
}

export default LineFactory;
