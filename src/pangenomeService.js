// PangenomeService.js — refreshed build (2025‑08‑20)
// Plain JavaScript (ES Module). No external deps. Drop‑in replacement.
//
// Highlights in this refresh:
//  - Patch A: more defensive #decideMode for tiny/degenerate components
//  - Patch B: robust #extractPathBlockCut (singleton/cycle fallbacks)
//  - Patch C: call‑site fallback in createAssemblyWalk (never drop comps)
//  - Path sampling bugfix in assessGraphFeatures: Dijkstra runs on MUTABLE
//    adjacency; edges consumed between iterations; duplicate guard
//  - Convenience: setActiveSpine / getBpExtent / getProjectedBpInEvent /
//    getAnyBpExtent / indexWalkBpExtents helpers
//  - Key indexing accepts both "#" and "|" delimiters for assembly keys

import { reverseComplement } from "./utils/genomicUtils.js"

class PangenomeService {
    constructor(json = null) {
        this.graph = null;
        // active spine bp lookups for tooltips
        this._spineKey = null;
        this._bpStart = null; // Map<nodeId, number>
        this._bpEnd = null;   // Map<nodeId, number>
        if (json) this.createGraph(json);
    }

    // ========================= Public API =========================

    /**
     * Parse input JSON to internal graph.
     * - nodes: Map<id, { id, sign, bareId, lengthBp, assemblies[], seq? }>
     * - edges: Map<edgeKey, { a, b, variants[] }>, where edgeKey = `edge:${a}:${b}`
     * - adj:   Map<id, string[]> (undirected neighbor list for traversal)
     * - index: { byAssembly: Map<assemblyKey, Set<nodeId>> }
     */
    createGraph(json) {
        if (!json || typeof json !== "object") throw new Error("createGraph: bad JSON");

        const nodes = new Map();
        const edges = new Map();
        const adjSet = new Map();
        const index = { byAssembly: new Map() };

        const seqObj  = json.sequence || {};   // { id: "ACGT..." }
        const nodeObj = json.node     || {};   // { id: { length?, assembly?[] } }
        const rawEdges = Array.isArray(json.edge) ? json.edge : [];

        const parseSignedId = (id) => {
            const m = String(id).match(/^(.+?)([+-])$/);
            if (!m) throw new Error(`Node id "${id}" must end with + or -`);
            return { bare: m[1], sign: m[2] };
        };

        // ---- nodes
        for (const id in nodeObj) {
            const n = nodeObj[id] || {};
            const { bare, sign } = parseSignedId(id);

            // Accept both | and # forms; index both so either works
            const assemblies = [];
            const assemblyArr = Array.isArray(n.assembly) ? n.assembly : [];
            for (const a of assemblyArr) {
                if (!a) continue;
                const name = a.assembly_name;
                const hap  = a.haplotype;
                const seq  = a.sequence_id;
                if (name) assemblies.push(name);
                if (name && hap != null && seq != null) {
                    const parts = [name, hap, seq];
                    const kHash = parts.join("#");
                    const kPipe = parts.join("|");
                    assemblies.push(kHash, kPipe);
                }
            }

            const seqLen = typeof seqObj[id] === "string" ? seqObj[id].length : undefined;
            const lengthBp = Number.isFinite(n.length) ? Number(n.length)
                : Number.isFinite(seqLen)    ? seqLen
                    : 0;

            const rec = { id, sign, bareId: bare, lengthBp, assemblies, seq: seqObj[id] };
            nodes.set(id, rec);
            adjSet.set(id, new Set());

            for (const key of assemblies) {
                if (!index.byAssembly.has(key)) index.byAssembly.set(key, new Set());
                index.byAssembly.get(key).add(id);
            }
        }

        // ---- edges
        const edgeKeyOf = (a, b) => `edge:${a}:${b}`;
        rawEdges.forEach((e, i) => {
            const from = e.starting_node;
            const to   = e.ending_node;
            if (!nodes.has(from) || !nodes.has(to)) return; // ignore out-of-scope
            const ek = edgeKeyOf(from, to);
            if (!edges.has(ek)) edges.set(ek, { a: from, b: to, variants: [] });
            edges.get(ek).variants.push({ rawIndex: i, from, to });
            // undirected view for traversal
            adjSet.get(from).add(to);
            adjSet.get(to).add(from);
        });

        const adj = new Map();
        for (const [id, set] of adjSet) adj.set(id, Array.from(set));

        this.graph = { nodes, edges, adj, index };
        return this.graph;
    }

    listAssemblyKeys() {
        this.#requireGraph();
        return Array.from(this.graph.index.byAssembly.keys()).sort();
    }

