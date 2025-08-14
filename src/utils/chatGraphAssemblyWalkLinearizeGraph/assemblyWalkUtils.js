// --- id & key helpers (kept same as before) ---
function parseSignedId(id) {
  const m = String(id).match(/^(.+?)([+-])$/);
  if (!m) throw new Error(`Node id "${id}" must end with + or -`);
  return { bare: m[1], sign: m[2] };
}

function edgeKeyOf(a, b) { return `edge:${a}:${b}`; }

function num(id){ return Number(parseSignedId(id).bare); }

function portForStartingNode(startingNode, nodeId) {
    return parseSignedId(startingNode).sign === parseSignedId(nodeId).sign ? "END" : "START";
}
function portForEndingNode(endingNode, nodeId) {
    return parseSignedId(endingNode).sign === parseSignedId(nodeId).sign ? "END" : "START";
}

// --- induced adjacency on a node set (undirected view) ---
function inducedAdj(graph, nodeSet) {
  const out = new Map();
  for (const id of nodeSet) out.set(id, []);
  for (const id of nodeSet) {
    const nbrs = graph.adj.get(id) || [];
    for (const nb of nbrs) if (nodeSet.has(nb)) out.get(id).push(nb);
  }
  return out;
}

// degree map
function degreeMap(indAdj) {
  const deg = new Map();
  for (const [id, list] of indAdj) deg.set(id, list.length);
  return deg;
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
      for (const w of indAdj.get(v) || []) if (!vis.has(w)) { vis.add(w); q.push(w); }
    }
    comps.push(comp);
  }
  return comps;
}

// choose endpoints for a component
function chooseEndpoints(indAdj, comp) {
  const deg = degreeMap(indAdj);
  const endpoints = comp.filter(id => (deg.get(id)||0) === 1);
  if (endpoints.length >= 2) return [endpoints[0], endpoints[1]];

  // No clear endpoints: use 2-BFS (approx diameter)
  const farthest = (start) => {
    const q=[start], dist=new Map([[start,0]]); let last=start;
    while (q.length) {
      const v=q.shift(); last=v;
      for (const w of (indAdj.get(v)||[])) if (!dist.has(w)) { dist.set(w, dist.get(v)+1); q.push(w); }
    }
    return last;
  };
  const a = comp[0];
  const u = farthest(a);
  const v = farthest(u);
  return [u, v];
}

// simple BFS path between two nodes restricted to allowed set
function bfsPath(indAdj, start, goal, allowSet=null) {
  if (start === goal) return [start];
  const q=[start], prev=new Map([[start,null]]), allow = allowSet || new Set(indAdj.keys());
  while (q.length) {
    const v=q.shift();
    for (const w of (indAdj.get(v)||[])) {
      if (!allow.has(w) || prev.has(w)) continue;
      prev.set(w, v);
      if (w === goal) {
        const path=[w]; let cur=v;
        while (cur) { path.push(cur); cur=prev.get(cur); }
        path.reverse();
        return path;
      }
      q.push(w);
    }
  }
  return null;
}

function tripleKey(a) {
    return `${a.assembly_name}#${a.haplotype}#${a.sequence_id}`
}

export {
    edgeKeyOf,
    tripleKey,
    parseSignedId,
    num,
    portForStartingNode,
    portForEndingNode,
    inducedAdj,
    degreeMap,
    connectedComponents,
    chooseEndpoints,
    bfsPath }
