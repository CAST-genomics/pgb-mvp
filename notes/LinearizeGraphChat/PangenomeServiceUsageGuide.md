# PangenomeService — Usage Guide

This doc explains how to use the `PangenomeService` class to:

1. parse a pangenome JSON into a robust graph,
2. extract **assembly walks** (e.g., GRCh38), and
3. analyze the graph in **genomic space** to emit bubbles/pills/braids, ready for your renderer.

It’s plain JavaScript (no deps), uses your canonical node ids (e.g., `"2912+"`) and **edge keys** like `edge:start:end`, and makes **no DAG assumptions**.

---

## 1) Data contract (input JSON)

Minimal fields expected (names match what you’ve shown):

```json5
{
  "node": {
    "2912+": {
      "length": 123,                    // optional if sequence is present
      "assembly": [
        {
          "assembly_name": "GRCh38",
          "haplotype": "H1",
          "sequence_id": "chr1"
        }
      ]
    },
    "294049+": { /* ... */ }
  },
  "edge": [
    { "starting_node": "2912+", "ending_node": "2913+" },
    { "starting_node": "2912+", "ending_node": "294049+" }
  ],
  "sequence": {
    "2912+": "ACGT...",                // optional; length inferred from here if present
    "294049+": "..."                   // ids include +/− orientation
  }
}
```

**Notes**

* Node ids **must** end in `+` or `-` (orientation).
* Node length is taken from `node[id].length` or, if omitted, from `sequence[id].length`; else `0`.
* `node[id].assembly` is used to index nodes by assembly and by a more specific “contig key”:
  `assembly_name|haplotype|sequence_id`.

---

## 2) Install / import

Place `PangenomeService.js` in your project and import it:

```js
import PangenomeService from "./PangenomeService.js";
```

---

## 3) Quick start

```js
// 1) Build the graph
const svc = new PangenomeService(json);  // or: const svc = new PangenomeService(); svc.createGraph(json);

// 2) Inspect available assemblies (keys include both assembly names and contig keys)
console.log(svc.listAssemblyKeys());

// 3) Extract the GRCh38 walk
const grch = svc.createAssemblyWalk("GRCh38", { mode: "auto" });
console.log(grch.paths[0]?.nodes.length, "spine nodes");

// 4) Assess features (kitchen-sink defaults)
const features = svc.assessGraphFeatures(grch, {
  includeAdjacent: true,
  includeUpstream: true,
  allowMidSpineReentry: true,
  includeDangling: true,
  includeOffSpineComponents: true,
  maxPathsPerEvent: 8
});

// 5) Hand `features` to your renderer
//    - features.spine.nodes[].{bpStart,bpEnd} → length-true x positions
//    - features.events[*] → pills/bubbles/braids + alt paths + regions
```

---

## 4) API Reference

### `new PangenomeService(json?)`

Constructs the service; if `json` is provided, calls `createGraph(json)`.

### `createGraph(json) -> graph`

Parses your JSON into:

* `nodes: Map<string, NodeRec>` where `NodeRec` contains:

  * `id`, `sign`, `bareId`, `lengthBp`, `assemblies: string[]`, optional `seq`
* `edges: Map<string, EdgeRec>` keyed `edge:${a}:${b}`, where `EdgeRec = { a, b, variants: [...] }`
* `adj: Map<string, string[]>` (undirected neighbor lists)
* `index.byAssembly: Map<string, Set<nodeId>>`

Returns the `graph` and stores it on `svc.graph`.

### `listAssemblyKeys() -> string[]`

All assembly keys known to the graph (both assembly names and contig keys).

### `createAssemblyWalk(key, { mode }) -> Walk`

Extracts a **single** walk for the given key.
`mode`: `"auto"` (default) | `"endpoint"` | `"blockcut"`

Returns:

```js
{
  key,
  paths: [{
    nodes: string[],
    edges: string[],                 // your `edge:a:b` keys
    leftEndpoint: string,
    rightEndpoint: string,
    bpLen: number,
    modeUsed: "endpoint"|"blockcut"
  }],
  diagnostics: { inducedNodes, inducedEdges, modeUsed: string|null, warnings: string[] }
}
```

### `createAssemblyWalks({ keys?, mode? }) -> Walk[]`

Batch version. If `keys` omitted, runs on all assemblies.

### `assessGraphFeatures(spineWalk, opts) -> { spine, events, offSpine }`

Analyzes the graph relative to a provided **spine** (typically GRCh38).
Returns:

```js
{
  spine: {
    assemblyKey: string,
    nodes: [{ id, bpStart, bpEnd, lenBp }],
    edges: string[],
    lengthBp: number
  },

  events: [{
    id: "L~R" | "L~null",
    type: "pill"|"simple_bubble"|"parallel_bundle"|"braid"|"dangling",

    anchors: {
      leftId: string,
      rightId: string|null,          // null for dangling
      spanStart: number,             // bp on reference (x position start)
      spanEnd: number,               // bp on reference (x position end)
      refLenBp: number,              // spanEnd - spanStart (0 for pills)
      orientation: "forward"|"upstream"|"pill"|"dangling",

      // true spine coords for anchor nodes
      leftBpStart: number, leftBpEnd: number,
      rightBpStart: number|null, rightBpEnd: number|null
    },

    region: {
      nodes: string[],               // off-spine nodes in the detour region
      edges: string[],               // off<->off edges (unique)
      anchorEdges: string[],         // off<->spine edges (anchors & mid-spine if allowed)
      truncated: boolean
    },

    // off-spine alternative routes only (spine hop is filtered out)
    paths: [{
      nodes: string[],
      edges: string[],
      altLenBp: number,              // sum of interior node lengths
      altPathLenBp: number,          // same as altLenBp
      nodesDetailed: [{
        id: string,
        isSpine: boolean,
        lenBp: number,
        altStartBp: number, altEndBp: number, // cumulative along alt path (0..altLenBp)
        refBpStart: number, refBpEnd: number  // projected along [spanStart,spanEnd]
      }]
    }],

    stats: {
      nPaths: number,
      minAltLenBp: number, maxAltLenBp: number,
      truncatedPaths: boolean,
      removedSpineLeg: boolean       // true if the trivial L↔R hop was removed
    },

    relations: {
      parentId: string|null,         // nesting (contains)
      childrenIds: string[],         // nested loops inside this loop
      overlapGroup: number|null,     // overlapping siblings (braids)
      sameAnchorGroup: number|null   // parallel detours sharing identical (L,R)
    }
  }],

  offSpine: [{ nodes: string[], edges: string[], size: number }]
}
```

---

## 5) Option cheat sheet (analyzer)

Discovery toggles:

* `includeAdjacent` (default **true**): include **pills** (adjacent anchors).
* `includeUpstream` (default **true**): include mirror `(R,L)` events too (can dedupe; see §8).
* `allowMidSpineReentry` (default **true**): allow detours to touch mid-spine nodes between anchors (richer **braids**).
* `includeDangling` (default **true**): emit events that don’t rejoin in the window (`rightId: null`).
* `includeOffSpineComponents` (default **true**): report background islands not touching the spine.

Path sampling & safety:

* `maxPathsPerEvent` (default **8**): number of **edge-disjoint** alt paths to record.
* `maxRegionNodes / maxRegionEdges`: caps to keep pathological regions in check; set higher for deep inspection.

---

## 6) Rendering recipes (bp → pixels & lanes)

### 6.1 Map base pairs to x-pixels

```js
function makeBpScaler({ locusStartBp, pxPerBp }) {
  return (bp) => (bp - locusStartBp) * pxPerBp;
}
const x = makeBpScaler({ locusStartBp: features.spine.nodes[0].bpStart, pxPerBp: 0.5 });
```

* **Spine segment** `[bpStart, bpEnd]` → draw a bar from `x(bpStart)` to `x(bpEnd)`.
* **Loop/pill span** `[spanStart, spanEnd]` → arc from `x(spanStart)` to `x(spanEnd)`.
  For **pills** (`spanStart==spanEnd`), apex sits at that single x.

### 6.2 Pack events into non-overlapping lanes (for arcs)

```js
// Greedy interval packing; returns lane index per event id
function packIntervals(events) {
  const spans = events
    .filter(e => e.anchors.rightId) // exclude dangling
    .map(e => ({ id: e.id,
                 start: Math.min(e.anchors.spanStart, e.anchors.spanEnd),
                 end: Math.max(e.anchors.spanStart, e.anchors.spanEnd) }))
    .sort((a,b)=> a.start - b.start || a.end - b.end);

  const lanes = [];                 // each lane: lastEndBp
  const laneOf = new Map();
  for (const s of spans) {
    let lane = 0;
    while (lane < lanes.length && lanes[lane] > s.start) lane++;
    if (lane === lanes.length) lanes.push(-Infinity);
    lanes[lane] = s.end;
    laneOf.set(s.id, lane);
  }
  return laneOf;
}
const laneOf = packIntervals(features.events);
```