    /**
     * Extract a walk (simple chain) per keyed connected component.
     * mode: "auto" | "endpoint" | "blockcut"
     */
    createAssemblyWalk(key, { mode = "auto", startNodeId = null, directionPolicy = "asFound" } = {}) {


        this.#requireGraph();
        const g = this.graph;
        const nodeSet = g.index.byAssembly.get(key);

        const diagnostics = { inducedNodes: 0, inducedEdges: 0, modeUsed: mode, warnings: [] };
        if (!nodeSet || nodeSet.size === 0) {
            return { key, paths: [], diagnostics };
        }

        const indAdj = this.#inducedAdj(g.adj, nodeSet);

        let inducedEdges = 0;
        for (const [, nbrs] of indAdj) inducedEdges += (nbrs?.length || 0);
        diagnostics.inducedNodes = nodeSet.size;
        diagnostics.inducedEdges = Math.floor(inducedEdges / 2);

        const comps = this.#connectedComponents(indAdj);
        const paths = [];

        for (const comp of comps) {
            const subAdj = new Map(comp.map(id => [id, indAdj.get(id)]));
            const actualMode = (mode === "auto") ? this.#decideMode(subAdj, comp) : mode;

            // ---- Patch C: robust selection + fallbacks
            let nodes = (actualMode === "endpoint")
                ? this.#extractPathEndpointWalk(subAdj, comp)
                : this.#extractPathBlockCut(subAdj, comp);

            if (!nodes || nodes.length === 0) {
                nodes = this.#extractPathEndpointWalk(subAdj, comp);
            }
            if ((!nodes || nodes.length === 0) && comp.length === 1) {
                nodes = [comp[0]];
            }
            if (!nodes || nodes.length === 0) {
                diagnostics.warnings.push(`empty walk for component of ${key} (size=${comp.length})`);
                continue;
            }

            const edgesOnPath = [];
            for (let i = 0; i < nodes.length - 1; i++) {
                const a = nodes[i], b = nodes[i + 1];
                const ekF = this.#edgeKeyOf(a, b), ekR = this.#edgeKeyOf(b, a);
                if (g.edges.has(ekF)) edgesOnPath.push(ekF);
                else if (g.edges.has(ekR)) edgesOnPath.push(ekR);
                else diagnostics.warnings.push(`No edge found between ${a} and ${b} for ${key}`);
            }

            const bpLen = nodes.reduce((s, id) => s + (g.nodes.get(id)?.lengthBp || 0), 0);
            paths.push({ nodes, edges: edgesOnPath, leftEndpoint: nodes[0], rightEndpoint: nodes[nodes.length - 1], bpLen, modeUsed: actualMode });
        }

        // Orient each path deterministically and recompute edges to match
        this._normalizePathDirections(paths, { startNodeId, directionPolicy });

        return { key, paths, diagnostics };
    }

    createAssemblyWalks({ keys = null, mode = "auto", startNodeId = null, directionPolicy = "asFound" } = {}) {

        this.#requireGraph();

        const all = keys ? keys : this.listAssemblyKeys();

        // Resolve per-assembly start node. Supports:
        //  - string (same start node for every assembly),
        //  - Map<string,string>,
        //  - plain object { [assemblyKey]: nodeId },
        //  - function (key) => nodeId | null
        const resolveStart = (key) => {
            if (!startNodeId) return null;
            if (typeof startNodeId === "string") return startNodeId;
            if (typeof startNodeId === "function") return startNodeId(key);
            if (startNodeId instanceof Map) return startNodeId.get(key) || null;
            if (typeof startNodeId === "object") return startNodeId[key] || null;
            return null;
        }

        return all.map(k => this.createAssemblyWalk(k, {
            mode,
            startNodeId: resolveStart(k),
            directionPolicy
        }))
    }

