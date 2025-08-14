// Tarjan biconnected components on undirected indAdj
function biconnectedDecomposition(indAdj) {
  const disc=new Map(), low=new Map(), parent=new Map();
  let time=0;
  const edgeStack=[]; // stack of [u,v]
  const blocks=[];    // array of Sets of node ids
  const articulation=new Set();

  function pushEdge(u,v){ edgeStack.push([u,v]); }
  function popBlockUntil(u,v){
    const set=new Set();
    while (edgeStack.length) {
      const [x,y]=edgeStack.pop();
      set.add(x); set.add(y);
      if ((x===u && y===v) || (x===v && y===u)) break;
    }
    if (set.size) blocks.push(set);
  }

  function dfs(u) {
    disc.set(u, ++time); low.set(u, time);
    let childCount=0;
    for (const v of (indAdj.get(u)||[])) {
      if (!disc.has(v)) { // tree edge
        parent.set(v, u); childCount++; pushEdge(u,v);
        dfs(v);
        low.set(u, Math.min(low.get(u), low.get(v)));
        if ((parent.get(u) !== undefined && low.get(v) >= disc.get(u)) ||
            (parent.get(u) === undefined && childCount > 1)) {
          articulation.add(u);
          popBlockUntil(u,v);
        }
      } else if (v !== parent.get(u) && disc.get(v) < disc.get(u)) {
        // back edge (use disc[v] < disc[u] to avoid double-push)
        pushEdge(u,v);
        low.set(u, Math.min(low.get(u), disc.get(v)));
      }
    }
  }

  for (const u of indAdj.keys()) if (!disc.has(u)) { dfs(u); if (edgeStack.length) popBlockUntil(...edgeStack[edgeStack.length-1]); }
  return { blocks, articulation };
}

// Build Block–Cut Tree (BCT). Nodes are strings "B#i" for blocks and "A#<id>" for articulations.
function buildBlockCutTree(blocks, articulation) {
  const bctAdj = new Map();  // node -> neighbors
  const blockNodes = [];      // index -> Set of member vertices
  const artNodes = new Set(); // "A#<id>"

  function add(n){ if(!bctAdj.has(n)) bctAdj.set(n, new Set()); }

  for (let i=0; i<blocks.length; i++) {
    const B = `B#${i}`;
    add(B);
    blockNodes[i] = blocks[i];
    for (const v of blocks[i]) {
      if (!articulation.has(v)) continue;
      const A = `A#${v}`;
      add(A); artNodes.add(A);
      bctAdj.get(B).add(A);
      bctAdj.get(A).add(B);
    }
  }
  // freeze adjacency
  const adj = new Map();
  for (const [k,set] of bctAdj) adj.set(k, Array.from(set));
  return { adj, blockNodes };
}

// Find the block index that contains a given vertex
function blockOfVertex(blocks, v) {
  for (let i=0;i<blocks.length;i++) if (blocks[i].has(v)) return i;
  return -1;
}

// Walk through the BCT from block(s) containing s -> block containing t, then stitch per-block paths.
function extractPathBlockCut(indAdj, comp) {
  if (!comp.length) return [];

  // 1) Decompose the induced subgraph restricted to this component
  const allow = new Set(comp);
  const subAdj = new Map(comp.map(id => [id, (indAdj.get(id)||[]).filter(x => allow.has(x))]));
  const { blocks, articulation } = biconnectedDecomposition(subAdj);
  if (blocks.length === 0) return []; // trivial

  // 2) Choose endpoints and their blocks
  const [s, t] = chooseEndpoints(subAdj, comp);
  const bs = blockOfVertex(blocks, s);
  const bt = blockOfVertex(blocks, t);
  if (bs === -1 || bt === -1) return bfsPath(subAdj, s, t) || []; // fallback

  // 3) Build BCT and BFS from Bs -> Bt
  const { adj: bctAdj } = buildBlockCutTree(blocks, articulation);
  const start = `B#${bs}`, goal = `B#${bt}`;
  const Q=[start], prev=new Map([[start,null]]);
  while (Q.length) {
    const x=Q.shift();
    if (x === goal) break;
    for (const y of (bctAdj.get(x)||[])) if (!prev.has(y)) { prev.set(y, x); Q.push(y); }
  }
  if (!prev.has(goal)) {
    // no path (shouldn't happen in a connected component)
    return bfsPath(subAdj, s, t) || [];
  }

  // Reconstruct BCT path (alternates B, A, B, A, ..., B)
  const bctPath = [];
  for (let cur=goal; cur; cur=prev.get(cur)) bctPath.push(cur);
  bctPath.reverse();

  // 4) Stitch per-block simple paths in the original graph
  const finalPath = [];
  let entry = s; // current entry vertex for the block
  for (let i=0; i<bctPath.length; i++) {
    const label = bctPath[i];
    if (!label.startsWith("B#")) continue;
    const bi = Number(label.slice(2));
    // determine the exit vertex for this block: the articulation that connects to the next B (or t if last)
    let exit = t;
    if (i+2 < bctPath.length) {
      // next articulation node name is like "A#<vertex>"
      const nextA = bctPath[i+1];
      exit = nextA.startsWith("A#") ? nextA.slice(2) : exit;
    }
    // BFS inside this block between entry and exit
    const allowSet = blocks[bi];
    const blockAllow = new Set(allowSet);
    const path = bfsPath(subAdj, entry, exit, blockAllow) || [];
    if (!path.length) break;

    // append, dedup articulation duplicates
    if (finalPath.length) {
      // avoid duplicating the first node if it equals last of finalPath
      if (finalPath[finalPath.length-1] === path[0]) {
        finalPath.push(...path.slice(1));
      } else {
        finalPath.push(...path);
      }
    } else {
      finalPath.push(...path);
    }

    // next entry is the same as current exit (the articulation)
    entry = exit;
  }

  return finalPath;
}

export { extractPathBlockCut }
