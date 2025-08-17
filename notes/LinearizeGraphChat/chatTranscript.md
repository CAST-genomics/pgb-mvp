Awesome—thanks for the concrete integration notes. I’ll stick to **plain JavaScript**, your **Map-based node/edge stores**, and your **edge key** format:

```js
const edgeKey = (a, b) => `edge:${a}:${b}`;   // a,b are your *canonical* node ids
```

Below are the three functions you asked for, plus small helpers. They:

* parse your JSON into a **bidirected, sign-aware** graph that makes **no DAG assumptions**,
* build **one walk per assembly key** (or per simple name like `"GRCh38"`), and
* **linearize** a chosen spine walk into length-true screen geometry for three.js.

They **return and consume your canonical node ids** and **your edge keys** throughout.

---

## 0) Tiny utilities

```js
// --- id & port helpers (follow your diagrams) ---
function parseSignedId(id) {
  const m = String(id).match(/^(.+?)([+-])$/);
  if (!m) throw new Error(`Node id "${id}" must end with + or -`);
  return { bare: m[1], sign: m[2] }; // '+' or '-'
}
// END if signs match, else START
function portForStartingNode(startingNode, nodeId) {
  return parseSignedId(startingNode).sign === parseSignedId(nodeId).sign ? "END" : "START";
}
function portForEndingNode(endingNode, nodeId) {
  return parseSignedId(endingNode).sign === parseSignedId(nodeId).sign ? "END" : "START";
}
// Your edge key
function edgeKeyOf(a, b) { return `edge:${a}:${b}`; }
// numeric ordering convenience (for tie-breaks)
function num(id){ return Number(parseSignedId(id).bare); }
```

---

## 1) `createGraph(json)`

* Builds **Map nodes** (keyed by your **canonical** node ids found under `json.node`).
* Builds **Map edges** with your `edge:${start}:${end}` keys (using canonical ids).
* Builds **adjacency** (Map id → Array of neighbor ids) from edges (undirected view for traversal).
* Builds `index.byAssembly` to accelerate assembly lookups:

  * **simple names** (e.g., `"GRCh38"`)
  * **contig keys** `assembly_name|haplotype|sequence_id` (your “unique key”).

```js
function createGraph(json) {
  if (!json || typeof json !== "object") throw new Error("Bad JSON");

  const nodes = new Map();               // id -> nodeRec
  const edges = new Map();               // edgeKey(a,b) -> { a,b, variants:[...] }
  const adjSet = new Map();              // id -> Set(neighbor ids)
  const index = { byAssembly: new Map() };
  const seqObj = json.sequence || {};
  const nodeObj = json.node || {};
  const rawEdges = Array.isArray(json.edge) ? json.edge : [];

  // --- nodes (canonical ids are exactly the keys in json.node) ---
  for (const id in nodeObj) {
    const n = nodeObj[id];
    const { bare, sign } = parseSignedId(id);
    const assemblies = Array.isArray(n.assembly)
      ? n.assembly.map(a => a && a.assembly_name).filter(Boolean)
      : [];
    // also add full contig keys
    const contigKeys = Array.isArray(n.assembly)
      ? n.assembly.map(a => `${a.assembly_name}|${a.haplotype}|${a.sequence_id}`)
                   .filter(k => !k.includes("undefined"))
      : [];

    const seqLen = typeof seqObj[id] === "string" ? seqObj[id].length : undefined;
    const lengthBp = Number.isFinite(n.length) ? Number(n.length)
                   : Number.isFinite(seqLen) ? seqLen
                   : 0;

    const nodeRec = {
      id, sign, bareId: bare, lengthBp,
      assemblies: [...assemblies, ...contigKeys],   // both forms available for queries
      // You can keep ogdf here if you want it; topology does not use it.
    };
    nodes.set(id, nodeRec);
    adjSet.set(id, new Set());

    // build assembly index
    for (const key of nodeRec.assemblies) {
      if (!index.byAssembly.has(key)) index.byAssembly.set(key, new Set());
      index.byAssembly.get(key).add(id);
    }
  }

  // --- edges (canonicalize both endpoints to your node ids) ---
  rawEdges.forEach((e, i) => {
    const from = e.starting_node;
    const to   = e.ending_node;
    if (!nodes.has(from) || !nodes.has(to)) {
      console.warn(`Skipping edge[${i}] due to missing endpoint(s): ${from} or ${to}`);
      return;
    }
    const ek = edgeKeyOf(from, to);                   // your key, keeps raw direction
    if (!edges.has(ek)) edges.set(ek, { a: from, b: to, variants: [] });
    edges.get(ek).variants.push({
      rawIndex: i,
      from, to,
      fromPort: portForStartingNode(from, from),
      toPort:   portForEndingNode(to, to)
    });
    // undirected adjacency for traversal
    adjSet.get(from).add(to);
    adjSet.get(to).add(from);
  });

  // freeze adjacency to arrays
  const adj = new Map();
  for (const [id, set] of adjSet) adj.set(id, Array.from(set));

  return { nodes, edges, adj, index };
}
```

