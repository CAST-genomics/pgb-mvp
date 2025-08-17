Here’s a tight “what/why/when” cheat-sheet for the `assessGraphFeatures(...)` options you called out. Think of them as **discovery toggles** (what to emit) and **safety rails** (how far to search).

---

# Discovery toggles

### `includeAdjacent: boolean` (default **true**)

**What it does:** Emits events where the anchors are **adjacent** on the spine (`R = spine[i+1]`). These are the classic **pills** (ref span = 0).
**Why you’d keep it on:** You want to see insertions at single junctions and micro-bubbles.
**Turn it off if:** You only care about longer spans (reduces event count).

---

### `includeUpstream: boolean` (default **true**)

**What it does:** Also emits events where `R` lies **upstream** of `L` (i.e., `(R,L)` as well as `(L,R)`).
**Impact:** Without a dedupe pass, you’ll see **mirror pairs** of the same junction (forward + upstream).
**Keep it on if:** You want both orientations recorded.
**Turn it off if:** You don’t want duplicates.
**Tip:** If you applied the optional *mirror dedupe* patch, you can leave this **on**; the kept event will get `anchors.orientations: ["forward","upstream"]`.

---

### `allowMidSpineReentry: boolean` (default **true**)

**What it does:** When building the off-spine **region** between anchors `(L,R)`, also allow the **intermediate spine nodes** between them to participate inside the detour.
**Why it matters:** Captures “branch-on-branch”/**braids** where detours touch spine nodes between `L` and `R`.
**Keep it on if:** You want a complete picture of complex blocks and chords.
**Turn it off if:** You want only “pure” off-spine detours (fewer braids; simpler output).
**UI effect:** With it **on**, some events will be classified as `"braid"` due to overlaps/nesting that involve mid-spine contacts.

---

### `includeDangling: boolean` (default **true**)

**What it does:** Emits **dangling** events for branches that **leave** the spine inside the window but **don’t rejoin** within the window (`rightId: null`, `type: "dangling"`).
**Keep it on if:** Your window often cuts through events and you want boundary arrows/“continues off-screen”.
**Turn it off if:** You only want fully formed `(L,R)` loops.

---

### `includeOffSpineComponents: boolean` (default **true**)

**What it does:** Adds an `offSpine[]` array describing connected components that **never touch** the spine in this window (context only).
**Keep it on if:** You want to grey-in background context or offer a “show islands” toggle.
**Turn it off if:** You want leaner output or faster analysis.

---

# Path sampling / safety rails

### `maxPathsPerEvent: number` (default **8**)

**What it does:** For each `(L,R)`, samples up to **k edge-disjoint** alternative paths (node-weighted shortest, repeated).
**Higher values:** More alternatives, more time; `stats.truncatedPaths` tells you if the cap was hit.
**Typical:** `3–5` is plenty for rendering; `8` is nice for exploration.

---

### `maxRegionNodes: number` (default **5000**)

### `maxRegionEdges: number` (default **8000**)

**What they do:** Hard caps while constructing each detour **region**. If exceeded, the event marks `region.truncated = true` and stops deepening the local graph.
**Why they matter:** Prevents pathological regions from blowing up runtime/memory.
**Tune up if:** You’re inspecting very large superbubbles and need completeness.
**Tune down if:** You want snappier interactivity.

---

## What you’ll see in the output when these flip

* **Adjacent on** → Many `type: "pill"` events; `spanStart === spanEnd`; pills can still have `paths` (e.g., `L → off → R`).
* **Upstream on** (no dedupe) → Forward/upstream **pairs** of the same junction; with dedupe patch, the single kept event shows `anchors.orientations` including both.
* **MidSpineReentry on** → More events labeled `"braid"` due to overlaps / nested intervals; richer `region.anchorEdges`.
* **Dangling on** → Events with `rightId: null`, no `paths`, good for boundary indicators.
* **OffSpineComponents on** → An extra `offSpine` list you can ignore or use to tint islands.

---

## Quick presets

* **Explore / kitchen-sink (default):**
  `includeAdjacent:true, includeUpstream:true, allowMidSpineReentry:true, includeDangling:true, includeOffSpineComponents:true, maxPathsPerEvent:8`

* **Spine-centric / tidy:**
  `includeAdjacent:true, includeUpstream:false, allowMidSpineReentry:false, includeDangling:true, includeOffSpineComponents:false, maxPathsPerEvent:3`

* **Publication-minimal:**
  `includeAdjacent:true, includeUpstream:false, allowMidSpineReentry:false, includeDangling:false, includeOffSpineComponents:false, maxPathsPerEvent:1–2`

If you want, I can add an `explainType` string per event (why it’s a braid vs bubble) or bake these presets into a tiny wrapper like `assessGraphFeaturesPreset("tidy")`.
