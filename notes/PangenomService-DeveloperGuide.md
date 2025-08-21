# PangenomeService — Developer Guide

This document explains the `PangenomeService` class, its public surface, result shapes, and the key helper methods that power it. It’s written for engineers integrating the service into a three.js–based pangenome viewer.

---

## Overview

`PangenomeService` ingests your graph JSON and provides three big capabilities:

1. **Graph construction & indexing**
   Parses nodes/edges and builds adjacency and assembly indexes.

2. **Assembly walks**
   Extracts one or more simple paths (walks) for a chosen assembly key.
   Keys may be written as either `name#hap#seq` **or** `name|hap|seq`.

3. **Feature assessment (“linearizer input”)**
   Given a spine walk, detects **events** relative to that spine (pills, bubbles, braids, dangling), computes true **bp** for spine nodes, and returns projected bp for off-spine paths suitable for linear rendering. Optional **shallow nesting** finds events *inside* events.

---

## Data model (internal, summarized)

* `graph.nodes: Map<nodeId, { id, sign, bareId, lengthBp, assemblies[], seq? }>`
* `graph.edges: Map<edgeKey, { a, b, variants[] }>` where `edgeKey = "edge:a:b"`
* `graph.adj: Map<nodeId, nodeId[]>` (undirected view for traversal)
* `graph.index.byAssembly: Map<assemblyKey, Set<nodeId>>`

> Node ids include orientation (`…+` / `…-`). Node lengths come from `node.length` or the sequence length if provided.

---

## Typical lifecycle

```js
import PangenomeService from "./PangenomeService.js";

// 1) Build graph
const svc = new PangenomeService(json);

// 2) Choose a spine (assembly) and extract its walk
const walk = svc.createAssemblyWalk("GRCh38#0#chr1", { mode: "auto" });
const spinePath = walk.paths.reduce((a,b) => (a?.bpLen||0) > b.bpLen ? a : b, null);
const spineWalk = { key: walk.key, paths: spinePath ? [spinePath] : [] };

// 3) Assess features (forward only, with optional nesting)
const features = svc.assessGraphFeatures(spineWalk, {
  includeAdjacent: true,
  includeUpstream: false,          // forward-only events
  allowMidSpineReentry: true,
  includeDangling: true,
  includeOffSpineComponents: true,
  nestRegions: "shallow",          // turn on nested events (or "none")
  maxPathsPerEvent: 5
});

// 4) Prime tooltip bp lookups
svc.setActiveSpine(features.spine);

// 5) Render spine + events
render(features);
```

---

## Public API

### `new PangenomeService(json?)`

Optionally parse on construction. You can also call `createGraph` later.

---

### `createGraph(json) → graph`

Builds the internal graph and indexes.

* **Nodes** are indexed by id; assemblies are indexed under both `name#hap#seq` and `name|hap|seq`.
* **Edges** are stored in both directions in `adj` (undirected view) for traversal.
* Returns `{ nodes, edges, adj, index }` for convenience.

---

### `listAssemblyKeys() → string[]`

Returns all assembly keys seen in node annotations (sorted). Accepts both `#` and `|` formats.

---

### `createAssemblyWalk(key, { mode = "auto" } = {}) → { key, paths[], diagnostics }`

Extracts one simple path **per keyed connected component** of the induced subgraph for `key`.

* `paths[i] = { nodes[], edges[], leftEndpoint, rightEndpoint, bpLen, modeUsed }`
* `mode`:

  * `"auto"` – chooses between `"endpoint"` and `"blockcut"` per component (fast + robust).
  * `"endpoint"` – greedy from degree-1 endpoints (or farthest-pair heuristic).
  * `"blockcut"` – uses a block–cut (biconnected) decomposition to traverse via blocks.
* **Robustness**: tiny/degenerate components, singletons, and small cycles all produce a usable path.

> Use the **longest** path as your spine (most common), or iterate the `paths` array if you want one linear view per component.

---

### `createAssemblyWalks({ keys?, mode = "auto" } = {}) → walk[]`

Convenience to create walks for many assemblies at once.

---

### `assessGraphFeatures(spineWalk, options) → { spine, events[], offSpine[] }`

Core analyzer for linearization.

#### Inputs

`spineWalk` – usually `{ key, paths: [ { nodes[] } ] }`.

