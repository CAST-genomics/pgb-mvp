import { createGraph } from "./createGraph.js"
import {createAssemblyWalks} from "./createAssemblyWalk.js"
import {linearize} from "./linearizeGraph.js"

// 1) Parse file
const graph = createGraph(json);

// 2) Build all walks (or pick specific keys)
const walks = createAssemblyWalks(graph);

// convenience: find the GRCh38 walk
const grch = walks.find(w => w.key === "GRCh38") || walks.find(w => w.key.startsWith("GRCh38|"));

// 3) Linearize GRCh38 (or any assembly) for display
const { spineSegments, loops } = linearize(graph, grch, {
  locusStartBp: json.locus_start || 0,    // if your JSON tracks it
  pxPerBp: 0.002,
  laneGapPx: 20,
  pillWidthPx: 8
});

// 4) Feed into your existing mesh builders (three.js)
// - Use your own materials/Line2, etc.
// - Edge ids on paths are available in each walk: walk.paths[i].edges (your edge keys)