    /** Analyze features relative to the provided spine walk. */
    assessGraphFeatures(spineWalk, {
        locusStartBp = 0,
        includeAdjacent = true,
        includeUpstream = true,
        allowMidSpineReentry = true,
        includeDangling = true,
        includeOffSpineComponents = true,
        nestRegions = "none",               // NEW: "none" | "shallow"
        maxPathsPerEvent = 8,
        maxRegionNodes = 5000,
        maxRegionEdges = 8000
    } = {}) {
        this.#requireGraph();
        const g = this.graph;
        const edgeKeyOf = (a, b) => `edge:${a}:${b}`;

        // ---- spine chain & maps
        const chain = (spineWalk?.paths?.[0]?.nodes || []).slice();
        const spineSet = new Set(chain);
        const indexOnSpine = new Map(chain.map((id, i) => [id, i]));

        const bpStart = new Map(), bpEnd = new Map();
        let acc = locusStartBp;
        for (const id of chain) {
            bpStart.set(id, acc);
            acc += (g.nodes.get(id)?.lengthBp || 0);
            bpEnd.set(id, acc);
        }

        const edgesForPath = (nodes) => {
            const out = [];
            for (let i = 0; i < nodes.length - 1; i++) {
                const a = nodes[i], b = nodes[i + 1];
                const ekF = edgeKeyOf(a, b), ekR = edgeKeyOf(b, a);
                if (g.edges.has(ekF)) out.push(ekF);
                else if (g.edges.has(ekR)) out.push(ekR);
            }
            return out;
        };

        const spine = {
            assemblyKey: spineWalk?.key || "spine",
            nodes: chain.map(id => ({ id, bpStart: bpStart.get(id), bpEnd: bpEnd.get(id), lenBp: g.nodes.get(id)?.lengthBp || 0 })),
            edges: edgesForPath(chain),
            lengthBp: (bpEnd.get(chain.at(-1)) || locusStartBp) - locusStartBp
        };

        // ---- neighbor discovery
        const offNbrs = new Map();
        for (const v of chain) offNbrs.set(v, (g.adj.get(v) || []).filter(u => !spineSet.has(u)));

        const spineWindow = (i, j) => new Set(chain.slice(Math.min(i, j), Math.max(i, j) + 1));

        // ---- candidate anchor pairs
        const candidatePairs = new Map(); // key -> { L, R, kind }
        const visitedDanglingSets = new Set();

        const addPair = (L, R, kind) => {
            const i = indexOnSpine.get(L);
            const j = (R != null) ? indexOnSpine.get(R) : null;
            if (R != null) {
                if (!includeAdjacent && j === i + 1) return;
                if (!includeUpstream && j <= i) return;
            }
            const key = `${L}|${R}`;
            if (!candidatePairs.has(key)) candidatePairs.set(key, { L, R, kind });
        };

        // BFS from each spine node through off‑spine, collecting any spine re‑entry
        for (const L of chain) {
            const q = [...offNbrs.get(L)];
            const seen = new Set([L, ...offNbrs.get(L)]);
            let hitAny = false;
            while (q.length) {
                const v = q.shift();
                for (const w of (g.adj.get(v) || [])) {
                    if (seen.has(w)) continue;
                    seen.add(w);
                    if (spineSet.has(w)) {
                        hitAny = true;
                        const i = indexOnSpine.get(L), j = indexOnSpine.get(w);
                        if (w === L) addPair(L, L, "pill");
                        else addPair(L, w, (j > i) ? "forward" : "upstream");
                    } else {
                        q.push(w);
                    }
                }
            }
            if (includeDangling && !hitAny) {
                const regionNodes = Array.from(seen).filter(x => !spineSet.has(x));
                if (regionNodes.length) {
                    const sig = regionNodes.slice().sort((a, b) => this.#num(a) - this.#num(b)).join(",");
                    if (!visitedDanglingSets.has(sig)) {
                        visitedDanglingSets.add(sig);
                        candidatePairs.set(`${L}|null:${sig}`, { L, R: null, kind: "dangling" });
                    }
                }
            }
        }

        // ---- utilities
        const buildRegion = (L, R) => {
            const growOff = (seed) => {
                const S = new Set([seed]);
                const q = (g.adj.get(seed) || []).filter(x => !spineSet.has(x));
                for (const x of q) S.add(x);
                while (q.length) {
                    const v = q.shift();
                    for (const w of (g.adj.get(v) || [])) {
                        if (S.has(w) || spineSet.has(w)) continue;
                        S.add(w); q.push(w);
                    }
                }
                return S;
            };

            const region = new Set([L]);
            const Lset = growOff(L);
            let Rset = null;
            if (R) { Rset = growOff(R); region.add(R); }

            if (R) {
                for (const v of Lset) if (Rset.has(v)) region.add(v);
            } else {
                for (const v of Lset) if (!spineSet.has(v)) region.add(v);
            }
            return region;
        };

        const buildRegionAdj = (region, allowMid) => {
            const allow = new Set(region);
            if (allowMid) {
                // Already contains L/R; optionally include mid‑spine window later
            }
            const subAdj = new Map(); let edgeCount = 0;
            for (const v of allow) subAdj.set(v, []);
            for (const v of allow) {
                for (const w of (g.adj.get(v) || [])) {
                    if (!allow.has(w)) continue;
                    subAdj.get(v).push(w);
                    if (this.#num(v) < this.#num(w)) edgeCount++;
                }
            }
            return { subAdj, edgeCount };
        };

        const dijkstraNodeWeighted = (subAdj, s, t, allow) => {
            const A = allow || new Set(subAdj.keys());
            if (!A.has(s) || !A.has(t)) return null;
            const w = id => (g.nodes.get(id)?.lengthBp || 0);
            const dist = new Map(), prev = new Map(), done = new Set();
            for (const v of A) dist.set(v, Infinity);
            dist.set(s, 0);
            while (true) {
                let u = null, best = Infinity;
                for (const [v, d] of dist) if (!done.has(v) && d < best) { best = d; u = v; }
                if (u === null) break;
                done.add(u);
                if (u === t) break;
                for (const nb of (subAdj.get(u) || [])) {
                    if (!A.has(nb) || done.has(nb)) continue;
                    const alt = dist.get(u) + (nb === t ? 0 : w(nb));
                    if (alt < dist.get(nb)) { dist.set(nb, alt); prev.set(nb, u); }
                }
            }
            if (!prev.has(t)) return null;
            const path = [t]; let cur = prev.get(t);
            while (cur) { path.push(cur); cur = prev.get(cur); }
            path.reverse();
            return path;
        };

        const decoratePath = (pathNodes, spanStart, spanEnd) => {
            const len = id => (g.nodes.get(id)?.lengthBp || 0);
            const interior = pathNodes.slice(1, -1);
            const totalAlt = interior.reduce((s, id) => s + len(id), 0);
            const spanLen = Math.max(0, spanEnd - spanStart);
            const details = [];
            let cum = 0;
            for (let i = 0; i < pathNodes.length; i++) {
                const id = pathNodes[i];
                const isSpine = spineSet.has(id);
                const nLen = len(id);
                const addLen = (i > 0 && i < pathNodes.length - 1) ? nLen : 0;
                const altStartBp = cum, altEndBp = cum + addLen;

                let refBpStart, refBpEnd;
                if (isSpine && bpStart.has(id)) {
                    refBpStart = bpStart.get(id);
                    refBpEnd = bpEnd.get(id);
                } else {
                    const t0 = totalAlt > 0 ? (altStartBp / totalAlt) : 0;
                    const t1 = totalAlt > 0 ? (altEndBp / totalAlt) : t0;
                    refBpStart = spanStart + t0 * spanLen;
                    refBpEnd   = spanStart + t1 * spanLen;
                }
                details.push({ id, isSpine, lenBp: nLen, altStartBp, altEndBp, refBpStart, refBpEnd });
                if (addLen > 0) cum += nLen;
            }
            return { nodesDetailed: details, altPathLenBp: totalAlt };
        };

        // ---- Build events
        const events = [];

        const removePathEdges = (adj, nodePath) => {
            // Remove consecutive pairs from adj (both directions); return count
            let removed = 0;
            for (let i = 0; i < nodePath.length - 1; i++) {
                const a = nodePath[i], b = nodePath[i + 1];
                const la = adj.get(a) || [], lb = adj.get(b) || [];
                const ia = la.indexOf(b); if (ia >= 0) { la.splice(ia, 1); removed++; }
                const ib = lb.indexOf(a); if (ib >= 0) { lb.splice(ib, 1); removed++; }
            }
            return removed;
        };
        const pathSignature = (path) => (path || []).join(">");

        for (const [, cand] of candidatePairs) {
            const { L, R, kind } = cand;

            // region discovery
            let region = buildRegion(L, R);
            if (allowMidSpineReentry && R) {
                const i = indexOnSpine.get(L), j = indexOnSpine.get(R);
                for (const s of spineWindow(i, j)) region.add(s);
            }
            const regionTooBig = region.size > maxRegionNodes;
            const { subAdj: regionAdj, edgeCount } = buildRegionAdj(region, allowMidSpineReentry);
            const adjTooBig = edgeCount > maxRegionEdges;

            const regionNodes = Array.from(region).filter(x => !spineSet.has(x));

            // off<->off unique edges
            const regionEdges = [];
            const offOffSeen = new Set();
            for (const v of regionNodes) {
                for (const nb of (g.adj.get(v) || [])) {
                    if (!region.has(nb) || spineSet.has(nb)) continue;
                    const a = this.#num(v) < this.#num(nb) ? v : nb;
                    const b = (a === v) ? nb : v;
                    const key = `${a}|${b}`;
                    if (offOffSeen.has(key)) continue;
                    offOffSeen.add(key);
                    const ek = g.edges.has(edgeKeyOf(a, b)) ? edgeKeyOf(a, b) : edgeKeyOf(b, a);
                    regionEdges.push(ek);
                }
            }

            // off<->spine anchor edges inside region
            const regionSpineNodes = Array.from(region).filter(id => spineSet.has(id));
            const regionSpineSet = new Set(regionSpineNodes);
            const anchorEdgesSet = new Set();
            for (const v of regionNodes) {
                for (const nb of (g.adj.get(v) || [])) {
                    if (!regionSpineSet.has(nb)) continue;
                    const ek = g.edges.has(edgeKeyOf(v, nb)) ? edgeKeyOf(v, nb) : edgeKeyOf(nb, v);
                    anchorEdgesSet.add(ek);
                }
            }
            const anchorEdges = Array.from(anchorEdgesSet);

            // anchors in bp space
            const spanStart = bpEnd.get(L);
            const spanEnd   = R ? bpStart.get(R) : bpEnd.get(L);
            const refLenBp  = R ? Math.max(0, spanEnd - spanStart) : 0;

            // path sampling (edge‑disjoint Dijkstra on MUTABLE adjacency)
            const paths = [];
            const mutableAdj = new Map();
            for (const [v, ns] of regionAdj) mutableAdj.set(v, ns ? ns.slice() : []);
            let truncatedPaths = false;
            let removedSpineLeg = false;
            const seenSigs = new Set();

            if (R) {
                for (let k = 0; k < maxPathsPerEvent; k++) {
                    const allowSet = new Set(mutableAdj.keys());
                    // ✅ bugfix: run on mutableAdj, not the original regionAdj
                    const path = dijkstraNodeWeighted(mutableAdj, L, R, allowSet);
                    if (!path) break;

                    const interior = path.slice(1, -1);
                    const hasOffSpineInterior = interior.some(id => !spineSet.has(id));
                    if (!hasOffSpineInterior) {
                        removedSpineLeg = true;
                        // actively remove the direct L—R edge so it cannot recur
                        removePathEdges(mutableAdj, [L, R]);
                        continue;
                    }

                    const sig = pathSignature(path);
                    if (seenSigs.has(sig)) break; // duplicate guard
                    seenSigs.add(sig);

                    const { nodesDetailed, altPathLenBp } = decoratePath(path, spanStart, spanEnd);
                    paths.push({ nodes: path, edges: edgesForPath(path), altLenBp: altPathLenBp, altPathLenBp, nodesDetailed });

                    const removed = removePathEdges(mutableAdj, path);
                    if (removed === 0) break; // no progress → stop
                }
                truncatedPaths = (maxPathsPerEvent > 0) && (paths.length === maxPathsPerEvent);
            }

            let type = "simple_bubble";
            if (!R) type = "dangling";
            else if (L === R || refLenBp === 0) type = "pill";

            const evt = {
                id: R ? `${L}~${R}` : `${L}~null`,
                type,
                anchors: {
                    leftId: L,
                    rightId: R,
                    spanStart,
                    spanEnd,
                    refLenBp,
                    orientation: kind,
                    leftBpStart: bpStart.get(L), leftBpEnd: bpEnd.get(L),
                    rightBpStart: R ? bpStart.get(R) : null, rightBpEnd: R ? bpEnd.get(R) : null
                },
                region: { nodes: regionNodes, edges: regionEdges, anchorEdges, truncated: !!(regionTooBig || adjTooBig) },
                paths,
                stats: {
                    nPaths: paths.length,
                    minAltLenBp: paths.length ? Math.min(...paths.map(p => p.altLenBp)) : 0,
                    maxAltLenBp: paths.length ? Math.max(...paths.map(p => p.altLenBp)) : 0,
                    truncatedPaths,
                    removedSpineLeg
                },
                relations: { parentId: null, childrenIds: [], overlapGroup: null, sameAnchorGroup: null }
            };

            // NEW: optional shallow nesting of region events
            if (nestRegions === "shallow") {
                evt.innerEvents = this._assessInnerForEvent(evt, {
                    locusStartBp,
                    includeAdjacent,
                    includeUpstream: false,          // avoid mirror duplicates inside
                    allowMidSpineReentry,
                    includeDangling: false,          // keep inner tight to L..R
                    includeOffSpineComponents: false,
                    nestRegions: "none",            // prevent infinite recursion
                    maxPathsPerEvent,
                    maxRegionNodes,
                    maxRegionEdges
                });
            }

            events.push(evt);
        }

        // ---- relations (same anchors, nesting, overlaps)
        const proper = events.filter(e => e.anchors.rightId);
        const sameKeyToGroup = new Map(); let sg = 1;
        for (const e of proper) {
            const k = `${e.anchors.leftId}|${e.anchors.rightId}`;
            if (!sameKeyToGroup.has(k)) sameKeyToGroup.set(k, sg++);
            e.relations.sameAnchorGroup = sameKeyToGroup.get(k);
        }

        const intervals = proper.map(e => ({
            id: e.id,
            start: Math.min(e.anchors.spanStart, e.anchors.spanEnd),
            end:   Math.max(e.anchors.spanStart, e.anchors.spanEnd)
        })).sort((a, b) => a.start - b.start || a.end - b.end);

        const byId = new Map(proper.map(e => [e.id, e]));
        const contains = (A, B) => A.start <= B.start && A.end >= B.end;
        const overlaps = (A, B) => !(A.end <= B.start || B.end <= A.start);

        for (let i = 0; i < intervals.length; i++) {
            for (let j = i + 1; j < intervals.length; j++) {
                const A = intervals[i], B = intervals[j];
                const Ei = byId.get(A.id), Ej = byId.get(B.id);
                if (contains(A, B)) { Ej.relations.parentId = Ei.id; Ei.relations.childrenIds.push(Ej.id); }
                else if (contains(B, A)) { Ei.relations.parentId = Ej.id; Ej.relations.childrenIds.push(Ei.id); }
            }
        }

        let og = 1;
        for (let i = 0; i < intervals.length; i++) {
            for (let j = i + 1; j < intervals.length; j++) {
                const A = intervals[i], B = intervals[j];
                if (overlaps(A, B) && !contains(A, B) && !contains(B, A)) {
                    const Ei = byId.get(A.id), Ej = byId.get(B.id);
                    const gId = Ei.relations.overlapGroup || Ej.relations.overlapGroup || og++;
                    Ei.relations.overlapGroup = gId; Ej.relations.overlapGroup = gId;
                }
            }
        }

        for (const e of proper) {
            if (e.type === "pill") continue;
            const peers = proper.filter(x => x.relations.sameAnchorGroup === e.relations.sameAnchorGroup);
            if (peers.length > 1) { e.type = "parallel_bundle"; continue; }
            if (e.relations.childrenIds.length || e.relations.overlapGroup) { e.type = "braid"; continue; }
            e.type = "simple_bubble";
        }

        // ---- off‑spine components (context)
        const offSpine = [];
        if (includeOffSpineComponents) {
            const off = new Set(g.nodes.keys());
            for (const s of chain) off.delete(s);
            const seen = new Set();
            for (const v of off) {
                if (seen.has(v)) continue;
                const comp = []; const q = [v]; seen.add(v);
                while (q.length) {
                    const x = q.shift(); comp.push(x);
                    for (const nb of (g.adj.get(x) || [])) {
                        if (spineSet.has(nb) || seen.has(nb)) continue;
                        seen.add(nb); q.push(nb);
                    }
                }
                const eds = [];
                for (const x of comp) {
                    for (const nb of (g.adj.get(x) || [])) {
                        if (spineSet.has(nb)) continue;
                        if (comp.indexOf(nb) < 0) continue;
                        if (this.#num(nb) < this.#num(x)) continue;
                        const ek = g.edges.has(edgeKeyOf(x, nb)) ? edgeKeyOf(x, nb) : edgeKeyOf(nb, x);
                        eds.push(ek);
                    }
                }
                offSpine.push({ nodes: comp, edges: eds, size: comp.length });
            }
        }

        return { spine, events, offSpine };
    }

    // ========================= Tooltip helpers =========================
    setActiveSpine(spine) {
        this._spineKey = spine?.assemblyKey || null;
        this._bpStart = new Map();
        this._bpEnd   = new Map();
        if (spine && Array.isArray(spine.nodes)) {
            for (const n of spine.nodes) {
                this._bpStart.set(n.id, n.bpStart);
                this._bpEnd.set(n.id, n.bpEnd);
            }
        }
        return this._spineKey;
    }

    /** True bp on current spine (or null). */
    getBpExtent(nodeId) {
        if (!this._bpStart || !this._bpEnd) return null;
        if (!this._bpStart.has(nodeId)) return null;
        return { bpStart: this._bpStart.get(nodeId), bpEnd: this._bpEnd.get(nodeId), onSpine: true, projected: false };
    }

    /** True bp mapping for any given walk (returns Map<nodeId,{bpStart,bpEnd}>). */
    indexWalkBpExtents(walk) {
        const m = new Map();
        const nodes = walk?.paths?.[0]?.nodes || [];
        let acc = 0;
        for (const id of nodes) {
            const len = this.graph?.nodes.get(id)?.lengthBp || 0;
            m.set(id, { bpStart: acc, bpEnd: acc + len });
            acc += len;
        }
        return m;
    }

    /** Projected bp for off‑spine nodes within a specific event (or true for mid‑spine). */
    getProjectedBpInEvent(nodeId, event) {
        if (!event || !Array.isArray(event.paths)) return null;
        if (nodeId === event.anchors.leftId)  return { bpStart: event.anchors.spanStart, bpEnd: event.anchors.spanStart, onSpine: true, projected: false };
        if (event.anchors.rightId && nodeId === event.anchors.rightId) return { bpStart: event.anchors.spanEnd, bpEnd: event.anchors.spanEnd, onSpine: true, projected: false };
        for (const p of event.paths) {
            if (!Array.isArray(p.nodesDetailed)) continue;
            for (const d of p.nodesDetailed) {
                if (d.id === nodeId) return { bpStart: d.refBpStart, bpEnd: d.refBpEnd, onSpine: !!d.isSpine, projected: !d.isSpine };
            }
        }
        return null;
    }

    /** Prefer true spine bp, else projected in any event, else null. */
    getAnyBpExtent(nodeId, features) {
        const s = this.getBpExtent(nodeId);
        if (s) return s;
        if (features && Array.isArray(features.events)) {
            for (const ev of features.events) {
                const hit = this.getProjectedBpInEvent(nodeId, ev);
                if (hit) return hit;
            }
        }
        return null;
    }

    // ========================= Region nesting (shallow) =========================
    _assessInnerForEvent(event, opts) {
        const L = event.anchors.leftId, R = event.anchors.rightId;
        // 1) choose a local spine chain inside the region
        let localChain = null;
        if (R && event.paths && event.paths[0] && Array.isArray(event.paths[0].nodesDetailed)) {
            localChain = event.paths[0].nodesDetailed.map(d => d.id);
        } else if (!R) {
            const loop = this.#findLocalLoopThrough(event.region.nodes, L);
            if (loop && loop.length >= 3) localChain = loop; // L ... L
        }
        if (!localChain || localChain.length < 2) return [];

        // 2) build subgraph restricted to region + anchors
        const regionSet = new Set(event.region.nodes.concat([L, R].filter(Boolean)));
        const sub = this.#makeSubgraph(regionSet);

        // 3) run detector on the subgraph with the local spine
        const subSvc = new PangenomeService();
        subSvc.graph = sub;
        const localWalk = { key: "local", paths: [{ nodes: localChain, edges: [], bpLen: 0 }] };
        const inner = subSvc.assessGraphFeatures(localWalk, { ...opts, nestRegions: "none", includeOffSpineComponents: false });
        return inner.events || [];
    }

    #makeSubgraph(nodeSet) {
        const g = this.graph;
        const nodes = new Map();
        const edges = new Map();
        const adj = new Map();
        const index = { byAssembly: new Map() };

        for (const id of nodeSet) {
            const n = g.nodes.get(id);
            if (!n) continue;
            nodes.set(id, { ...n });
            adj.set(id, []);
        }
        for (const id of nodeSet) {
            const nbrs = g.adj.get(id) || [];
            for (const nb of nbrs) {
                if (!nodeSet.has(nb)) continue;
                const ekF = `edge:${id}:${nb}`;
                const ekR = `edge:${nb}:${id}`;
                if (g.edges.has(ekF)) edges.set(ekF, g.edges.get(ekF));
                if (g.edges.has(ekR)) edges.set(ekR, g.edges.get(ekR));
                adj.get(id).push(nb);
            }
        }
        return { nodes, edges, adj, index };
    }

    #findLocalLoopThrough(regionNodes, L) {
        const region = new Set(regionNodes.concat([L]));
        const adj = new Map();
        for (const id of region) {
            const nbrs = (this.graph.adj.get(id) || []).filter(n => region.has(n));
            adj.set(id, nbrs);
        }
        const stack = [[L, null, []]];
        const seen = new Set([L]);
        while (stack.length) {
            const [u, p, path] = stack.pop();
            const newPath = path.concat(u);
            for (const v of (adj.get(u) || [])) {
                if (v === p) continue;
                if (v === L && newPath.length > 1) return newPath.concat(L);
                if (!seen.has(v)) { seen.add(v); stack.push([v, u, newPath]); }
            }
        }
        return null;
    }

    // ========================= Private helpers =========================

    #requireGraph() { if (!this.graph) throw new Error("PangenomeService: graph not created. Call createGraph(json) first."); }
    #edgeKeyOf(a, b) { return `edge:${a}:${b}`; }
    #parseSignedId(id) { const m = String(id).match(/^(.+?)([+-])$/); if (!m) throw new Error(`Node id "${id}" must end with + or -`); return { bare: m[1], sign: m[2] }; }
    #num(id) { return Number(this.#parseSignedId(id).bare); }

    #inducedAdj(adj, allowSet) {
        const out = new Map();
        for (const id of allowSet) out.set(id, []);
        for (const id of allowSet) {
            const nbrs = adj.get(id) || [];
            for (const nb of nbrs) if (allowSet.has(nb)) out.get(id).push(nb);
        }
        return out;
    }

