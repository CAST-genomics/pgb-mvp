// ---------- tiny utils ----------
function parseSignedId(id){ const m=String(id).match(/^(.+?)([+-])$/); return { bare:m[1], sign:m[2] }; }
function num(id){ return Number(parseSignedId(id).bare); }
function edgeKeyOf(a,b){ return `edge:${a}:${b}`; }
function inducedAdjFull(adj, allow){
  const out=new Map();
  for(const v of allow) out.set(v, []);
  for(const v of allow){ for(const w of (adj.get(v)||[])) if(allow.has(w)) out.get(v).push(w); }
  return out;
}
function degreeMap(adj){ const d=new Map(); for(const [v,ns] of adj) d.set(v,(ns||[]).length); return d; }
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
// node-weighted Dijkstra (cost = sum node lengths, excluding sink)
function dijkstraNodeWeighted(graph, adj, s, t, allow){
  const A = allow || new Set(adj.keys());
  if (!A.has(s) || !A.has(t)) return null;
  const w = id => (graph.nodes.get(id)?.lengthBp || 0);

  const dist=new Map(), prev=new Map(), done=new Set();
  for(const v of A) dist.set(v, Infinity);
  dist.set(s,0);

  while(true){
    let u=null, best=Infinity;
    for(const [v,d] of dist) if(!done.has(v) && d<best){ best=d; u=v; }
    if (u===null) break;
    done.add(u);
    if (u===t) break;

    for(const nb of (adj.get(u)||[])){
      if(!A.has(nb) || done.has(nb)) continue;
      const alt = dist.get(u) + (nb===t ? 0 : w(nb));
      if (alt < dist.get(nb)) { dist.set(nb, alt); prev.set(nb, u); }
    }
  }
  if (!prev.has(t)) return null;
  const path=[t]; let cur=prev.get(t);
  while(cur){ path.push(cur); cur=prev.get(cur); }
  path.reverse();
  return path;
}
function edgesForPath(graph, nodes){
  const out=[]; for(let i=0;i<nodes.length-1;i++){
    const a=nodes[i], b=nodes[i+1];
    const ekF=edgeKeyOf(a,b), ekR=edgeKeyOf(b,a);
    if (graph.edges.has(ekF)) out.push(ekF);
    else if (graph.edges.has(ekR)) out.push(ekR);
  } return out;
}
// interval helpers
function contains(A,B){ return A.start<=B.start && A.end>=B.end; }
function overlaps(A,B){ return !(A.end<=B.start || B.end<=A.start); }

