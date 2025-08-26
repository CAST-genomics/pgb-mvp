# How to Map Annotation Track to Assembly Walk

This document shows how to map a 1D gene-annotation track position (bp) to a moving dot on your pangenome graph, even when parts of the assembly walk traverse nodes in reverse (against neighbors). The approach is **piecewise strand-aware**: for each leg between two consecutive nodes, we detect the directed edge and, inside that node, flip the parametric direction `t∈[0,1]` when needed so the dot always follows arrow flow.

> Works with your Three.js `ParametricLine` subclass of `Line2`, which exposes `getPointAt(t) -> THREE.Vector3`.

---

## Overview

1. **Build legs** for the selected assembly walk and compute each leg’s local direction (`+1` if edge is `A→B`, `-1` if `B→A`).
2. **Precompute a bp index** over the spine nodes (their `[bpStart, bpEnd)` ranges) and assign an “inside-node direction” derived from incoming/outgoing leg.
3. **On mouse move**, binary-search the node by bp, derive oriented `t` (flip when dir = −1), and sample the node’s `ParametricLine` with `getPointAt(t)`.

---

## Inputs and assumptions

* You can obtain a **spine** for the chosen assembly with per-node bp ranges:

  ```js
  // example shape
  spine = {
    nodes: [
      { id: "2912+", bpStart: 12_345, bpEnd: 20_001 },
      { id: "2913-", bpStart: 20_001, bpEnd: 25_777 },
      // ...
    ]
  };
  ```

* You can obtain the **walk order** of node IDs for the assembly (non-branching):

  ```js
  walkNodes = ["2912+", "2913-", "2914+", /* ... */];
  ```

  > If your service supports it, run the global orientation pass (e.g., `directionPolicy: "edgeFlow"`) to eliminate whole-walk reversals before you compute legs.

* You can test for the existence of a **directed edge** between two nodes:

  ```js
  const hasDirectedEdge = (a, b) => edges.has(`edge:${a}:${b}`);
  ```

  Replace with whatever your graph index uses.

* You maintain a `Map<string, ParametricLine>` for the rendered nodes:

  ```js
  const nodeGeomMap = new Map();     // nodeId -> ParametricLine
  // ParametricLine must provide: getPointAt(t) -> THREE.Vector3
  ```

> Reminder: Your assembly key is a triple `assembly#haplotype#sequence_id`. Use the full key when requesting spine/walk.

---

## Code: Build Legs (direction per consecutive pair)

```js
/**
 * Build per-leg direction along a linear assembly walk.
 * dir = +1 if the directed edge is from -> to; -1 if to -> from; 0 if unknown.
 *
 * @param {string[]} walkNodes - node ids in walk order
 * @param {(a:string,b:string)=>boolean} hasDirectedEdge - predicate for directed edges
 * @returns {{from:string,to:string,dir:1|-1|0,edgeKey?:string}[]}
 */
function buildWalkLegs(walkNodes, hasDirectedEdge) {
  const legs = [];
  for (let i = 0; i < walkNodes.length - 1; i++) {
    const a = walkNodes[i];
    const b = walkNodes[i + 1];
    let dir = 0;
    let edgeKey;
    if (hasDirectedEdge(a, b)) { dir = +1; edgeKey = `${a}->${b}`; }
    else if (hasDirectedEdge(b, a)) { dir = -1; edgeKey = `${b}->${a}`; }
    else { dir = 0; edgeKey = undefined; }
    legs.push({ from: a, to: b, dir, edgeKey });
  }
  return legs;
}
```

---

## Code: Build the bp index (once per selection)

```js
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

/**
 * From spine nodes (with bpStart/bpEnd) and legs, produce a fast lookup index.
 * Inside-node direction is taken from incoming leg if present; else outgoing; else +1.
 *
 * @param {{nodes: {id:string,bpStart:number,bpEnd:number}[]}} spine
 * @param {{from:string,to:string,dir:1|-1|0}[]} legs
 * @returns {{
 *   idx: {id:string,bpStart:number,bpEnd:number,lengthBp:number,dir:1|-1}[],
 *   bpMin:number, bpMax:number
 * }}
 */
function buildBpIndex(spine, legs) {
  const nodes = spine.nodes.map(n => ({
    id: n.id,
    bpStart: n.bpStart,
    bpEnd: n.bpEnd,
    lengthBp: Math.max(0, (n.bpEnd ?? 0) - (n.bpStart ?? 0)),
  }));

  // Per-node "inside" direction (prefer incoming leg)
  const nodeDir = new Array(nodes.length).fill(+1);
  for (let i = 0; i < nodes.length; i++) {
    const incoming = (i > 0) ? legs[i - 1] : null;          // leg that ends at node i
    const outgoing = (i < legs.length) ? legs[i] : null;    // leg that starts at node i
    let d = incoming?.dir ?? outgoing?.dir ?? +1;
    nodeDir[i] = d >= 0 ? +1 : -1; // normalize 0 -> +1
  }

  const idx = nodes.map((n, i) => ({ ...n, dir: nodeDir[i] }));
  const bpMin = idx.length ? idx[0].bpStart : 0;
  const bpMax = idx.length ? idx[idx.length - 1].bpEnd : 0;
  return { idx, bpMin, bpMax };
}
```

---

## Code: Map `bp → { nodeId, t, dir, xyz }` (call on mouse move)

