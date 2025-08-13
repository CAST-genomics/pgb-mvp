# Linearizing a Pangenome Graph (Three.js) — Usage Guide

This document explains how to **use** the `linearizePangenome(...)` function to turn a local pangenome subgraph into a **length-true, spine-anchored layout** you can render with three.js. It focuses on *how to call the function and render its outputs*, not on the internals.

---

## What the function does (in one line)

Given a graph and an ordered **spine path** (e.g., GRCh38 nodes for the window), it returns:

* **Spine segments** positioned along **x** proportionally to base pairs (bp), at **y = 0**.
* **Loops/pills** that represent alternative paths (“detours”) anchored between two spine nodes, placed in non-overlapping **lanes** above/below the spine.

---

## Function signature

```js
const { spineSegments, loops } =
  linearizePangenome(graph, spineIds, locusStartBp, pxPerBp, opts);
```

### Parameters

* `graph` — your subgraph. Two accepted shapes:

  * **Map-based**

    ```js
    {
      nodes: new Map([
        [id, { lengthBp: Number, neighbors: Array<string> }],
        ...
      ])
    }
    ```
  * **Object-based**

    ```js
    {
      nodes: {
        [id]: { lengthBp?: Number, length?: Number, neighbors?: string[], seq?: string }
      },
      // optional:
      edges?: Array<{ from: string, to: string }> // undirected for layout
    }
    ```

  The function will infer `lengthBp` from `length` or `seq.length` if needed.

* `spineIds: string[]` — node IDs in order along the reference (the “ribbon”).

* `locusStartBp: number` — bp coordinate for **x = 0** (usually your window start).

* `pxPerBp: number` — pixels per base (controls zoom level).

* `opts` (optional):

  ```js
  {
    laneGapPx?: number,        // vertical spacing between loop lanes (default 18)
    pillWidthPx?: number,      // visible width for insertion pills (default 8)
    loopSamples?: number,      // 0 => return cubic Beziers only; >0 => sample to points
    classifyByAltVsRef?: boolean,   // insertion above / deletion below (default true)
    alternateSignsOnTies?: boolean  // alternate +/− when altLen==refLen (default true)
  }
  ```

### Returns

* `spineSegments: Array<{
    id: string,
    v0: THREE.Vector2,   // x,y in pixels
    v1: THREE.Vector2,   // x,y in pixels
    bpStart: number,     // absolute bp coordinate along spine
    bpEnd: number,
    lenBp: number
  }>`
  Draw each segment as a straight line from `v0` to `v1` at `y = 0`.

* `loops: Array<{
    id: string,
    leftId: string, rightId: string,
    x0: number, x1: number,     // start/end x in pixels on y=0
    apex: number,               // loop apex y in pixels (lanes above/below)
    bezier: [THREE.Vector2,THREE.Vector2,THREE.Vector2,THREE.Vector2], // p0,c0,c1,p1
    points?: THREE.Vector2[],   // present if opts.loopSamples > 0
    refLenBp: number,           // replaced reference length
    altLenBp: number,           // length along the detour path
    insertionLike: boolean, deletionLike: boolean,
    pill: boolean,              // true when ref span ≈ 0
    lane: number
  }>`
  Render each loop as a cubic Bézier from `bezier[0]` to `bezier[3]` using `bezier[1]`/`bezier[2]` as control points, or just draw `points` if you requested sampling.

**Conventions implemented**

* **Insertions** (`altLenBp > refLenBp`) are placed **above** the spine; **deletions** below.
* If `refLenBp == 0`, the loop becomes a **pill** centered at the attachment (minimum width enforced by `pillWidthPx`).

---

## Minimal usage (pseudocode → three.js)