---

## 2) `createAssemblyWalks(graph)`

Returns **one walk per assembly key** (both simple names and full contig keys).
Each walk may contain **multiple disjoint paths** if your window intersects that contig in several pieces.

> Design choice: we build the walk from the **induced subgraph on nodes that contain the key**, but we **select a single chain** inside that induced graph (so we ignore “chord” edges that produced the spurious GRCh38 branches).

### 2a) helpers

```js
function listAssemblyKeys(graph) {
  return Array.from(graph.index.byAssembly.keys()).sort();
}

// induced adjacency on a node set (Set of ids)
function inducedAdj(graph, nodeSet) {
  const out = new Map();
  for (const id of nodeSet) out.set(id, []);
  for (const id of nodeSet) {
    const nbrs = graph.adj.get(id) || [];
    for (const nb of nbrs) if (nodeSet.has(nb)) out.get(id).push(nb);
  }
  return out;
}

// connected components in an undirected adjacency Map<id, id[]>
function connectedComponents(indAdj) {
  const vis = new Set(), comps = [];
  for (const id of indAdj.keys()) {
    if (vis.has(id)) continue;
    const q=[id], comp=[];
    vis.add(id);
    while (q.length) {
      const v=q.shift(); comp.push(v);
      for (const w of indAdj.get(v)) if (!vis.has(w)) { vis.add(w); q.push(w); }
    }
    comps.push(comp);
  }
  return comps;
}

// choose a start node for a component: endpoint preferred; else lowest numeric id
function chooseStart(indAdj, comp) {
  let start = null;
  for (const id of comp) if ((indAdj.get(id)||[]).length === 1) { start = id; break; }
  if (!start) start = comp.slice().sort((a,b)=>num(a)-num(b))[0];
  return start;
}

// extract a single chain from an induced component (pragmatic "endpoint walk")
// If there is branching, prefer the neighbor with smaller degree (stays on chain).
function extractPath(indAdj, comp) {
  if (!comp.length) return [];
  const deg = new Map(comp.map(id => [id, (indAdj.get(id)||[]).length]));
  const start = chooseStart(indAdj, comp);
  const walk = [];
  const vis = new Set();
  let prev = null, cur = start;

  while (cur && !vis.has(cur)) {
    walk.push(cur); vis.add(cur);
    const cand = (indAdj.get(cur)||[]).filter(n => n !== prev && !vis.has(n));
    if (cand.length === 0) break;
    if (cand.length === 1) { prev = cur; cur = cand[0]; continue; }
    cand.sort((a,b) => (deg.get(a)||0) - (deg.get(b)||0) || (num(a)-num(b)));
    prev = cur; cur = cand[0];
  }
  return walk;
}
```

### 2b) main

```js
function createAssemblyWalk(graph, assemblyKey) {
  const nodeSet = graph.index.byAssembly.get(assemblyKey);
  if (!nodeSet || nodeSet.size === 0) {
    return { key: assemblyKey, paths: [], diagnostics: { inducedNodes:0, inducedEdges:0, warnings:["no nodes"] } };
  }
  const indAdj = inducedAdj(graph, nodeSet);

  // stats
  let inducedEdges = 0;
  for (const [id, nbrs] of indAdj) inducedEdges += nbrs.length;
  inducedEdges = Math.floor(inducedEdges/2);

  const comps = connectedComponents(indAdj);
  const paths = [];
  const warnings = [];

  for (const comp of comps) {
    const sub = new Map(comp.map(id => [id, indAdj.get(id)]));
    const nodes = extractPath(indAdj, comp);
    if (nodes.length === 0) continue;

    // edges on this path (your edge keys)
    const edgesOnPath = [];
    for (let i=0; i<nodes.length-1; i++) {
      const a = nodes[i], b = nodes[i+1];
      // prefer forward ek, fall back to reverse if only that exists
      const ekF = edgeKeyOf(a,b), ekR = edgeKeyOf(b,a);
      if (graph.edges.has(ekF)) edgesOnPath.push(ekF);
      else if (graph.edges.has(ekR)) edgesOnPath.push(ekR);
      else warnings.push(`No edge found between ${a} and ${b} for ${assemblyKey}`);
    }

    const bpLen = nodes.reduce((s,id)=>s + (graph.nodes.get(id)?.lengthBp || 0), 0);
    paths.push({ nodes, edges: edgesOnPath, leftEndpoint: nodes[0], rightEndpoint: nodes[nodes.length-1], bpLen });
  }

  return {
    key: assemblyKey,
    paths,
    diagnostics: { inducedNodes: nodeSet.size, inducedEdges, warnings }
  };
}

function createAssemblyWalks(graph, { keys=null } = {}) {
  const allKeys = keys ? keys : listAssemblyKeys(graph);
  return allKeys.map(k => createAssemblyWalk(graph, k));
}
```