#### Options (most-used)

* `includeAdjacent` (default `true`) — include **pills** (adjacent-anchor insertions).
* `includeUpstream` (default `true`) — include **reverse** events (R→L mirrors). Set `false` for forward-only.
* `allowMidSpineReentry` (default `true`) — allow detours to touch intermediate spine nodes → richer **braids**.
* `includeDangling` (default `true`) — include branches that don’t rejoin the spine inside the window.
* `includeOffSpineComponents` (default `true`) — return components that never touch the spine (context only).
* `nestRegions` (default `"none"`) — set to `"shallow"` to emit **inner events** inside each event.
* `maxPathsPerEvent` (default `8`) — cap sampled alternative paths (edge-disjoint).
* `maxRegionNodes` `maxRegionEdges` — safety rails.
* `locusStartBp` (default `0`) — shift the x-origin (useful for stitching windows).

#### Output shape

**Spine**

```ts
spine: {
  assemblyKey: string,
  nodes: Array<{ id, bpStart, bpEnd, lenBp }>,  // true bp on current spine
  edges: string[],                               // "edge:a:b"
  lengthBp: number
}
```

**Events**
Each event is one locus on the spine and includes:

```ts
{
  id: "L~R" | "L~null",
  type: "pill" | "simple_bubble" | "parallel_bundle" | "braid" | "dangling",
  anchors: {
    leftId: string,
    rightId: string | null,
    spanStart: number,             // on spine
    spanEnd: number,               // on spine
    refLenBp: number,              // spanEnd - spanStart (0 for pills)
    orientation: "forward" | "upstream" | "pill" | "dangling",
    leftBpStart, leftBpEnd,        // true bp of L node on spine
    rightBpStart?, rightBpEnd?     // true bp of R node on spine (if any)
  },
  region: {
    nodes: string[],               // off-spine nodes reachable for this anchor pair
    edges: string[],               // off<->off edges in region (unique)
    anchorEdges: string[],         // off<->spine edges inside region
    truncated: boolean             // exceeded safety rails
  },
  paths: Array<{
    nodes: string[],               // a sampled off-spine alternative
    edges: string[],               // edge keys for that path
    altLenBp: number,              // sum of interior node lengths
    altPathLenBp: number,          // same as altLenBp (explicit)
    nodesDetailed: Array<{
      id: string,
      isSpine: boolean,
      lenBp: number,
      altStartBp: number, altEndBp: number,  // in alt path space
      refBpStart: number, refBpEnd: number   // **projected** into [spanStart,spanEnd] (or true for mid-spine segments)
    }>
  }>,
  stats: {
    nPaths, minAltLenBp, maxAltLenBp,
    truncatedPaths: boolean,
    removedSpineLeg: boolean        // indicates an L–R direct spine hop was filtered
  },
  relations: {
    parentId: string | null,        // nesting by containment on the spine
    childrenIds: string[],          // …
    overlapGroup: number | null,    // events that overlap but neither contains the other
    sameAnchorGroup: number | null  // multiple alternatives with the same L,R
  },
  // present only when nestRegions === "shallow"
  innerEvents?: Event[]             // children events inside this event’s span/oval
}
```

**offSpine**

```ts
offSpine: Array<{ nodes: string[], edges: string[], size: number }>
```

Components that never touch the spine in the current window (context only).

#### Guarantees & fixes in this build

* Edge-disjoint path sampling with **mutable** adjacency and duplicate guards (no repeated identical paths).
* Robust walk extraction (endpoint/blockcut), including singletons/cycles.
* Events are deduped by anchor direction; set `includeUpstream:false` to drop reverse mirrors at source.

---

### `setActiveSpine(spine) → assemblyKey | null`

Loads the analyzer’s spine node bp into internal maps so tooltips can do O(1) lookups. Call with `features.spine`.

---

### `getBpExtent(nodeId) → { bpStart, bpEnd, onSpine:true, projected:false } | null`

Returns **true bp** for a node **on the currently active spine** (set via `setActiveSpine`). Returns `null` for off-spine nodes.

---

### `indexWalkBpExtents(walk) → Map<nodeId, { bpStart, bpEnd }>`

Convenience to precompute bp extents for an arbitrary walk (independent of `setActiveSpine`).