```js
// 1) Prepare inputs
const pxPerBp = 0.002;                // tune with your zoom
const locusStartBp = windowStartBp;   // e.g., 879500
const spineIds = grch38IdsInOrder;    // your reference path for this window
const graph = buildGraphFromJson(json); // shape described above

// 2) Linearize
const { spineSegments, loops } =
  linearizePangenome(graph, spineIds, locusStartBp, pxPerBp, {
    laneGapPx: 20,
    pillWidthPx: 8,
    loopSamples: 0
  });

// 3) Render — Spine (polyline of straight segments)
{
  const positions = [];
  for (const seg of spineSegments) {
    positions.push(seg.v0.x, seg.v0.y, 0);
    positions.push(seg.v1.x, seg.v1.y, 0);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({ linewidth: 1 }); // or use Line2 for wide lines
  const spineLine = new THREE.LineSegments(geom, mat);
  scene.add(spineLine);
}

// 4) Render — Loops (as Beziers sampled to polylines)
function sampleCubic(p0, c0, c1, p1, steps=32) {
  const pts = [];
  for (let i=0;i<=steps;i++) {
    const t=i/steps, u=1-t;
    const x = u*u*u*p0.x + 3*u*u*t*c0.x + 3*u*t*t*c1.x + t*t*t*p1.x;
    const y = u*u*u*p0.y + 3*u*u*t*c0.y + 3*u*t*t*c1.y + t*t*t*p1.y;
    pts.push(x,y,0);
  }
  return pts;
}

{
  const loopGroup = new THREE.Group();
  for (const L of loops) {
    const [p0,c0,c1,p1] = L.bezier;
    const positions = sampleCubic(p0,c0,c1,p1,32);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({ transparent:true, opacity:0.85 });
    const line = new THREE.Line(geom, mat);
    // Optional color coding:
    // mat.color.set(L.insertionLike ? 0x3A8 : L.deletionLike ? 0xA33 : 0x888);
    loopGroup.add(line);
  }
  scene.add(loopGroup);
}
```

> Your app already “handles mesh creation and scene insertion,” so treat the snippets above as reference glue. You can just consume `spineSegments` and `loops` to feed your own geometry builders.

---

## Typical data preparation

If your JSON lists nodes with IDs, lengths, and edges:

```js
function buildGraphFromJson(json) {
  const nodes = {};
  for (const n of json.nodes) {
    nodes[n.id] = {
      lengthBp: n.length ?? (n.seq ? n.seq.length : 0),
      neighbors: [] // fill from edges next
    };
  }
  for (const e of json.edges) {
    nodes[e.from].neighbors.push(e.to);
    nodes[e.to].neighbors.push(e.from);
  }
  return { nodes };
}
```

Compute your `spineIds` by walking the edges along the reference assembly you chose (e.g., GRCh38). If your JSON already tags which nodes belong to the chosen assembly, sort them in path order and pass that array.

---

## Coordinate system & units

* **x** is **length-true**: `x = (bp − locusStartBp) * pxPerBp`.
* **y = 0** is the spine baseline.
* Loops are drawn with apex at `± laneIndex * laneGapPx` to avoid overlap (pure layout value; not genomic units).

---

## Interactivity hooks (recommended)

* **Hover** a loop → show `{refLenBp, altLenBp, leftId, rightId}`.
* **Click** a loop → highlight all nodes/edges on that detour (you already have `leftId/rightId` anchors).
* **Toggle**: show only loops taken by a selected assembly/haplotype (if you have path labels).
* **Zoom**: update `pxPerBp`, re-run `linearizePangenome`, and rebuild geometry (fast for subgraphs).

---

## Visual conventions (suggested)

* Above = insertion-like (`altLenBp > refLenBp`), below = deletion-like.
* **Pills**: use a minimum width for visibility (e.g., 6–8 px).
* **Inversions** (if you detect orientation flips) — dashed loop or “twist” glyph at apex.

---

## Performance tips

* For zoomed-out views, reduce `loopSamples` (e.g., 12–16) or draw Beziers with a shader line (if using `Line2`).
* Batch the spine into a single `LineSegments`. Batch all loops into one geometry per visual style to minimize draw calls.
* If your window spans many Mb, **row-wrap** visually at a fixed pixel width and add a row offset to `y` (you can apply `x %= wrapWidthPx` and group segments/loops by row; same lane packing per row).

---

## Troubleshooting

* **“Everything is on top of itself”**
  Check `spineIds` ordering and `locusStartBp`. If `pxPerBp` is tiny, increasing it will reveal differences.

* **“Loops vanish”**
  If `refLenBp == 0` and `pillWidthPx` is too small for your current zoom, raise it.

* **“Weird overlaps”**
  Lane packing is greedy left-to-right on loop spans. If you post-transform **x** (e.g., row wrap), recompute lane packing per row.

---

## Quick checklist before calling

* [ ] `graph` has `lengthBp` (or `length`/`seq`) and symmetric neighbor lists (or `edges`).
* [ ] `spineIds` is the correct reference path order for the current window.
* [ ] `locusStartBp` equals the window’s left boundary.
* [ ] `pxPerBp` matches your zoom (try 0.001–0.01 px/bp to start).

---

That’s it. Feed the outputs into your existing geometry builders and you’ll get the “linearized” picture you sketched: a compact, length-true ribbon with clean, non-overlapping loops and insertion pills placed where they belong.