### 6.3 What to draw

* **Spine**: `features.spine.nodes` as length-true segments (pink).
* **Loops/braids**: one arc per `event` with `anchors.rightId != null`. Use `laneOf.get(event.id)` to stack.

  * Color by `event.type` or by `altLenBp - refLenBp`.
  * Badge: `event.stats.nPaths` if `>1`.
* **Pills**: same arc API; `spanStart==spanEnd`. Use `paths[0].altLenBp` to scale a visual width/height if you like.
* **Alt nodes along a path**: use `paths[*].nodesDetailed[].refBpStart/refBpEnd` to place sub-segments precisely.

---

## 7) Performance tips

* Start with `maxPathsPerEvent: 3–5` for interactivity; raise to 8+ for analysis.
* If you see many “braids” and you want a simpler picture, run with `allowMidSpineReentry:false`.
* Keep `includeUpstream:true` for completeness; if you don’t dedupe (below), it doubles adjacent-anchor pills.

---

## 8) Common gotchas & quick fixes

**Duplicate pills (forward vs upstream)**
With `includeUpstream:true`, adjacent anchors `(L,R)` and `(R,L)` both appear. To keep just one per junction:

```js
function dedupeMirrorEvents(features) {
  const idx = new Map(); // `${min(i,j)}|${max(i,j)}` -> kept id
  const chainIndex = new Map(features.spine.nodes.map((n,i)=>[n.id,i]));
  const keep = [];
  for (const e of features.events) {
    if (!e.anchors.rightId) { keep.push(e); continue; }
    const i = chainIndex.get(e.anchors.leftId);
    const j = chainIndex.get(e.anchors.rightId);
    const key = `${Math.min(i,j)}|${Math.max(i,j)}`;
    if (!idx.has(key)) { idx.set(key, e.id); keep.push(e); }
  }
  return { ...features, events: keep };
}
```

**“No paths” on a pill**
Check `event.region.anchorEdges`—those are the off↔spine edges touching anchors.
Paths are off-spine only and the trivial spine hop is filtered, so make sure an actual off node exists between anchors (it’ll be in `region.nodes`).

**Orientation & sequence**
Node ids end with `+`/`-`. If you reconstruct sequences for alt paths, reverse-complement interior nodes with `-`.

---

## 9) End-to-end example (typical flow)

```js
import PangenomeService from "./PangenomeService.js";

const svc = new PangenomeService(json);

const grch = svc.createAssemblyWalk("GRCh38", { mode: "auto" });
const features = svc.assessGraphFeatures(grch, {
  includeAdjacent: true,
  includeUpstream: true,
  allowMidSpineReentry: true,
  includeDangling: true,
  includeOffSpineComponents: true,
  maxPathsPerEvent: 5
});

// Optional: dedupe mirror pills
// const featuresClean = dedupeMirrorEvents(features);

const px = makeBpScaler({ locusStartBp: features.spine.nodes[0].bpStart, pxPerBp: 0.4 });
const lanes = packIntervals(features.events);

// Render spine
for (const n of features.spine.nodes) {
  drawSpineSegment(px(n.bpStart), px(n.bpEnd)); // your three.js mesh factory
}

// Render events
for (const e of features.events) {
  if (!e.anchors.rightId) { drawDangling(px(e.anchors.spanStart)); continue; }
  const lane = lanes.get(e.id) || 0;
  const x0 = px(Math.min(e.anchors.spanStart, e.anchors.spanEnd));
  const x1 = px(Math.max(e.anchors.spanStart, e.anchors.spanEnd));
  drawArc(x0, x1, lane, { kind: e.type, nPaths: e.stats.nPaths }); // your geometry
}
```

---

## 10) FAQ

* **Why is something a `braid` vs `simple_bubble`?**
  Because its interval **overlaps** another loop or **contains/is contained by** one. See `relations.*`.

* **Where are the grey (off-spine) nodes?**
  Per event: `region.nodes` (all), plus `paths[*].nodes` (only those used by sampled alt routes).

* **How do I place an off-spine node on the x-axis?**
  Use `paths[*].nodesDetailed[].refBpStart/refBpEnd` (projection in bp).

---

That’s it! If you want a companion “Dev Notes” doc (design goals, invariants, and test fixtures), I can draft that too.