// ---------- KITCHEN-SINK ANALYZER ----------
function assessGraphFeatures(
  graph,
  spineWalk,
  {
    locusStartBp = 0,
    epsilonBp = 5,

    // kitchen sink toggles
    includeAdjacent = true,          // allow R = spine[i+1]
    includeUpstream = true,          // allow R upstream of L (i > j)
    allowMidSpineReentry = true,     // permit paths that touch intermediate spine nodes
    includeDangling = true,          // emit branches that never rejoin inside window
    includeOffSpineComponents = true,// report components that never touch spine (context only)

    // path sampling
    maxPathsPerEvent = 8,            // edge-disjoint k
    maxRegionNodes = 2500,           // safety caps per event
    maxRegionEdges = 4000
  } = {}
){
  // ----- 1) spine bp map -----
  const spineNodes = (spineWalk?.paths?.[0]?.nodes || []).slice();
  const bpStart=new Map(), bpEnd=new Map(); let acc=locusStartBp;
  for(const id of spineNodes){ bpStart.set(id, acc); acc += (graph.nodes.get(id)?.lengthBp||0); bpEnd.set(id, acc); }
  const spine = {
    assemblyKey: spineWalk?.key || "spine",
    nodes: spineNodes.map(id => ({ id, bpStart: bpStart.get(id), bpEnd: bpEnd.get(id), lenBp: graph.nodes.get(id)?.lengthBp||0 })),
    edges: edgesForPath(graph, spineNodes),
    lengthBp: (bpEnd.get(spineNodes.at(-1))||locusStartBp) - locusStartBp
  };

  const adj = graph.adj;
  const spineSet = new Set(spineNodes);
  const indexOnSpine = new Map(spineNodes.map((id,i)=>[id,i]));

  // convenience: which spine nodes are between i..j inclusive
  function spineWindow(i,j){
    const from=Math.min(i,j), to=Math.max(i,j);
    return new Set(spineNodes.slice(from, to+1));
  }

  // ----- 2) discover all candidate anchor pairs (including pills, upstream, adjacent) -----
  const candidatePairs = new Map(); // key -> {L,R, kind:"forward|upstream|pill"}
  const visitedDanglingSets = new Set(); // to dedupe

  function addPair(L,R,kind){
    if (!includeAdjacent && indexOnSpine.get(R) === indexOnSpine.get(L)+1) return;
    if (!includeUpstream && indexOnSpine.get(R) <= indexOnSpine.get(L)) return;
    const key = `${L}|${R}`;
    if (!candidatePairs.has(key)) candidatePairs.set(key, { L, R, kind });
  }

  // explore from each L outward through off-spine, recording any spine node hit (R), or a pill (back to L), or dangling
  const offNbrs = new Map();
  for(const v of spineNodes) offNbrs.set(v, (adj.get(v)||[]).filter(u=>!spineSet.has(u)));

  for(const L of spineNodes){
    const q=[...offNbrs.get(L)];
    const seen=new Set([L, ...offNbrs.get(L)]);
    let hitAny=false;

    while(q.length){
      const v=q.shift();
      for(const w of (adj.get(v)||[])){
        if (seen.has(w)) continue;
        seen.add(w);
        if (spineSet.has(w)){
          hitAny=true;
          const j=indexOnSpine.get(w), i=indexOnSpine.get(L);
          if (w===L) addPair(L, L, "pill");                 // L→off→L
          else addPair(L, w, (j>i) ? "forward" : "upstream");
        } else {
          q.push(w);
        }
      }
    }

    // dangling region: reachable off-spine nodes that never touch another spine node
    if (includeDangling && !hitAny){
      const regionNodes = Array.from(seen).filter(x=>!spineSet.has(x));
      if (regionNodes.length){
        // Create a stable hash to dedupe identical dangling blobs
        const sig = regionNodes.slice().sort().join(",");
        if (!visitedDanglingSets.has(sig)){
          visitedDanglingSets.add(sig);
          // Minimal event shell; full region/edges filled later reusing code path
          candidatePairs.set(`${L}|null:${sig}`, { L, R:null, kind:"dangling" });
        }
      }
    }
  }

  // ----- 3) build events for each candidate -----
  const events = [];

  function regionFor(L, R){
    // Nodes allowed: all off-spine nodes reachable from L and from R (if R!=null) without touching other spine nodes,
    // unless allowMidSpineReentry=true, then we also allow intermediate spine nodes between L and R.
    const allowFromL = new Set([L]);
    const qL = (adj.get(L)||[]).filter(x=>!spineSet.has(x)); for(const x of qL) allowFromL.add(x);
    while(qL.length){ const v=qL.shift(); for(const w of (adj.get(v)||[])){
      if (allowFromL.has(w)) continue; if (spineSet.has(w)) continue; allowFromL.add(w); qL.push(w); } }

    let allowFromR=null;
    if (R){
      allowFromR = new Set([R]);
      const qR = (adj.get(R)||[]).filter(x=>!spineSet.has(x)); for(const x of qR) allowFromR.add(x);
      while(qR.length){ const v=qR.shift(); for(const w of (adj.get(v)||[])){
        if (allowFromR.has(w)) continue; if (spineSet.has(w)) continue; allowFromR.add(w); qR.push(w); } }
    }

    const region = new Set([L]); if (R) region.add(R);
    if (R){ for(const v of allowFromL) if (allowFromR.has(v)) region.add(v); }
    else   { for(const v of allowFromL) if (!spineSet.has(v)) region.add(v); }

    // allow mid-spine re-entry on interior if requested
    if (allowMidSpineReentry && R){
      const i=indexOnSpine.get(L), j=indexOnSpine.get(R);
      const midSpine = spineWindow(i,j);
      for(const s of midSpine) region.add(s);
    }

    // safety caps
    if (region.size > maxRegionNodes) { region._truncated = true; }
    return region;
  }

  function buildRegionAdj(region){
    const allow = new Set(region);
    const subAdj = new Map();
    let edgeCount=0;
    for(const v of allow) subAdj.set(v, []);
    for(const v of allow){
      for(const w of (adj.get(v)||[])){
        if (!allow.has(w)) continue;
        subAdj.get(v).push(w);
        if (num(v) < num(w)) edgeCount++;
      }
    }
    if (edgeCount > maxRegionEdges) subAdj._truncated = true;
    return subAdj;
  }

  for (const [,cand] of candidatePairs){
    const { L, R, kind } = cand;
    const spanStart = bpEnd.get(L);
    const spanEnd   = R ? bpStart.get(R) : bpEnd.get(L); // for dangling, spanEnd==spanStart
    const refLenBp  = R ? Math.max(0, spanEnd - spanStart) : 0;

    const region = regionFor(L, R);
    const regionAdj = buildRegionAdj(region);

    // collect region edges (off-spine only for compactness)
    const spineSetLocal = new Set(spineNodes);
    const regionNodes = Array.from(region).filter(x=>!spineSetLocal.has(x));
    const regionEdges = [];
    for(const v of regionNodes){
      for(const nb of (adj.get(v)||[])){
        if (spineSetLocal.has(nb) || !region.has(nb) || v > nb) continue;
        const ek = graph.edges.has(edgeKeyOf(v,nb)) ? edgeKeyOf(v,nb) : edgeKeyOf(nb,v);
        regionEdges.push(ek);
      }
    }

    // sample multiple edge-disjoint shortest alt paths (including none for dangling)
    const paths = [];
    const mutableAdj = new Map();
    for(const [v,ns] of regionAdj) mutableAdj.set(v, ns ? ns.slice() : []);
    let truncatedPaths = false;

    function removeInteriorEdges(path){
      for(let i=0;i<path.length-1;i++){
        const a=path[i], b=path[i+1];
        const la = mutableAdj.get(a)||[], lb = mutableAdj.get(b)||[];
        const ia = la.indexOf(b); if (ia>=0) la.splice(ia,1);
        const ib = lb.indexOf(a); if (ib>=0) lb.splice(ib,1);
      }
    }

    if (R){
      for(let k=0;k<maxPathsPerEvent;k++){
        const allowSet = new Set(mutableAdj.keys());
        const path = dijkstraNodeWeighted(graph, mutableAdj, L, R, allowSet);
        if (!path) break;
        const altLenBp = path.slice(1,-1).reduce((s,id)=>s+(graph.nodes.get(id)?.lengthBp||0),0);
        paths.push({ nodes:path, edges: edgesForPath(graph, path), altLenBp });
        removeInteriorEdges(path);
      }
      // indicator if region seemed large enough but we capped
      truncatedPaths = (maxPathsPerEvent > 0 && (region.size>0) && paths.length===maxPathsPerEvent);
    }

    // base type
    let type = "simple_bubble";
    if (!R) type = "dangling";
    else if (L===R || refLenBp===0) type = "pill";

    // summarise paths
    const nPaths = paths.length;
    const minAlt = nPaths ? Math.min(...paths.map(p=>p.altLenBp)) : 0;
    const maxAlt = nPaths ? Math.max(...paths.map(p=>p.altLenBp)) : 0;

    events.push({
      id: R ? `${L}~${R}` : `${L}~null`,
      type,
      anchors: { leftId:L, rightId:R, spanStart, spanEnd, refLenBp, orientation:kind },
      region: {
        nodes: regionNodes,
        edges: regionEdges,
        truncated: !!(region._truncated || regionAdj._truncated)
      },
      paths,                          // sampled edge-disjoint alternatives (may be empty)
      stats: { nPaths, minAltLenBp:minAlt, maxAltLenBp:maxAlt, truncatedPaths },
      relations: { parentId:null, childrenIds:[], overlapGroup:null, sameAnchorGroup:null }
    });
  }

  // ----- 4) classify parallel / braid / nesting by intervals among R!=null events -----
  const proper = events.filter(e => e.anchors.rightId);      // exclude dangling
  // same-anchor groups (parallel detours)
  const sameKeyToGroup = new Map(); let sg=1;
  for(const e of proper){
    const k = `${e.anchors.leftId}|${e.anchors.rightId}`;
    if(!sameKeyToGroup.has(k)) sameKeyToGroup.set(k, sg++);
    e.relations.sameAnchorGroup = sameKeyToGroup.get(k);
  }
  // interval nesting/overlap
  const intervals = proper.map(e => ({ id:e.id, start:e.anchors.spanStart, end:e.anchors.spanEnd }));
  intervals.sort((a,b)=> a.start-b.start || a.end-b.end);
  // parents/children
  for(let i=0;i<intervals.length;i++){
    for(let j=i+1;j<intervals.length;j++){
      const A=intervals[i], B=intervals[j];
      const Ei = proper.find(e=>e.id===A.id), Ej = proper.find(e=>e.id===B.id);
      if (contains(A,B)){ Ej.relations.parentId = Ei.id; Ei.relations.childrenIds.push(Ej.id); }
      else if (contains(B,A)){ Ei.relations.parentId = Ej.id; Ej.relations.childrenIds.push(Ei.id); }
    }
  }
  // overlap groups (siblings that are not nested)
  let og=1;
  for(let i=0;i<intervals.length;i++){
    for(let j=i+1;j<intervals.length;j++){
      const A=intervals[i], B=intervals[j];
      if (overlaps(A,B) && !contains(A,B) && !contains(B,A)){
        const Ei = proper.find(e=>e.id===A.id), Ej = proper.find(e=>e.id===B.id);
        const gi = Ei.relations.overlapGroup, gj = Ej.relations.overlapGroup;
        const g = gi || gj || og++;
        Ei.relations.overlapGroup = g; Ej.relations.overlapGroup = g;
      }
    }
  }

  // annotate coarse type for multi-path vs braid
  for(const e of proper){
    if (e.type==="pill") continue;
    const sameAnchorPeers = proper.filter(x => x.relations.sameAnchorGroup===e.relations.sameAnchorGroup);
    const degMax = degreeMap(inducedAdjFull(graph.adj, new Set([e.anchors.leftId, e.anchors.rightId, ...e.region.nodes])));
    const maxDeg = Math.max(...degMax.values());
    if (sameAnchorPeers.length>1) e.type = "parallel_bundle";
    else if (e.relations.childrenIds.length || e.relations.overlapGroup) e.type = "braid";
    else e.type = "simple_bubble";
  }

  // ----- 5) (optional) off-spine components (context only) -----
  let offSpine = [];
  if (includeOffSpineComponents){
    const off = new Set(graph.nodes.keys());
    for(const s of spineNodes) off.delete(s);
    const seen=new Set();
    for(const v of off){
      if (seen.has(v)) continue;
      const comp=[]; const q=[v]; seen.add(v);
      while(q.length){
        const x=q.shift(); comp.push(x);
        for(const nb of (adj.get(x)||[])){
          if (spineSet.has(nb) || seen.has(nb)) continue;
          seen.add(nb); q.push(nb);
        }
      }
      // edges in component
      const edges=[];
      for(const x of comp){
        for(const nb of (adj.get(x)||[])){
          if (spineSet.has(nb) || comp.indexOf(nb)<0 || num(nb)<num(x)) continue;
          const ek = graph.edges.has(edgeKeyOf(x,nb)) ? edgeKeyOf(x,nb) : edgeKeyOf(nb,x);
          edges.push(ek);
        }
      }
      offSpine.push({ nodes: comp, edges, size: comp.length });
    }
  }

  return { spine, events, offSpine };
}
