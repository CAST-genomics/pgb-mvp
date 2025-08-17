// ---------------- utilities: ids & intervals ----------------
function parseSignedId(id){ const m=String(id).match(/^(.+?)([+-])$/); return { bare:m[1], sign:m[2] }; }
function num(id){ return Number(parseSignedId(id).bare); }
function edgeKeyOf(a,b){ return `edge:${a}:${b}`; }
function cmp(a,b){ return a<b?-1:a>b?1:0; }

// degree in a restricted adjacency
function degreeMap(adj){ const d=new Map(); for(const [v,ns] of adj) d.set(v,(ns||[]).length); return d; }

function inducedAdjFull(adj, allow){ // Map<id,id[]> restricted to allow:Set
  const out = new Map();
  for (const v of allow) out.set(v, []);
  for (const v of allow) {
    for (const w of (adj.get(v)||[])) if (allow.has(w)) out.get(v).push(w);
  }
  return out;
}

function bfsSet(adj, start, stopCond){
  const q=[start], seen=new Set([start]);
  while(q.length){
    const v=q.shift();
    if (stopCond && stopCond(v)) continue;
    for (const w of (adj.get(v)||[])){
      if (seen.has(w)) continue;
      seen.add(w); q.push(w);
    }
  }
  return seen;
}