---

### `getProjectedBpInEvent(nodeId, event) → { bpStart, bpEnd, onSpine, projected } | null`

Returns **projected** bp for a node that appears inside a specific `event.paths[].nodesDetailed`.
If the node is actually a spine segment included mid-path, returns its **true** bp with `projected:false`.

---

### `getAnyBpExtent(nodeId, features) → { bpStart, bpEnd, … } | null`

Tries `getBpExtent` first (true on-spine bp). If absent, scans `features.events` and returns the first **projected** match; else null. Useful for tooltips that work everywhere.

---

## Configuration patterns

**Forward-only events (no reverse mirrors)**

```js
const features = svc.assessGraphFeatures(spineWalk, { includeUpstream: false });
```

**Turn nesting on/off**

```js
// off (default)
svc.assessGraphFeatures(spineWalk, { nestRegions: "none" });

// on (shallow)
svc.assessGraphFeatures(spineWalk, { nestRegions: "shallow" });
```

**Keep linear picture simpler (no mid-spine reentry)**

```js
svc.assessGraphFeatures(spineWalk, { allowMidSpineReentry: false });
```

---

## Helper methods (internal mechanics)

> These are **not** part of the public surface, but understanding them helps when interpreting results or tuning behavior.

* `#requireGraph()` — throws if called before `createGraph`.
* `#edgeKeyOf(a,b)` — formats an edge key `edge:a:b`.
* `#parseSignedId(id)` / `#num(id)` — split `bareId` and sign; numeric sort key.
* `#inducedAdj(adj, allowSet)` — adjacency restricted to a subset of nodes.
* `#connectedComponents(indAdj)` — BFS components over induced adjacency.
* `#degreeMap(indAdj)` — degree per node in induced adjacency.
* `#chooseEndpoints(indAdj, comp)` — degree-1 (or farthest-pair) endpoints.
* `#extractPathEndpointWalk(indAdj, comp)` — greedy linearization from endpoints.
* `#biconnectedDecomposition(indAdj)` — Tarjan’s algorithm to find blocks and articulation points.
* `#buildBlockCutTree(blocks, articulation)` — block–cut tree for routing through complex components.
* `#blockOfVertex(blocks, v)` — find which block contains vertex `v`.
* `#bfsPath(indAdj, start, goal, allowSet?)` — plain BFS path (with optional allow set).
* `#extractPathBlockCut(indAdj, comp)` — route through blocks (falls back to BFS/endpoint on edge cases).
* `#decideMode(subAdj, comp)` — “auto” chooser (`endpoint` vs `blockcut`) with tiny/degenerate guards.
* **Nesting helpers (new):**

  * `_assessInnerForEvent(event, opts)` — build region-only subgraph, pick a local backbone, run the same analyzer, and return `innerEvents[]`.
  * `#makeSubgraph(nodeSet)` — create a standalone graph restricted to a set of nodes.
  * `#findLocalLoopThrough(regionNodes, L)` — best-effort cycle finder for pill regions.

---

## Rendering notes

* **Spine**: draw in bp space using `features.spine.nodes[].bpStart/bpEnd`.
* **Events**:

  * **Pills** (`refLenBp=0`): draw an oval at `spanStart`; use `paths[].altLenBp` or `nodesDetailed` to size/thicken.
  * **Bubbles/Parallel/Braid**: draw arcs from `spanStart`→`spanEnd`. Each `paths[k].nodesDetailed` comes with **projected** `refBpStart/refBpEnd` to place interior segments relative to the spine.
* **Nesting**: draw `event.innerEvents[]` **inside** the parent’s span/oval (same x-axis; thinner stroke).
* **Tooltips**: prefer `getBpExtent` (true spine bp); otherwise `getProjectedBpInEvent` or `getAnyBpExtent`.

---

## Performance tips

* Keep `maxPathsPerEvent` in the **3–5** range for interactive views; increase on demand when a user drills down.
* Leave `maxRegionNodes/Edges` at safe defaults for large windows; the `region.truncated` flag tells you when sampling stopped early.
* If you don’t need off-spine islands, set `includeOffSpineComponents:false`.

---

If you want this turned into a markdown file on the canvas or bundled with code examples for your team, say the word and I’ll drop it in as a shareable doc.
