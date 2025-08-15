// --- id & key helpers (kept same as before) ---
function parseSignedId(id) {
  const m = String(id).match(/^(.+?)([+-])$/);
  if (!m) throw new Error(`Node id "${id}" must end with + or -`);
  return { bare: m[1], sign: m[2] };
}

function edgeKeyOf(a, b) { return `edge:${a}:${b}`; }

function edgesForPath(graph, nodes){
    const out=[];
    for(let i=0;i<nodes.length-1;i++){
        const a=nodes[i], b=nodes[i+1];
        const ekF=edgeKeyOf(a,b), ekR=edgeKeyOf(b,a);
        if (graph.edges.has(ekF)) out.push(ekF);
        else if (graph.edges.has(ekR)) out.push(ekR);
    }
    return out;
}

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

function inducedAdjFull(adj, allow){ // Map<id,id[]> restricted to allow:Set
    const out = new Map();
    for (const v of allow) out.set(v, []);
    for (const v of allow) {
        for (const w of (adj.get(v)||[])) if (allow.has(w)) out.get(v).push(w);
    }
    return out;
}

// Dijkstra on node-weighted graph (cost = sum lengthBp of visited nodes; excludes s)
function dijkstraNodeWeighted(graph, subAdj, s, t){
    const w = id => (graph.nodes.get(id)?.lengthBp || 0);
    const allow = new Set(subAdj.keys());
    if(!allow.has(s) || !allow.has(t)) return null;

    const dist=new Map(), prev=new Map(), done=new Set();
    for (const v of allow) dist.set(v, Infinity);
    dist.set(s, 0);

    while(true){
        // O(V) min-search (fine for local regions)
        let u=null, best=Infinity;
        for(const [v,d] of dist) if(!done.has(v) && d<best){ best=d; u=v; }
        if (u===null) break;
        done.add(u);
        if (u===t) break;

        for (const nb of (subAdj.get(u)||[])){
            if (!allow.has(nb) || done.has(nb)) continue;
            const alt = dist.get(u) + (nb===t ? 0 : w(nb)); // do not pay for sink
            if (alt < dist.get(nb)) { dist.set(nb, alt); prev.set(nb,u); }
        }
    }
    if (!prev.has(t)) return null;
    const path=[t]; let cur=prev.get(t);
    while(cur){ path.push(cur); cur=prev.get(cur); }
    path.reverse();
    return path;
}

// interval helpers
function contains(A,B){ return A.start<=B.start && A.end>=B.end; }

function overlaps(A,B){ return !(A.end<=B.start || B.end<=A.start); }

export {
    contains,
    overlaps,
    edgeKeyOf,
    edgesForPath,
    dijkstraNodeWeighted,
    inducedAdjFull,
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
