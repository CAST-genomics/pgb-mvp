
import { parseSignedId, edgesForPath, degreeMap, dijkstraNodeWeighted, inducedAdjFull, contains, overlaps, num, edgeKeyOf } from "./assemblyWalkUtils.js"

// -------------------------------------------------------------
// assessGraphFeatures(graph, spineWalk, opts)
//  - graph: from createGraph(json)
//  - spineWalk: from createAssemblyWalk(graph, "GRCh38", { mode:"auto" })
// -------------------------------------------------------------
// -------------------------------------------------------------
// assessGraphFeatures(graph, spineWalk, opts)
//  - graph: from createGraph(json)
//  - spineWalk: from createAssemblyWalk(graph, "GRCh38", { mode:"auto" })
// -------------------------------------------------------------
function assessGraphFeatures(
    graph,
    spineWalk,
    {
        locusStartBp = 0,
        includeAdjacent = true,
        includeUpstream = true,
        allowMidSpineReentry = true,
        includeDangling = true,
        includeOffSpineComponents = true,
        maxPathsPerEvent = 8,
        maxRegionNodes = 5000,
        maxRegionEdges = 8000
    } = {}
){

    // ---------- 1) spine bp map ----------
    const chain = (spineWalk?.paths?.[0]?.nodes || []).slice();
    const adj = graph.adj;
    const spineSet = new Set(chain);
    const indexOnSpine = new Map(chain.map((id,i)=>[id,i]));

    const bpStart=new Map(), bpEnd=new Map();
    let acc=locusStartBp;
    for (const id of chain){
        bpStart.set(id, acc);
        acc += (graph.nodes.get(id)?.lengthBp || 0);
        bpEnd.set(id, acc);
    }
    const spine = {
        assemblyKey: spineWalk?.key || "spine",
        nodes: chain.map(id => ({
            id,
            bpStart: bpStart.get(id),
            bpEnd: bpEnd.get(id),
            lenBp: graph.nodes.get(id)?.lengthBp || 0
        })),
        edges: edgesForPath(graph, chain),
        lengthBp: (bpEnd.get(chain.at(-1)) || locusStartBp) - locusStartBp
    };

    const offNbrs = new Map();
    for (const v of chain) offNbrs.set(v, (adj.get(v)||[]).filter(u => !spineSet.has(u)));
    const spineWindow = (i,j) => new Set(chain.slice(Math.min(i,j), Math.max(i,j)+1));

    // ---------- 2) discover candidate anchors ----------
    const candidatePairs = new Map(); // key -> {L,R,kind}
    const visitedDanglingSets = new Set();

    function addPair(L,R,kind){
        const i=indexOnSpine.get(L), j=indexOnSpine.get(R);
        if (!includeAdjacent && j === i+1) return;
        if (!includeUpstream && j <= i)   return;
        const key = `${L}|${R}`;
        if (!candidatePairs.has(key)) candidatePairs.set(key, { L, R, kind });
    }

    for (const L of chain){
        const q=[...offNbrs.get(L)];
        const seen=new Set([L, ...offNbrs.get(L)]);
        let hitAny=false;
        while(q.length){
            const v=q.shift();
            for (const w of (adj.get(v)||[])){
                if (seen.has(w)) continue;
                seen.add(w);
                if (spineSet.has(w)){
                    hitAny=true;
                    const i=indexOnSpine.get(L), j=indexOnSpine.get(w);
                    if (w===L) addPair(L, L, "pill");
                    else addPair(L, w, (j>i) ? "forward" : "upstream");
                } else {
                    q.push(w);
                }
            }
        }
        if (includeDangling && !hitAny){
            const regionNodes = Array.from(seen).filter(x=>!spineSet.has(x));
            if (regionNodes.length){
                const sig = regionNodes.slice().sort((a,b)=>num(a)-num(b)).join(",");
                const key = `${L}|null:${sig}`;
                if (!visitedDanglingSets.has(sig)){
                    visitedDanglingSets.add(sig);
                    candidatePairs.set(key, { L, R:null, kind:"dangling" });
                }
            }
        }
    }

    // ---------- helpers for region + projection ----------
    function makeRegion(L, R){
        const growOff = seed => {
            const S=new Set([seed]);
            const q=(adj.get(seed)||[]).filter(x=>!spineSet.has(x));
            for (const x of q) S.add(x);
            while(q.length){
                const v=q.shift();
                for (const w of (adj.get(v)||[])){
                    if (S.has(w)) continue;
                    if (spineSet.has(w)) continue;
                    S.add(w); q.push(w);
                }
            }
            return S;
        };
        const Lset = growOff(L);
        let Rset = null;
        if (R) Rset = growOff(R);

        const region = new Set([L]); if (R) region.add(R);
        if (R){ for (const v of Lset) if (Rset.has(v)) region.add(v); }
        else   { for (const v of Lset) if (!spineSet.has(v)) region.add(v); }

        if (allowMidSpineReentry && R){
            const i=indexOnSpine.get(L), j=indexOnSpine.get(R);
            for (const s of spineWindow(i,j)) region.add(s);
        }
        return region;
    }

    function buildRegionAdj(region){
        const allow = new Set(region);
        const subAdj = new Map(); let edgeCount=0;
        for (const v of allow) subAdj.set(v, []);
        for (const v of allow){
            for (const w of (adj.get(v)||[])){
                if (!allow.has(w)) continue;
                subAdj.get(v).push(w);
                if (num(v) < num(w)) edgeCount++;
            }
        }
        return { subAdj, edgeCount };
    }

    // project nodes of a path to reference bp and alt-curve bp
    function decoratePath(pathNodes, spanStart, spanEnd){
        // alt cumulative uses interior node lengths only
        const len = id => (graph.nodes.get(id)?.lengthBp || 0);
        const interiorLens = pathNodes.map((id,idx) => (idx>0 && idx<pathNodes.length-1) ? len(id) : 0);
        const totalAlt = interiorLens.reduce((a,b)=>a+b,0);
        const spanLen = Math.max(0, spanEnd - spanStart);

        const details = [];
        let cum = 0;
        for (let i=0;i<pathNodes.length;i++){
            const id = pathNodes[i];
            const isSpine = spineSet.has(id);
            const nLen = len(id);

            // alt path coordinate for this node
            const altStartBp = cum;
            const altEndBp   = cum + (i>0 && i<pathNodes.length-1 ? nLen : 0);

            // reference projection
            let refBpStart, refBpEnd;
            if (isSpine && bpStart.has(id)){
                refBpStart = bpStart.get(id);
                refBpEnd   = bpEnd.get(id);
            } else {
                // proportional projection along [spanStart, spanEnd]
                const t0 = totalAlt>0 ? (altStartBp/totalAlt) : 0; // pills with one off node still have totalAlt>0
                const t1 = totalAlt>0 ? (altEndBp  /totalAlt) : t0;
                refBpStart = spanStart + t0 * spanLen;
                refBpEnd   = spanStart + t1 * spanLen;
            }

            details.push({ id, isSpine, lenBp: nLen, altStartBp, altEndBp, refBpStart, refBpEnd });
            if (i>0 && i<pathNodes.length-1) cum += nLen;
        }
        return { nodesDetailed: details, altPathLenBp: totalAlt };
    }

    // ---------- 3) build events ----------
    const events = [];
    for (const [,cand] of candidatePairs){
        const { L, R, kind } = cand;
        const region = makeRegion(L, R);
        if (region.size > maxRegionNodes) region._truncated = true;

        const { subAdj: regionAdj, edgeCount } = buildRegionAdj(region);
        if (edgeCount > maxRegionEdges) regionAdj._truncated = true;

        // region nodes & edges
        const regionNodes = Array.from(region).filter(x=>!spineSet.has(x));

        // off<->off edges (unique)
        const regionEdges = [];
        const offOffSeen = new Set();
        for (const v of regionNodes){
            for (const nb of (adj.get(v)||[])){
                if (!region.has(nb) || spineSet.has(nb)) continue;
                const a = num(v) < num(nb) ? v : nb;
                const b = a === v ? nb : v;
                const key = `${a}|${b}`;
                if (offOffSeen.has(key)) continue;
                offOffSeen.add(key);
                const ek = graph.edges.has(edgeKeyOf(a,b)) ? edgeKeyOf(a,b) : edgeKeyOf(b,a);
                regionEdges.push(ek);
            }
        }

        // off<->spine edges in region (anchors + mid-spine if allowed)
        const regionSpineNodes = Array.from(region).filter(id => spineSet.has(id));
        const regionSpineSet = new Set(regionSpineNodes);
        const anchorEdgesSet = new Set();
        for (const v of regionNodes){
            for (const nb of (adj.get(v)||[])){
                if (!regionSpineSet.has(nb)) continue;
                const ek = graph.edges.has(edgeKeyOf(v,nb)) ? edgeKeyOf(v,nb) : edgeKeyOf(nb,v);
                anchorEdgesSet.add(ek);
            }
        }
        const anchorEdges = Array.from(anchorEdgesSet);

        // anchors & span on reference
        const spanStart = bpEnd.get(L);
        const spanEnd   = R ? bpStart.get(R) : bpEnd.get(L);
        const refLenBp  = R ? Math.max(0, spanEnd - spanStart) : 0;

        // sample off-spine paths (skip pure spine hops; remove L<->R when encountered)
        const paths = [];
        const mutableAdj = new Map();
        for (const [v,ns] of regionAdj) mutableAdj.set(v, ns ? ns.slice() : []);
        let truncatedPaths = false;
        let removedSpineLeg = false;

        function removeInteriorEdges(nodePath){
            for (let i=0;i<nodePath.length-1;i++){
                const a=nodePath[i], b=nodePath[i+1];
                const la=mutableAdj.get(a)||[], lb=mutableAdj.get(b)||[];
                const ia=la.indexOf(b); if (ia>=0) la.splice(ia,1);
                const ib=lb.indexOf(a); if (ib>=0) lb.splice(ib,1);
            }
        }

        if (R){
            for (let k=0;k<maxPathsPerEvent;k++){
                const allowSet = new Set(mutableAdj.keys());
                const path = dijkstraNodeWeighted(graph, mutableAdj, L, R, allowSet);
                if (!path) break;

                // filter out pure spine hop; also remove direct L<->R so we can find alt route next
                const interior = path.slice(1,-1);
                const hasOffSpineInterior = interior.some(id => !spineSet.has(id));
                if (!hasOffSpineInterior){
                    removedSpineLeg = true;
                    const la = mutableAdj.get(L) || [];
                    const lb = mutableAdj.get(R) || [];
                    if (la.includes(R)) mutableAdj.set(L, la.filter(x=>x!==R));
                    if (lb.includes(L)) mutableAdj.set(R, lb.filter(x=>x!==L));
                    continue;
                }

                const { nodesDetailed, altPathLenBp } = decoratePath(path, spanStart, spanEnd);
                const altLenBp = nodesDetailed.reduce((s,n) => s + (n.altEndBp - n.altStartBp), 0); // same as altPathLenBp

                paths.push({
                    nodes: path,
                    edges: edgesForPath(graph, path),
                    altLenBp,
                    altPathLenBp,
                    nodesDetailed
                });

                removeInteriorEdges(path);
            }
            truncatedPaths = (maxPathsPerEvent > 0) && (paths.length === maxPathsPerEvent);
        }

        // base type
        let type = "simple_bubble";
        if (!R) type = "dangling";
        else if (L===R || refLenBp===0) type = "pill";

        events.push({
            id: R ? `${L}~${R}` : `${L}~null`,
            type,
            anchors: {
                leftId: L,
                rightId: R,
                spanStart,
                spanEnd,
                refLenBp,
                orientation: kind,
                leftBpStart: bpStart.get(L),
                leftBpEnd: bpEnd.get(L),
                rightBpStart: R ? bpStart.get(R) : null,
                rightBpEnd:   R ? bpEnd.get(R)   : null
            },
            region: {
                nodes: regionNodes,
                edges: regionEdges,
                anchorEdges,
                truncated: !!(region._truncated || regionAdj._truncated)
            },
            paths,
            stats: {
                nPaths: paths.length,
                minAltLenBp: paths.length ? Math.min(...paths.map(p=>p.altLenBp)) : 0,
                maxAltLenBp: paths.length ? Math.max(...paths.map(p=>p.altLenBp)) : 0,
                truncatedPaths,
                removedSpineLeg
            },
            relations: { parentId:null, childrenIds:[], overlapGroup:null, sameAnchorGroup:null }
        });
    }

    // ---------- 4) interval relations & coarse classes ----------
    const proper = events.filter(e => e.anchors.rightId);

    const sameKeyToGroup = new Map(); let sg=1;
    for (const e of proper){
        const k = `${e.anchors.leftId}|${e.anchors.rightId}`;
        if (!sameKeyToGroup.has(k)) sameKeyToGroup.set(k, sg++);
        e.relations.sameAnchorGroup = sameKeyToGroup.get(k);
    }

    const intervals = proper.map(e => ({ id: e.id, start: Math.min(e.anchors.spanStart, e.anchors.spanEnd), end: Math.max(e.anchors.spanStart, e.anchors.spanEnd) }));
    intervals.sort((a,b)=> a.start-b.start || a.end-b.end);

    const byId = new Map(proper.map(e=>[e.id, e]));
    for (let i=0;i<intervals.length;i++){
        for (let j=i+1;j<intervals.length;j++){
            const A=intervals[i], B=intervals[j];
            const Ei=byId.get(A.id), Ej=byId.get(B.id);
            if (contains(A,B)){ Ej.relations.parentId = Ei.id; Ei.relations.childrenIds.push(Ej.id); }
            else if (contains(B,A)){ Ei.relations.parentId = Ej.id; Ej.relations.childrenIds.push(Ei.id); }
        }
    }

    let og=1;
    for (let i=0;i<intervals.length;i++){
        for (let j=i+1;j<intervals.length;j++){
            const A=intervals[i], B=intervals[j];
            if (overlaps(A,B) && !contains(A,B) && !contains(B,A)){
                const Ei=byId.get(A.id), Ej=byId.get(B.id);
                const g = Ei.relations.overlapGroup || Ej.relations.overlapGroup || og++;
                Ei.relations.overlapGroup = g; Ej.relations.overlapGroup = g;
            }
        }
    }

    for (const e of proper){
        if (e.type === "pill") continue;
        const peers = proper.filter(x => x.relations.sameAnchorGroup === e.relations.sameAnchorGroup);
        if (peers.length > 1) { e.type = "parallel_bundle"; continue; }
        if (e.relations.childrenIds.length || e.relations.overlapGroup) { e.type = "braid"; continue; }
        e.type = "simple_bubble";
    }

    // ---------- 5) off-spine components (context only) ----------
    let offSpine = [];
    if (includeOffSpineComponents){
        const off = new Set(graph.nodes.keys());
        for (const s of chain) off.delete(s);
        const seen=new Set();
        for (const v of off){
            if (seen.has(v)) continue;
            const comp=[]; const q=[v]; seen.add(v);
            while(q.length){
                const x=q.shift(); comp.push(x);
                for (const nb of (adj.get(x)||[])){
                    if (spineSet.has(nb) || seen.has(nb)) continue;
                    seen.add(nb); q.push(nb);
                }
            }
            const edges=[];
            for (const x of comp){
                for (const nb of (adj.get(x)||[])){
                    if (spineSet.has(nb)) continue;
                    if (comp.indexOf(nb) < 0) continue;
                    if (num(nb) < num(x)) continue;
                    const ek = graph.edges.has(edgeKeyOf(x,nb)) ? edgeKeyOf(x,nb) : edgeKeyOf(nb,x);
                    edges.push(ek);
                }
            }
            offSpine.push({ nodes: comp, edges, size: comp.length });
        }
    }

    return { spine, events, offSpine };
}

export {assessGraphFeatures }