function bfsPath(adj, s, t, allow){
  const A = allow || new Set(adj.keys());
  if (!A.has(s) || !A.has(t)) return null;
  const q=[s], prev=new Map([[s,null]]);
  while(q.length){
    const v=q.shift();
    for(const w of (adj.get(v)||[])){
      if(!A.has(w) || prev.has(w)) continue;
      prev.set(w,v);
      if (w===t){
        const path=[t]; let u=v;
        while(u){ path.push(u); u=prev.get(u); }
        path.reverse(); return path;
      }
      q.push(w);
    }
  }
  return null;
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

// build edges list for a node path using your keys
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

// ---------------- main: assessGraphFeatures ----------------
function assessGraphFeatures(graph, spine, {
  locusStartBp = 0,
  epsilonBp = 5,
  kPaths = 3
} = {}) {
  // 1) Spine bp map
  const chain = (spine?.paths?.[0]?.nodes || []).slice();
  const bpStart=new Map(), bpEnd=new Map();
  let acc=locusStartBp;
  for (const id of chain){
    bpStart.set(id, acc);
    const L = graph.nodes.get(id)?.lengthBp || 0;
    acc += L;
    bpEnd.set(id, acc);
  }
  const spineObj = {
    assemblyKey: spine?.key || "spine",
    nodes: chain.map(id => ({
      id, bpStart: bpStart.get(id), bpEnd: bpEnd.get(id), lenBp: graph.nodes.get(id)?.lengthBp || 0
    })),
    edges: edgesForPath(graph, chain),
    lengthBp: (bpEnd.get(chain[chain.length-1]) || locusStartBp) - locusStartBp
  };

  // 2) Find candidate detours between spine nodes (L,R) that do not use other spine nodes
  const spineSet = new Set(chain);
  const adj = graph.adj;

  // precompute: neighbors off spine for each spine vertex
  const offNbrs = new Map();
  for(const v of chain){
    offNbrs.set(v, (adj.get(v)||[]).filter(u => !spineSet.has(u)));
  }

  // scanning candidates by exploring off-spine from each L until hitting an R
  const candidatePairs = new Set(); // "L|R" with L before R along spine
  const indexOnSpine = new Map(chain.map((id,i)=>[id,i]));

  function discoverPairsFrom(L){
    const q=[...offNbrs.get(L)];
    const seen=new Set([L, ...offNbrs.get(L)]);
    while(q.length){
      const v=q.shift();
      if (spineSet.has(v)){  // hit a spine node (rare via immediate neighbor)
        const i=indexOnSpine.get(L), j=indexOnSpine.get(v);
        if (j>i+1) candidatePairs.add(`${L}|${v}`);
        continue;
      }
      for (const w of (adj.get(v)||[])){
        if (seen.has(w)) continue;
        seen.add(w);
        if (spineSet.has(w)){
          const i=indexOnSpine.get(L), j=indexOnSpine.get(w);
          if (j>i+1 || (j===i && w===L)) candidatePairs.add(`${L}|${w}`);
        } else {
          q.push(w);
        }
      }
    }
  }

  for (const L of chain) if ((offNbrs.get(L)||[]).length) discoverPairsFrom(L);

  // 3) For each (L,R), define the region (nodes usable on a path L->R without other spine nodes)
  const eventsRaw = [];
  for (const key of candidatePairs){
    const [L,R] = key.split("|");
    const i=indexOnSpine.get(L), j=indexOnSpine.get(R);
    if (i==null || j==null) continue;

    // region nodes = (reachable from L without entering other spine nodes) ∩ (reachable from R likewise)  ∪ {L,R}
    const allowAll = new Set(adj.keys());
    const blockL = new Set([L]); // BFS but stop when hitting a spine node != L
    (function(){
      const q=[...offNbrs.get(L)];
      for (const x of q) blockL.add(x);
      while(q.length){
        const v=q.shift();
        for (const w of (adj.get(v)||[])){
          if (blockL.has(w)) continue;
          if (spineSet.has(w) && w!==L) continue;
          blockL.add(w); q.push(w);
        }
      }
    })();
    const blockR = new Set([R]);
    (function(){
      const q=(adj.get(R)||[]).filter(x => !spineSet.has(x));
      for (const x of q) blockR.add(x);
      while(q.length){
        const v=q.shift();
        for (const w of (adj.get(v)||[])){
          if (blockR.has(w)) continue;
          if (spineSet.has(w) && w!==R) continue;
          blockR.add(w); q.push(w);
        }
      }
    })();

    const regionSet = new Set([L,R]);
    for (const v of blockL) if (blockR.has(v)) regionSet.add(v);

    // if region has only L,R but no connecting edge through off-spine, skip unless pill
    const regionAdj = inducedAdjFull(adj, regionSet);
    const hasDirect = (regionAdj.get(L)||[]).includes(R);
    if (regionSet.size<=2 && !hasDirect) continue;

    // 4) Sample up to k disjoint alt paths (node-weighted shortest paths; remove interiors between runs)
    const paths=[]; 
    const mutableAdj = new Map();
    for (const [v,ns] of regionAdj) mutableAdj.set(v, ns.slice());

    function removeInterior(path){ // remove nodes except anchors
      for (const x of path.slice(1,-1)){
        // cut x from mutableAdj
        for (const nb of (mutableAdj.get(x)||[])){
          const arr = mutableAdj.get(nb);
          if (!arr) continue;
          const idx = arr.indexOf(x);
          if (idx>=0) arr.splice(idx,1);
        }
        mutableAdj.delete(x);
      }
    }

    // first path
    let p = dijkstraNodeWeighted(graph, mutableAdj, L, R);
    if (p) { paths.push(p); removeInterior(p); }
    // additional paths
    for (let kk=1; kk<kPaths; kk++){
      const next = dijkstraNodeWeighted(graph, mutableAdj, L, R);
      if (!next) break;
      paths.push(next);
      removeInterior(next);
    }

    // compute lengths & edges
    const pathObjs = paths.map(nodes => {
      const altLenBp = nodes.slice(1,-1).reduce((s,id)=>s+(graph.nodes.get(id)?.lengthBp||0), 0);
      return { nodes, edges: edgesForPath(graph, nodes), altLenBp };
    });

    const spanStart = bpEnd.get(L);
    const spanEnd   = bpStart.get(R);
    const refLenBp  = Math.max(0, spanEnd - spanStart);

    // classify region
    const pill = (L===R) || (refLenBp===0);
    let type = "simple_bubble";
    if (pill) type = "pill";
    else {
      // structural hint: degrees inside region
      const d = degreeMap(regionAdj);
      const degMax = Math.max(...Array.from(d.values()));
      // edges count m
      let m=0; for (const ns of regionAdj.values()) m+=ns.length; m/=2;
      const n = regionAdj.size;
      if (pathObjs.length<=1 && degMax<=2 && m===n-1) type="simple_bubble";
      else if (pathObjs.length>=2 && degMax<=3 && m>=n-1) type="parallel_bundle";
      else type="braid";
    }

    const nPaths = pathObjs.length;
    const minAlt = nPaths ? Math.min(...pathObjs.map(o=>o.altLenBp)) : 0;
    const maxAlt = nPaths ? Math.max(...pathObjs.map(o=>o.altLenBp)) : 0;

    eventsRaw.push({
      id: `${L}~${R}`,
      type,
      anchors: {
        leftId: L, rightId: R,
        spanStart, spanEnd, refLenBp
      },
      paths: pathObjs,
      stats: { nPaths, minAltLenBp:minAlt, maxAltLenBp:maxAlt },
      relations: { parentId:null, childrenIds:[], overlapGroup:null, sameAnchorGroup:null }
    });
  }

  // 5) Interval relationships (nested vs overlapping vs same anchors)
  // sort by spanStart, then spanEnd
  eventsRaw.sort((a,b)=> a.anchors.spanStart - b.anchors.spanStart || a.anchors.spanEnd - b.anchors.spanEnd);

  // same-anchors groups
  const sameGroups = new Map(); // "L|R" -> groupId
  let gId = 1;
  for (const e of eventsRaw){
    const key = `${e.anchors.leftId}|${e.anchors.rightId}`;
    if (!sameGroups.has(key)) sameGroups.set(key, gId++);
    e.relations.sameAnchorGroup = sameGroups.get(key);
  }

  // nested & overlaps (by interval)
  function contains(A,B){ return A.anchors.spanStart <= B.anchors.spanStart && A.anchors.spanEnd >= B.anchors.spanEnd; }
  function overlapOnly(A,B){
    return !(A.anchors.spanEnd <= B.anchors.spanStart || B.anchors.spanEnd <= A.anchors.spanStart) &&
           !contains(A,B) && !contains(B,A);
  }

  // parent/children
  for (let i=0;i<eventsRaw.length;i++){
    for (let j=i+1;j<eventsRaw.length;j++){
      const A=eventsRaw[i], B=eventsRaw[j];
      if (contains(A,B)) { B.relations.parentId = A.id; A.relations.childrenIds.push(B.id); continue; }
      if (contains(B,A)) { A.relations.parentId = B.id; B.relations.childrenIds.push(A.id); continue; }
    }
  }

  // overlap groups
  let og=1;
  for (let i=0;i<eventsRaw.length;i++){
    for (let j=i+1;j<eventsRaw.length;j++){
      const A=eventsRaw[i], B=eventsRaw[j];
      if (overlapOnly(A,B)){
        const ga=A.relations.overlapGroup, gb=B.relations.overlapGroup;
        if (ga && gb && ga!==gb){
          // merge small into ga
          const min=Math.min(ga,gb), max=Math.max(ga,gb);
          for (const e of eventsRaw) if (e.relations.overlapGroup===max) e.relations.overlapGroup=min;
        } else if (ga || gb){
          const g = ga || gb; A.relations.overlapGroup=g; B.relations.overlapGroup=g;
        } else {
          A.relations.overlapGroup = B.relations.overlapGroup = og++;
        }
      }
    }
  }

  return { spine: spineObj, events: eventsRaw };
}