    #connectedComponents(indAdj) {
        const vis = new Set(), comps = [];
        for (const id of indAdj.keys()) {
            if (vis.has(id)) continue;
            const q = [id], comp = []; vis.add(id);
            while (q.length) {
                const v = q.shift(); comp.push(v);
                for (const w of (indAdj.get(v) || [])) if (!vis.has(w)) { vis.add(w); q.push(w); }
            }
            comps.push(comp);
        }
        return comps;
    }

    #degreeMap(indAdj) { const d = new Map(); for (const [id, list] of indAdj) d.set(id, (list || []).length); return d; }

    #chooseEndpoints(indAdj, comp) {
        const deg = this.#degreeMap(indAdj);
        const endpoints = comp.filter(id => (deg.get(id) || 0) === 1);
        if (endpoints.length >= 2) return [endpoints[0], endpoints[1]];
        const farthest = (start) => {
            const q = [start], dist = new Map([[start, 0]]); let last = start;
            while (q.length) { const v = q.shift(); last = v; for (const w of (indAdj.get(v) || [])) if (!dist.has(w)) { dist.set(w, dist.get(v) + 1); q.push(w); } }
            return last;
        };
        const a = comp[0]; const u = farthest(a); const v = farthest(u); return [u, v];
    }

    #extractPathEndpointWalk(indAdj, comp) {
        if (!comp.length) return [];
        const deg = this.#degreeMap(indAdj);
        const [start] = this.#chooseEndpoints(indAdj, comp);
        const walk = []; const vis = new Set(); let prev = null, cur = start;
        while (cur && !vis.has(cur)) {
            walk.push(cur); vis.add(cur);
            const cand = (indAdj.get(cur) || []).filter(n => n !== prev && !vis.has(n));
            if (cand.length === 0) break;
            if (cand.length === 1) { prev = cur; cur = cand[0]; continue; }
            cand.sort((a, b) => (deg.get(a) || 0) - (deg.get(b) || 0) || (this.#num(a) - this.#num(b)));
            prev = cur; cur = cand[0];
        }
        return walk;
    }

    /**
     * Normalize per-path direction and recompute edges to match the chosen orientation.
     * - startNodeId: if provided AND it is an endpoint of a path, orient so the path starts there.
     * - directionPolicy:
     *     "asFound"   – keep search order unless startNodeId applies
     *     "nodeIdAsc" – orient from smaller numeric id → larger
     *     "nodeIdDesc"– orient from larger numeric id → smaller
     *     "edgeFlow"  – orient so we traverse with the majority of directed edges (a→b) present in graph.edges
     */
    _normalizePathDirections(
        paths,
        { startNodeId = null, directionPolicy = "asFound" } = {}
    ) {
        if (!Array.isArray(paths) || paths.length === 0) return;

        const asNum = (id) => {
            const m = String(id).match(/^(\d+)/);
            return m ? Number(m[1]) : Number.NEGATIVE_INFINITY;
        };

        const edgeVote = (nodes) => {
            // +1 if directed edge a->b exists, -1 if only b->a exists, 0 if neither/both (ambiguous)
            let score = 0;
            for (let i = 0; i < nodes.length - 1; i++) {
                const a = nodes[i], b = nodes[i + 1];
                const f = this.#edgeKeyOf(a, b);
                const r = this.#edgeKeyOf(b, a);
                const hasF = this.graph.edges.has(f);
                const hasR = this.graph.edges.has(r);
                if (hasF && !hasR) score += 1;
                else if (!hasF && hasR) score -= 1;
                // if (hasF && hasR) → score += 0 (bidirected / ambiguous)
            }
            return score;
        };

        for (const p of paths) {
            if (!p || !Array.isArray(p.nodes) || p.nodes.length === 0) continue;

            let policyApplied = "asFound";
            const nodes = p.nodes;

            // 1) Explicit start node (only if it's an endpoint)
            if (nodes.length >= 2 && startNodeId) {
                const atHead = nodes[0] === startNodeId;
                const atTail = nodes[nodes.length - 1] === startNodeId;
                if (!atHead && atTail) {
                    nodes.reverse();
                    policyApplied = "startNodeId";
                }
            }

            // 2) Edge-flow policy (only if startNodeId didn't apply)
            if (policyApplied === "asFound" && directionPolicy === "edgeFlow" && nodes.length >= 2) {
                const scoreFwd = edgeVote(nodes);
                const scoreRev = -scoreFwd; // symmetric if we reversed
                if (scoreFwd < 0) {
                    nodes.reverse();
                    policyApplied = "edgeFlow";
                } else if (scoreFwd === 0) {
                    // tie → fall through to numeric policy if provided
                } else {
                    policyApplied = "edgeFlow";
                }
            }

            // 3) Numeric fallbacks (if still asFound)
            if (policyApplied === "asFound" &&
                (directionPolicy === "nodeIdAsc" || directionPolicy === "nodeIdDesc") &&
                nodes.length >= 2) {
                const first = asNum(nodes[0]);
                const last  = asNum(nodes[nodes.length - 1]);
                const needAsc  = (directionPolicy === "nodeIdAsc"  && first > last);
                const needDesc = (directionPolicy === "nodeIdDesc" && first < last);
                if (needAsc || needDesc) {
                    nodes.reverse();
                    policyApplied = directionPolicy;
                } else {
                    policyApplied = directionPolicy;
                }
            }

            // 4) Recompute edges to match orientation
            const edgesOnPath = [];
            for (let i = 0; i < nodes.length - 1; i++) {
                const a = nodes[i], b = nodes[i + 1];
                const f = this.#edgeKeyOf(a, b);
                const r = this.#edgeKeyOf(b, a);
                if (this.graph.edges.has(f)) edgesOnPath.push(f);
                else if (this.graph.edges.has(r)) edgesOnPath.push(r);
                // else: missing edge in either direction; keep going
            }
            p.edges = edgesOnPath;

            p.leftEndpoint  = nodes[0];
            p.rightEndpoint = nodes[nodes.length - 1];
            p.direction = { start: p.leftEndpoint, end: p.rightEndpoint, policyApplied };
        }
    }

    // -------- Patch B: robust block–cut extractor --------
    #biconnectedDecomposition(indAdj) {
        const disc = new Map(), low = new Map(), parent = new Map();
        let time = 0; const edgeStack = []; const blocks = []; const articulation = new Set();

        const push = (u, v) => edgeStack.push([u, v]);
        const popUntil = (u, v) => {
            const set = new Set();
            while (edgeStack.length) {
                const [x, y] = edgeStack.pop();
                set.add(x); set.add(y);
                if ((x === u && y === v) || (x === v && y === u)) break;
            }
            if (set.size) blocks.push(set);
        };

        const dfs = (u) => {
            disc.set(u, ++time); low.set(u, time);
            let childCount = 0;
            for (const v of (indAdj.get(u) || [])) {
                if (!disc.has(v)) {
                    parent.set(v, u); childCount++; push(u, v);
                    dfs(v);
                    low.set(u, Math.min(low.get(u), low.get(v)));
                    if ((parent.get(u) !== undefined && low.get(v) >= disc.get(u)) || (parent.get(u) === undefined && childCount > 1)) {
                        articulation.add(u); popUntil(u, v);
                    }
                } else if (v !== parent.get(u) && disc.get(v) < disc.get(u)) {
                    push(u, v); low.set(u, Math.min(low.get(u), disc.get(v)));
                }
            }
        };

        for (const u of indAdj.keys()) if (!disc.has(u)) { dfs(u); if (edgeStack.length) popUntil(...edgeStack[edgeStack.length - 1]); }
        return { blocks, articulation };
    }

    #buildBlockCutTree(blocks, articulation) {
        const bctAdj = new Map(); const blockNodes = [];
        const add = (n) => { if (!bctAdj.has(n)) bctAdj.set(n, new Set()); };
        for (let i = 0; i < blocks.length; i++) {
            const B = `B#${i}`; add(B); blockNodes[i] = blocks[i];
            for (const v of blocks[i]) {
                if (!articulation.has(v)) continue; const A = `A#${v}`; add(A);
                bctAdj.get(B).add(A); bctAdj.get(A).add(B);
            }
        }
        const adj = new Map(); for (const [k, set] of bctAdj) adj.set(k, Array.from(set));
        return { adj, blockNodes };
    }

    #blockOfVertex(blocks, v) { for (let i = 0; i < blocks.length; i++) if (blocks[i].has(v)) return i; return -1; }

    #bfsPath(indAdj, start, goal, allowSet = null) {
        if (start === goal) return [start];
        const A = allowSet || new Set(indAdj.keys());
        if (!A.has(start) || !A.has(goal)) return null;
        const q = [start], prev = new Map([[start, null]]);
        while (q.length) {
            const v = q.shift();
            for (const w of (indAdj.get(v) || [])) {
                if (!A.has(w) || prev.has(w)) continue;
                prev.set(w, v);
                if (w === goal) {
                    const path = [w]; let cur = v; while (cur) { path.push(cur); cur = prev.get(cur); }
                    path.reverse(); return path;
                }
                q.push(w);
            }
        }
        return null;
    }

    #extractPathBlockCut(indAdj, comp) {
        if (!comp || comp.length === 0) return [];
        if (comp.length === 1) return [comp[0]]; // singleton

        const { blocks, articulation } = this.#biconnectedDecomposition(indAdj);
        if (!blocks || blocks.length === 0) {
            return this.#extractPathEndpointWalk(indAdj, comp);
        }

        const [s, t] = this.#chooseEndpoints(indAdj, comp);
        const bs = this.#blockOfVertex(blocks, s);
        const bt = this.#blockOfVertex(blocks, t);
        if (bs === -1 || bt === -1) {
            const p = this.#bfsPath(indAdj, s, t);
            return (p && p.length) ? p : this.#extractPathEndpointWalk(indAdj, comp);
        }

        const { adj: bctAdj } = this.#buildBlockCutTree(blocks, articulation);
        const start = `B#${bs}`, goal = `B#${bt}`;

        const Q = [start], prev = new Map([[start, null]]);
        while (Q.length) {
            const x = Q.shift(); if (x === goal) break;
            for (const y of (bctAdj.get(x) || [])) if (!prev.has(y)) { prev.set(y, x); Q.push(y); }
        }
        if (!prev.has(goal)) {
            const p = this.#bfsPath(indAdj, s, t) || this.#extractPathEndpointWalk(indAdj, comp);
            return p || [];
        }

        const bctPath = []; for (let cur = goal; cur; cur = prev.get(cur)) bctPath.push(cur); bctPath.reverse();

        const finalPath = []; let entry = s;
        for (let i = 0; i < bctPath.length; i++) {
            const label = bctPath[i]; if (!label.startsWith("B#")) continue;
            const bi = Number(label.slice(2));
            const allowSet = blocks[bi];
            const inEntry = (i === 0) ? entry : (bctPath[i - 1].startsWith("A#") ? bctPath[i - 1].slice(2) : entry);
            const nextLabel = (i === bctPath.length - 1) ? null : bctPath[i + 1];
            const inExit = nextLabel && nextLabel.startsWith("A#") ? nextLabel.slice(2) : t;

            const seg = this.#bfsPath(indAdj, inEntry, inExit, new Set(allowSet)) || [];
            if (!seg.length) { const p = this.#bfsPath(indAdj, s, t) || this.#extractPathEndpointWalk(indAdj, comp); return p || []; }

            if (finalPath.length && finalPath[finalPath.length - 1] === seg[0]) finalPath.push(...seg.slice(1));
            else finalPath.push(...seg);

            entry = inExit;
        }

        if (!finalPath.length) {
            const p = this.#bfsPath(indAdj, s, t) || this.#extractPathEndpointWalk(indAdj, comp);
            return p || [];
        }
        return finalPath;
    }

    // -------- Patch A: defensive mode chooser --------
    #decideMode(subAdj, comp) {
        const deg = this.#degreeMap(subAdj);
        const n = comp.length;
        const e = comp.reduce((s, id) => s + (subAdj.get(id) || []).length, 0) / 2;
        const endpoints = comp.filter(id => (deg.get(id) || 0) === 1).length;
        const maxDeg = Math.max(0, ...comp.map(id => deg.get(id) || 0));
        if (n <= 2 || e <= 1) return "endpoint"; // tiny/degenerate
        const looksChainy = (endpoints === 2) && (maxDeg <= 2) && (e <= n);
        return looksChainy ? "endpoint" : "blockcut";
    }

    // --- Build a lazy concatenated accessor over spine (no giant string) ---
    static buildSequenceStripAccessor(spineWalk, sequences) {

        const chunks = []

        let accumulator = 0;
        for (const walkKey of spineWalk) {

            // sequence keys are stored as "+"
            const storedKey = walkKey.endsWith('+') || walkKey.endsWith('-') ? walkKey.slice(0, -1) + '+' : walkKey;

            const rawSequenceString = sequences[storedKey] || '';

            const orientation = walkKey.endsWith('-') ? '-' : '+';
            const sequenceString = orientation === '+' ? rawSequenceString : reverseComplement(rawSequenceString);

            const len = sequenceString.length;
            const startOffset = accumulator;

            chunks.push({ len, start: startOffset, end: startOffset + len, get: i => sequenceString[i] || 'N' });

            accumulator += len;
        }

        const charAt = pathBp => {

            let lo = 0
            let hi = chunks.length - 1

            // binary search chunk by cumulative bounds
            while (lo <= hi) {
                const mid = (lo + hi) >> 1;
                const chunk = chunks[mid];
                if (pathBp < chunk.start) hi = mid - 1;
                else if (pathBp >= chunk.end) lo = mid + 1;
                else return chunk.get(pathBp - chunk.start);
            }
            return 'N';
        }

        return { totalLen: accumulator, charAt }
    }

}

export default PangenomeService
