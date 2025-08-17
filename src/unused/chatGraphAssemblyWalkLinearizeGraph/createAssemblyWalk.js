/**
 * Build the single linear walk for an assembly key within the current window.
 * mode: "endpoint" | "blockcut" | "auto" (default "auto")
 */

import { edgeKeyOf, num, inducedAdj, degreeMap, connectedComponents, chooseEndpoints, bfsPath } from "./assemblyWalkUtils.js"
import { extractPathEndpointWalk } from "./extractPath.js"
import { extractPathBlockCut } from "./extractPathBiconnected.js"

function createAssemblyWalk(graph, assemblyKey, { mode = "auto" } = {}) {
  const nodeSet = graph.index.byAssembly.get(assemblyKey);
  if (!nodeSet || nodeSet.size === 0) {
    return { key: assemblyKey, paths: [], diagnostics: { inducedNodes:0, inducedEdges:0, modeUsed:null, warnings:["no nodes"] } };
  }
  const indAdj = inducedAdj(graph, nodeSet);

  // quick stats
  let inducedEdges = 0;
  for (const [id, nbrs] of indAdj) inducedEdges += nbrs.length;
  inducedEdges = Math.floor(inducedEdges/2);
  const comps = connectedComponents(indAdj);
  const paths = [];
  const warnings = [];

  // heuristic to choose mode per component when mode==="auto"
  function decideMode(subAdj, comp) {
    if (mode !== "auto") return mode;
    const deg = degreeMap(subAdj);
    const n = comp.length;
    const e = comp.reduce((s,id)=>s + (subAdj.get(id)||[]).length, 0) / 2;
    const endpoints = comp.filter(id => (deg.get(id)||0) === 1).length;
    const maxDeg = Math.max(...comp.map(id => deg.get(id)||0));
    const looksChainy = (endpoints === 2) && (maxDeg <= 2) && (e <= n); // near-path or path-with-few-chords
    return looksChainy ? "endpoint" : "blockcut";
  }

  for (const comp of comps) {
    const subAdj = new Map(comp.map(id => [id, indAdj.get(id)]));
    const chosen = decideMode(subAdj, comp);

    const nodes =
      chosen === "endpoint" ? extractPathEndpointWalk(subAdj, comp)
    : chosen === "blockcut" ? extractPathBlockCut(subAdj, comp)
    : /* fallback */          extractPathEndpointWalk(subAdj, comp);

    if (nodes.length === 0) continue;

    // Build edge keys along the walk (use either a->b or b->a, whichever exists)
    const edgesOnPath = [];
    for (let i=0; i<nodes.length-1; i++) {
      const a = nodes[i], b = nodes[i+1];
      const ekF = edgeKeyOf(a,b), ekR = edgeKeyOf(b,a);
      if (graph.edges.has(ekF)) edgesOnPath.push(ekF);
      else if (graph.edges.has(ekR)) edgesOnPath.push(ekR);
      else warnings.push(`No edge found between ${a} and ${b} for ${assemblyKey}`);
    }

    const bpLen = nodes.reduce((s,id)=>s + (graph.nodes.get(id)?.lengthBp || 0), 0);
    paths.push({
      nodes,
      edges: edgesOnPath,
      leftEndpoint: nodes[0],
      rightEndpoint: nodes[nodes.length-1],
      bpLen,
      modeUsed: chosen
    });
  }

  return {
    key: assemblyKey,
    paths,
    diagnostics: { inducedNodes: nodeSet.size, inducedEdges, modeUsed: mode, warnings }
  };
}

// Wrapper: all keys (or a subset) with shared options
function createAssemblyWalks(graph, { keys=null, mode="auto" } = {}) {
  const allKeys = keys ? keys : Array.from(graph.index.byAssembly.keys()).sort();
  return allKeys.map(k => createAssemblyWalk(graph, k, { mode }));
}

export { createAssemblyWalk, createAssemblyWalks }
