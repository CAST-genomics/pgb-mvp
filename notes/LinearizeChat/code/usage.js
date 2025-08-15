// 0) Build the graph and GRCh38 walk as you already do
const graph = createGraph(json);
const grch  = createAssemblyWalk(graph, "GRCh38", { mode: "auto" });

// 1) Assess genomic features (no pixels here)
const features = assessGraphFeatures(graph, grch, {
  locusStartBp: json.locus_start || 0,
  epsilonBp: 5,
  kPaths: 3
});

// 2) Hand `features` to a renderer:
//    - draw `features.spine.nodes` as a length-true spine
//    - convert each `event` to an arc/pill using spanStart/spanEnd and any path stats you like