```js
/**
 * Locate cursor along the walk for a given bp.
 * Returns oriented t so motion inside node follows arrow direction.
 *
 * @param {number} bp
 * @param {{idx:{id:string,bpStart:number,bpEnd:number,lengthBp:number,dir:1|-1}[], bpMin:number, bpMax:number}} bpIndex
 * @param {Map<string, { getPointAt: (t:number)=>THREE.Vector3 }>} nodeGeomMap
 * @returns {{nodeId:string,t:number,dir:1|-1,xyz:THREE.Vector3}|null}
 */
function locateCursorOnWalk(bp, bpIndex, nodeGeomMap) {
  const { idx } = bpIndex;
  if (!idx.length) return null;

  // Clamp bp to [bpMin, bpMax)
  const first = idx[0];
  const last  = idx[idx.length - 1];
  if (bp < first.bpStart) bp = first.bpStart;
  if (bp >= last.bpEnd)   bp = (typeof Math.nextDown === "function")
    ? Math.nextDown(last.bpEnd)
    : last.bpEnd - 1e-9;

  // Binary search: find node with bpStart <= bp < bpEnd
  let lo = 0, hi = idx.length - 1, hit = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const n = idx[mid];
    if (bp < n.bpStart) hi = mid - 1;
    else if (bp >= n.bpEnd) lo = mid + 1;
    else { hit = mid; break; }
  }

  const n = idx[hit];
  const raw = n.lengthBp > 0 ? (bp - n.bpStart) / n.lengthBp : 0;  // un-oriented in [0,1]
  const dir = n.dir;                                               // +1 or -1
  const t   = (dir === +1) ? clamp01(raw) : clamp01(1 - raw);      // flip inside-node if reversed

  const line = nodeGeomMap.get(n.id);
  const xyz  = line?.getPointAt ? line.getPointAt(t) : null;

  return { nodeId: n.id, t, dir, xyz };
}
```

---

## Wiring it all together

```js
// 1) Fetch data for the selected assembly
const assemblyKey = "GRCh38#1#chrHSP90AA1"; // example; use your real triple
const { spine } = pangenomeService.getSpineFeatures(assemblyKey);
const { nodes: walkNodes } = pangenomeService.getAssemblyWalk(
  assemblyKey,
  { directionPolicy: "edgeFlow" } // optional but recommended
);

// 2) Build legs with your graph index
const hasDirectedEdge = (a, b) => graph.edges.has(`edge:${a}:${b}`);
const legs   = buildWalkLegs(walkNodes, hasDirectedEdge);

// 3) Build the bp index
const bpIndex = buildBpIndex(spine, legs);

// 4) Build (or already have) a Map of nodeId -> ParametricLine
// const nodeGeomMap = new Map([...]);

// 5) On gene-track hover:
function onGeneTrackHover(bp /* genomic position on the annotation track */) {
  const hit = locateCursorOnWalk(bp, bpIndex, nodeGeomMap);
  if (!hit) return;

  // Move the dot
  if (hit.xyz) dot.position.copy(hit.xyz);
  else {
    // Fallback: cache t and sample later if geometry not yet present
    // e.g., pendingSamples.push(hit)
  }

  // (Optional) UI affordances
  // tooltip.textContent = `${hit.nodeId}  ${hit.dir > 0 ? "→" : "←"}  t=${hit.t.toFixed(3)}`;
  // highlightNode(hit.nodeId, { reversed: hit.dir < 0 });
}
```

---

## Notes & options

* **Boundary smoothing.** To avoid a visual “snap” right at `bpEnd`, blend positions from the current and next node within a small epsilon (e.g., ±5 bp or ±1 px on your track).
* **Mode toggle.** Offer a switch:

  * *Follow walk order* (ignore legs; set all node `dir=+1`, dot always left→right), or
  * *Follow arrow flow* (use computed `dir` per node, as above).
* **Missing edges.** If neither `a→b` nor `b→a` exists, set leg `dir=0` and let `buildBpIndex` coerce to `+1` by default. You can also inherit the previous leg’s `dir` for continuity.
* **Zero-length nodes.** If `bpStart===bpEnd`, the node’s `t` is 0; you can still place the dot at the node’s preferred entry/center.
* **Performance.** Precompute is O(N). Hover lookups are O(log N) with tiny constants; if you keep the last hit index and search locally, you’ll get near O(1) amortized during smooth mouse motion.

---

## (Optional) Math.nextDown polyfill

```js
if (typeof Math.nextDown !== "function") {
  Math.nextDown = function (x) {
    if (!Number.isFinite(x)) return x;
    if (x === 0) return -Number.MIN_VALUE;
    const buffer = new ArrayBuffer(8);
    const view64 = new Float64Array(buffer);
    const view32 = new Uint32Array(buffer);
    view64[0] = x;
    // Little endian IEEE-754: decrement the 64-bit pattern
    if (x > 0) {
      if (view32[1] === 0) { view32[0]--; view32[1] = 0xFFFFFFFF; }
      else { view32[1]--; }
    } else {
      if (view32[1] === 0xFFFFFFFF) { view32[0]++; view32[1] = 0; }
      else { view32[1]++; }
    }
    return view64[0];
  };
}
```

---

## Summary

* **Leg directions** capture local arrow flow between consecutive nodes.
* **Bp index** enables fast mapping from a 1D annotation coordinate to the correct node.
* **Oriented `t`** flips inside reversed nodes so your dot always travels with the graph’s arrows—no matter how the assembly path mixes forward and reverse segments.

Drop these utilities into your app and you’ll have a crisp, strand-aware cursor that makes intuitive visual sense across all datasets.
