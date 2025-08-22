import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import * as THREE from "three"

class LineFactory {

    /**
     * Create node line geometry without material
     */
    static createNodeLineGeometry(spline, divisions, zOffset = 0) {

        // Sample the spline with getPoints (returns an array of Vector3)
        const points = spline.getPoints(divisions)

        // Set z for each point to zOffset (like the original createNodeLine method)
        for (const point of points) {
            point.z = zOffset;
        }

        // Flatten the points into an array of xyz for LineGeometry
        const xyzList = points.flatMap(p => [p.x, p.y, p.z]);

        // Create LineGeometry (not BufferGeometry) for Line2 compatibility
        const lineGeometry = new LineGeometry();
        lineGeometry.setPositions(xyzList)
        lineGeometry.userData.xyzStart = xyzList.slice()
        lineGeometry.userData.xyzEnd = xyzList.slice()

        // Diagnostics
        // const expectPoints = `Expected points: ${ points.length }`
        // const number = lineGeometry.attributes.instanceStart.count
        // const lineSegments = `Line segments: ${ number }`
        // const inferredPoints = `Points inferred from line segments: ${ 1 + number }`
        // console.log(`${expectPoints} ${lineSegments} ${inferredPoints}`)

        return lineGeometry;
    }
    /**
     * Create edge rectangle geometry without material (for texture mapping)
     */
    static createEdgeRectGeometry(startXYZ, endXYZ) {
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

        return geometry;
    }
}

function buildArcLengthTable(line2){
    const g = line2.geometry;
    const starts = g.attributes.instanceStart; // per-segment A
    const ends   = g.attributes.instanceEnd;   // per-segment B
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    const segLen = new Float32Array(starts.count);
    const cum = new Float32Array(starts.count + 1);
    let acc = 0; cum[0] = 0;
    for (let i = 0; i < starts.count; i++){
        a.fromBufferAttribute(starts, i);
        b.fromBufferAttribute(ends,   i);
        const L = a.distanceTo(b);
        segLen[i] = L;
        acc += L;
        cum[i + 1] = acc;
    }
    return { segLen, cum, total: acc };
}

function fixedSplineDivisions(spline, divisions) {
    return divisions
}

function adaptiveSplineDivisions(spline, multiplier) {
    return Math.round(multiplier * spline.points.length)
}

export { fixedSplineDivisions, adaptiveSplineDivisions, buildArcLengthTable }
export default LineFactory;
