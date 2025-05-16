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

        line.renderOrder = 2

        return line;
    }

    static createEdgeRect(startXYZ, endXYZ, material, nodeNameStart, nodeNameEnd) {
        // Calculate direction vector and length
        const direction = new THREE.Vector3().subVectors(endXYZ, startXYZ);
        direction.normalize();

        // Calculate perpendicular vector (90 degrees rotation in XY plane)
        const perpendicular = new THREE.Vector3(-direction.y, direction.x, 0);

        // Calculate the four corners of the rectangle
        const halfWidth = 16; // Fixed width of 16 units (half on each side)
        const corners = [
            new THREE.Vector3().copy(startXYZ).addScaledVector(perpendicular, halfWidth),
            new THREE.Vector3().copy(startXYZ).addScaledVector(perpendicular, -halfWidth),
            new THREE.Vector3().copy(endXYZ).addScaledVector(perpendicular, -halfWidth),
            new THREE.Vector3().copy(endXYZ).addScaledVector(perpendicular, halfWidth)
        ];

        const vertices = [];
        const uvs = [];

        // Add vertices and corresponding UVs
        // UV coordinates for a rectangle that will stretch the texture along the length
        uvs.push(0, 0); // bottom left
        vertices.push(corners[0].x, corners[0].y, corners[0].z);

        uvs.push(0, 1); // top left
        vertices.push(corners[1].x, corners[1].y, corners[1].z);

        uvs.push(1, 1); // top right
        vertices.push(corners[2].x, corners[2].y, corners[2].z);

        uvs.push(1, 0); // bottom right
        vertices.push(corners[3].x, corners[3].y, corners[3].z);

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

        // Two triangles to form the rectangle
        geometry.setIndex([0, 1, 2, 0, 2, 3]);

        const mesh = new THREE.Mesh(geometry, material)

        mesh.userData = { nodeNameStart, nodeNameEnd }

        mesh.renderOrder = 2

        return mesh;
    }

    static createNodeLine(nodeName, assembly, spline, divisionsMultiplier, zOffset, lineMaterial) {
        // Calculate number of divisions
        const divisions = Math.round(divisionsMultiplier * spline.points.length);

        // Sample the spline with getPoints (returns an array of Vector3)
        const points = spline.getPoints(divisions);

        // Set z for each point to 2 * zOffset
        for (const point of points) {
            point.z = 2 * zOffset
        }

        // Flatten the points into an array of xyz
        const xyzList = points.flatMap(p => [p.x, p.y, p.z]);

        const lineGeometry = new LineGeometry();
        lineGeometry.setPositions(xyzList);

        const line = new Line2(lineGeometry, lineMaterial);
        line.userData = { nodeName, assembly }

        line.renderOrder = 4

        line.computeLineDistances();
        line.scale.set(1, 1, 1);

        return line;
    }
}

export default LineFactory;
