import * as THREE from 'three';

function linearize(graph, walk, {
    locusStartBp = 0,
    pxPerBp = 0.002,
    laneGapPx = 18,
    pillWidthPx = 8,
    epsilonBp = 5
} = {}) {

  // spineWalk.paths[0] should be the chain for the window
  const nodes = walk?.paths?.[0]?.nodes || [];
  if (nodes.length === 0) return { spineSegments: [], loops: [] };

  const bpStart = new Map();
  const bpEnd = new Map();

  let acc = locusStartBp;
  for (const node of nodes) {
    bpStart.set(node, acc);
    const L = graph.nodes.get(node)?.lengthBp || 0;
    acc += L;
    bpEnd.set(node, acc);
  }


  // three.js segments
  const spineSegments = nodes.map(id => ({
    id,
    bpStart: bpStart.get(id),
      bpEnd: bpEnd.get(id),
    v0: new THREE.Vector2(xPixels(bpStart.get(id), locusStartBp, pxPerBp), 0),
    v1: new THREE.Vector2(xPixels(bpEnd.get(id, locusStartBp, pxPerBp)),   0),
    lenBp: graph.nodes.get(id)?.lengthBp || 0
  }));

  // Find detours (loops) between pairs of spine nodes that are *not consecutive on the spine*
  // Strategy: for each pair of spine neighbors (L,R) that have a **non-spine path** between them,
  // compute the shortest path confined to NON-spine nodes and emit one loop.
  const spineSet = new Set(nodes);
  const neighborMap = graph.adj;

  const loops = [];
  const pairSeen = new Set();
  for (let i=0; i<nodes.length; i++) {
    const L = nodes[i];
    // try links from L to any later spine node R that is directly adjacent (in the full graph) or via off-spine nodes
    for (let j=i+2; j<nodes.length; j++) { // skip immediate neighbor (that's the spine edge)
      const R = nodes[j];
      const key = `${L}|${R}`;
      if (pairSeen.has(key)) continue;

      // Is there *any* connection between L and R that doesn't use other spine nodes?
      const altNodes = shortestAltPath(L, R, neighborMap, spineSet);
      if (!altNodes) continue;

      pairSeen.add(key);

      const spanStart = bpEnd.get(L);
      const spanEnd   = bpStart.get(R);
      const refLenBp  = Math.max(0, spanEnd - spanStart);
      const altLenBp  = altNodes.reduce((s,id)=>s + (graph.nodes.get(id)?.lengthBp || 0), 0);

      // classify for vertical placement
      const delta = altLenBp - refLenBp;
      let sign = 0;
      if (delta > +epsilonBp) sign = +1;
      else if (delta < -epsilonBp) sign = -1;
      else sign = (loops.length % 2 ? -1 : +1); // neutral: alternate up/down

      const lane = loops.length; // simple layering; you can replace with interval packing later
      const apex = sign * (Math.floor(lane/2)+1) * laneGapPx;

      const x0 = xPixels(spanStart), x1 = xPixels(spanEnd);
      const pill = (refLenBp === 0);
      const mid = pill ? (x0 + pillWidthPx*0.5) : (x0 + (x1-x0)/2);

      const p0 = new THREE.Vector2(x0, 0);
      const p1 = new THREE.Vector2(pill ? x0 + pillWidthPx : x1, 0);
      const c0 = new THREE.Vector2(mid, apex);
      const c1 = new THREE.Vector2(mid, apex);

      loops.push({
        id: `${L}~${R}`,
        leftId: L, rightId: R,
        spanStart, spanEnd, refLenBp, altLenBp,
        apex, lane, pill,
        bezier: [p0,c0,c1,p1]
      });
    }
  }

  return { spineSegments, loops };
}

function shortestAltPath(L, R, neighborMap, spineSet) {
    // BFS from neighbors of L that are not on the spine, stopping at R
    const q = [];
    const prev = new Map();
    for (const nb of neighborMap.get(L) || []) {
        if (spineSet.has(nb)) continue;
        q.push(nb); prev.set(nb, L);
    }
    const seen = new Set([L]);
    while (q.length) {
        const v = q.shift();
        if (seen.has(v)) continue;
        seen.add(v);
        if (v === R) {
            // rebuild nodes excluding L (we include R)
            const path = [R];
            let cur = prev.get(R);
            while (cur && cur !== L) { path.push(cur); cur = prev.get(cur); }
            path.reverse();
            return path; // nodes *between* L and R (may be empty)
        }
        for (const w of neighborMap.get(v) || []) {
            if (spineSet.has(w) && w !== R) continue; // don't re-enter spine except at R
            if (!prev.has(w)) prev.set(w, v);
            q.push(w);
        }
    }
    return null;
}


function xPixels(bp, locusStartBp, pxPerBp) {
    return (bp - locusStartBp) * pxPerBp;
}
export { linearize }