> This “endpoint walk” is deterministic and works well for windows where the assembly’s induced graph is a near-chain (your case). If you later want the **block-cut** version (true path through biconnected components), I can add it as a drop-in replacement for `extractPath`.

---

## 3) `linearize(graph, spineWalk, opts)`

Length-true layout for one chosen spine (usually the GRCh38 walk you just computed).
Outputs **three.js‐friendly geometry** (only `THREE.Vector2`s) and **loop events**.

```js
function linearize(graph, spineWalk, {
  locusStartBp = 0,
  pxPerBp = 0.002,
  laneGapPx = 18,
  pillWidthPx = 8,
  epsilonBp = 5
} = {}) {
  // spineWalk.paths[0] should be the chain for the window
  const spineNodes = spineWalk?.paths?.[0]?.nodes || [];
  if (spineNodes.length === 0) return { spineSegments: [], loops: [] };

  const bpStart = new Map(), bpEnd = new Map();
  let acc = locusStartBp;
  for (const id of spineNodes) {
    bpStart.set(id, acc);
    const L = graph.nodes.get(id)?.lengthBp || 0;
    acc += L;
    bpEnd.set(id, acc);
  }
  const xPx = (bp) => (bp - locusStartBp) * pxPerBp;

  // three.js segments
  const spineSegments = spineNodes.map(id => ({
    id,
    bpStart: bpStart.get(id), bpEnd: bpEnd.get(id),
    v0: new THREE.Vector2(xPx(bpStart.get(id)), 0),
    v1: new THREE.Vector2(xPx(bpEnd.get(id)),   0),
    lenBp: graph.nodes.get(id)?.lengthBp || 0
  }));

  // Find detours (loops) between pairs of spine nodes that are *not consecutive on the spine*
  // Strategy: for each pair of spine neighbors (L,R) that have a **non-spine path** between them,
  // compute the shortest path confined to NON-spine nodes and emit one loop.
  const spineSet = new Set(spineNodes);
  const neighborMap = graph.adj;

  function shortestAltPath(L, R) {
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

  const loops = [];
  const pairSeen = new Set();
  for (let i=0; i<spineNodes.length; i++) {
    const L = spineNodes[i];
    // try links from L to any later spine node R that is directly adjacent (in the full graph) or via off-spine nodes
    for (let j=i+2; j<spineNodes.length; j++) { // skip immediate neighbor (that's the spine edge)
      const R = spineNodes[j];
      const key = `${L}|${R}`;
      if (pairSeen.has(key)) continue;

      // Is there *any* connection between L and R that doesn't use other spine nodes?
      const altNodes = shortestAltPath(L, R);
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

      const x0 = xPx(spanStart), x1 = xPx(spanEnd);
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
```

> Rendering: draw `spineSegments` as straight lines at `y=0`; for each loop, either sample its cubic Bézier into a polyline or use your own shader line. Everything already uses your node ids.

---

## End-to-end usage (minimal)

```js
// 1) Parse file
const graph = createGraph(json);

// 2) Build all walks (or pick specific keys)
const walks = createAssemblyWalks(graph);  // Array<{key, paths:[...]}>
// convenience: find the GRCh38 walk
const grch = walks.find(w => w.key === "GRCh38") || walks.find(w => w.key.startsWith("GRCh38|"));

// 3) Linearize GRCh38 (or any assembly) for display
const {spineSegments, loops} = linearize(graph, grch, {
    locusStartBp: json.locus_start || 0,    // if your JSON tracks it
    pxPerBp: 0.002,
    laneGapPx: 20,
    pillWidthPx: 8
});

// 4) Feed into your existing mesh builders (three.js)
// - Use your own materials/Line2, etc.
// - Edge ids on paths are available in each walk: walk.paths[i].edges (your edge keys)
```

---

## Notes / future upgrades

* The “endpoint walk” selection is deterministic and **ignores chord edges** that caused the apparent GRCh38 branching. If you hit a region where the induced component is a dense bubble, I can swap in a **block–cut (biconnected) decomposition** for `extractPath` to guarantee the unique path through articulation points.
* The `linearize` loop layering is simple; if you want **non-overlapping** lanes when events overlap on x, add the interval-packing step we discussed earlier.
* Everything you pass around—node ids and edge keys—uses **your canonical ids** and **your key format**.

If you want these packaged as ES modules or need tiny changes to match your file loader, say the word and I’ll refit the export style.
