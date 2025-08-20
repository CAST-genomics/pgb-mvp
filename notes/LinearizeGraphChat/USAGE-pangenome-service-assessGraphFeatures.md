Here’s the clean, correct way to call `assessGraphFeatures(...)` from your `PangenomeService`, with copy-paste JS snippets and the gotchas to avoid.

---

# How to call `assessGraphFeatures`

## 1) Build the graph (once per JSON)

```js
import PangenomeService from "./PangenomeService.js";

const svc = new PangenomeService(json);   // or: const svc = new PangenomeService(); svc.createGraph(json);
```

## 2) Choose a spine assembly and extract its walk

> `assessGraphFeatures` expects a **spine walk** object like the one returned by `createAssemblyWalk`.

```js
const key = "GRCh38";            // or "CHM13#0#chr1", "HG002#1#JAHKSE010000065.1", etc.
const walk = svc.createAssemblyWalk(key, { mode: "auto" });
```

### Pick the path you want to use as *the* spine

Many assemblies produce multiple connected components (multiple paths). Use the **longest** as the spine, or iterate them per-row.

**Longest only (most common):**

```js
const main = walk.paths.reduce((best, p) => (p.bpLen > (best?.bpLen||0) ? p : best), null);
const spineWalk = { key: walk.key, paths: main ? [main] : [] };
```

**All components (less common):**

```js
const featureSets = walk.paths.map(p => svc.assessGraphFeatures({ key: walk.key, paths: [p] }, opts));
```

## 3) Call `assessGraphFeatures(spineWalk, opts)`

```js
const opts = {
  // discovery toggles
  includeAdjacent: true,           // show pills (adjacent-anchor insertions)
  includeUpstream: true,           // include mirror (R,L) events; dedupe later if desired
  allowMidSpineReentry: true,      // allow detours to touch mid-spine nodes → richer braids
  includeDangling: true,           // show branches that don’t rejoin in-window
  includeOffSpineComponents: true, // report islands that never touch the spine (context)

  // path sampling & safety rails
  maxPathsPerEvent: 5,             // 3–5 for UI; up to 8+ for analysis
  maxRegionNodes: 5000,
  maxRegionEdges: 8000,

  // optional x-origin in bp (default 0)
  locusStartBp: 0
};

const features = svc.assessGraphFeatures(spineWalk, opts);
```

## 4) (Optional) Prime quick bp lookups for tooltips

```js
svc.setActiveSpine(features.spine);   // lets you call svc.getBpExtent(nodeId) later
```

## 5) Use the result

```js
// Spine (your x-axis)
for (const n of features.spine.nodes) {
  // n: { id, bpStart, bpEnd, lenBp }
  drawSpineSegment(n.bpStart, n.bpEnd);
}

// Events (pills, bubbles, braids, dangling)
for (const e of features.events) {
  // e.anchors: { leftId, rightId|null, spanStart, spanEnd, refLenBp, ... }
  // e.type: "pill" | "simple_bubble" | "parallel_bundle" | "braid" | "dangling"
  drawEventArcOrPill(e);
}

// Optional context: components that never touch the spine
for (const comp of features.offSpine) {
  drawFaintComponent(comp);
}
```

---

## Options you’ll actually tweak

* **`allowMidSpineReentry`**

  * `true` (default in your flow): shows realistic complexity; more **braids**.
  * `false`: simpler “pure detours only” picture (great for first-pass overviews).

* **`includeUpstream`**

  * `true`: you may see pairs of adjacent-anchor pills in opposite directions.
  * If you want only one per junction, run a quick mirror-dedupe step after (you already have a helper for this).

* **`maxPathsPerEvent`**

  * Keep small (3–5) for responsive UIs; bump when the user drills into a region.

* **`locusStartBp`**

  * Shift the whole x-axis origin if you’re stitching windows or aligning panels.

---

## Interpreting the output (quick map)

* `features.spine`

  * `nodes[]` – id + true `bpStart/bpEnd` on the chosen spine.
  * `edges[]` – your `edge:a:b` keys.
  * `lengthBp` – total span.

* `features.events[]` (each event = one locus on the spine)

  * `type` – pill / simple\_bubble / parallel\_bundle / braid / dangling
  * `anchors` – `{ leftId, rightId|null, spanStart, spanEnd, refLenBp, ... }`
  * `region` – `{ nodes, edges, anchorEdges, truncated }` (context)
  * `paths[]` – sampled **off-spine** alternatives only (spine hop filtered out)

    * `nodesDetailed[]` – per-node **projected** `refBpStart/refBpEnd` for interior off-spine nodes (and true coords for any mid-spine segments)

* `features.offSpine[]` – components that don’t touch the spine at all (for side context)

---

## Common pitfalls (and fixes)

1. **Passing a walk with multiple paths as the spine** → You’ll get spans for the first path only.
   **Fix:** pick the main path (`[main]`) or call the analyzer per path.

2. **Zero-length spine nodes** collapse your bp axis.
   **Fix:** ensure `node.length` or `sequence[id]` is present for spine candidates.

3. **Expecting off-spine nodes to have “true” bp**
   Only **on-spine** nodes have true bp on this axis. Off-spine nodes get **projected** positions **inside events**.

4. **Seeing duplicate pills (forward/upstream)**
   That’s `includeUpstream:true`. Dedupe mirror pairs if you want one per junction.

---

## Minimal end-to-end example

```js
const svc = new PangenomeService(json);

// Choose spine assembly
const walk = svc.createAssemblyWalk("CHM13#0#chr1", { mode: "auto" });
const main = walk.paths.reduce((a,b)=> (a?.bpLen||0) > b.bpLen ? a : b, null);
const spineWalk = { key: walk.key, paths: main ? [main] : [] };

// Analyze
const features = svc.assessGraphFeatures(spineWalk, {
  includeAdjacent: true,
  includeUpstream: true,
  allowMidSpineReentry: true,
  includeDangling: true,
  includeOffSpineComponents: true,
  maxPathsPerEvent: 5
});

// Tooltips on spine
svc.setActiveSpine(features.spine);

// Render
renderLinear(features);
```

That’s the happy path. If you want a version that accepts **multiple spine paths** and returns an array of feature sets (one per component), say the word and I’ll extend the method signature for you.
