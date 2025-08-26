// PangenomeService.js — bullet-proof, performant (pure JavaScript)

/* Design notes (tl;dr)
 * - Loader builds fast indexes: out/in/adj, edgesByNode, undirectedIndex, assembliesIndex.
 * - createAssemblyWalk(): builds strict simple paths (one per component) in O(V+E) using 2×BFS.
 * - getChosenWalk(): chooses longest-by-bp path; orients by edgeFlow; optional leaf-trim by caps.
 * - getSpineFeatures(): calls getChosenWalk() then a FAST assessor:
 *     * local, bounded BFS around each spine leg (L–R) with hop cap + node/edge budgets
 *     * optional 1× shortest alt path inside region (no enumeration)
 *     * zero global scans; all per-event work is O(region)
 * - Hard budgets: operationBudget, maxRegionHops/Nodes/Edges, maxAltPaths=1 by default
 * - Off-spine components off by default (set "summary" | "full" if needed)
 */

class PangenomeService {
    constructor(json = null) {
        this.graph = null;                 // { nodes, edges, out, in, adj, sequences, assembliesIndex, edgesByNode, undirectedIndex, locus }
        this._dirOut = null;               // cache of directed out map
        this._inducedCache = new Map();    // assemblyKey -> { nodesIn:Set, adj:Map, components:[Set] }
        this.defaultLocusStartBp = 0;
        if (json) this.createGraph(json);
    }

    // ========================= Dataset lifecycle =========================
    loadData(json, opts) { return this.createGraph(json, opts); }
    reload(json, opts)   { this.clear(); return this.createGraph(json, opts); }
    clear()              { this.graph = null; this._dirOut = null; this._inducedCache.clear(); return true; }
    getGraph()           { return this.graph; }

    // ========================= Loader (fast indexes) =========================
    createGraph(json, { assemblyKeyDelim = "#" } = {}) {
        const nodes           = new Map();
        const edges           = new Map();
        const out             = new Map();
        const incoming        = new Map();
        const adj             = new Map();
        const sequences       = new Map();
        const assembliesIndex = new Map();

        const addOut = (a,b)=>{ if(!out.has(a)) out.set(a,new Set()); out.get(a).add(b); };
        const addIn  = (a,b)=>{ if(!incoming.has(b)) incoming.set(b,new Set()); incoming.get(b).add(a); };
        const addAdj = (a,b)=>{ if(!adj.has(a)) adj.set(a,new Set()); if(!adj.has(b)) adj.set(b,new Set()); adj.get(a).add(b); adj.get(b).add(a); };

        if (json?.sequence) {
            for (const [id, seq] of Object.entries(json.sequence)) sequences.set(String(id), String(seq ?? ""));
        }

        const nodeBag = json?.node || {};
        for (const [k, raw] of Object.entries(nodeBag)) {
            const id = String(raw?.name ?? k);
            const seq = sequences.get(id) ?? null;
            const lengthBp = Number.isFinite(raw?.length) ? Number(raw.length) : (seq ? seq.length : 0);

            const assemblies = new Set();
            for (const a of (raw?.assembly || [])) {
                const asm = String(a.assembly_name ?? "");
                const hap = String(a.haplotype ?? "");
                const sid = String(a.sequence_id ?? "");
                const key = `${asm}${assemblyKeyDelim}${hap}${assemblyKeyDelim}${sid}`;
                assemblies.add(key);
                if (!assembliesIndex.has(key)) assembliesIndex.set(key, new Set());
                assembliesIndex.get(key).add(id);
            }

            nodes.set(id, { id, lengthBp, assemblies, seq, range: raw?.range ?? "", ogdf: raw?.ogdf_coordinates ?? null, raw });

            if (!out.has(id)) out.set(id, new Set());
            if (!incoming.has(id)) incoming.set(id, new Set());
            if (!adj.has(id)) adj.set(id, new Set());
        }

        // endpoint resolver (handle +/- mismatches)
        const stripSign = s => String(s).replace(/[+-]$/, "");
        const resolveNodeId = rawId => {
            if (!rawId) return null;
            const id = String(rawId);
            if (nodes.has(id)) return id;
            if (/[+-]$/.test(id)) {
                const base = stripSign(id);
                const flip = id.endsWith("+") ? `${base}-` : `${base}+`;
                if (nodes.has(flip)) return flip;
                for (const cand of nodes.keys()) if (stripSign(cand) === base) return cand;
            } else {
                for (const cand of nodes.keys()) if (stripSign(cand) === id) return cand;
            }
            return null;
        };

        // edges
        for (const e of (json?.edge || [])) {
            const from = resolveNodeId(e.starting_node);
            const to   = resolveNodeId(e.ending_node);
            if (!from || !to) continue;
            const key = this.#edgeKeyOf(from, to);
            if (!edges.has(key)) { edges.set(key, { key, from, to }); addOut(from,to); addIn(from,to); addAdj(from,to); }
        }

        // Indexes for fast region edge collection
        const undirectedIndex = new Map(); // "a|b" (a<b) -> [edge:a:b, edge:b:a?]
        const edgesByNode = new Map();     // nodeId -> [edge keys touching node]
        const undirectedKey = (a,b)=> (a < b ? `${a}|${b}` : `${b}|${a}`);

        for (const [ek, { from, to }] of edges) {
            const uk = undirectedKey(from,to);
            if (!undirectedIndex.has(uk)) undirectedIndex.set(uk, []);
            undirectedIndex.get(uk).push(ek);
            if (!edgesByNode.has(from)) edgesByNode.set(from, []);
            if (!edgesByNode.has(to))   edgesByNode.set(to,   []);
            edgesByNode.get(from).push(ek);
            edgesByNode.get(to).push(ek);
        }

        this.graph = { nodes, edges, out, in: incoming, adj, sequences, assembliesIndex, undirectedIndex, edgesByNode, locus: json?.locus ?? null };
        this._dirOut = null;
        this._inducedCache.clear();
        return this.graph;
    }

    listAssemblyKeys() {
        this.#requireGraph();
        const keys = new Set();
        for (const [, n] of this.graph.nodes) for (const k of (n.assemblies || [])) keys.add(k);
        return [...keys].sort();
    }

    debugAssembly(key, sample = 8) {
        this.#requireGraph();
        const hits = [];
        for (const [id, n] of this.graph.nodes) if (n.assemblies && n.assemblies.has(key)) hits.push(id);
        hits.sort((a,b)=>String(a).localeCompare(String(b), 'en', {numeric:true}));
        return { key, count: hits.length, sample: hits.slice(0, sample) };
    }

    // ========================= Truth helper =========================
    getAssemblySubgraph(key) {
        const { nodesIn, adj } = this._getInduced(key);
        const ekeys = [];
        for (const [ek, {from,to}] of this.graph.edges) if (nodesIn.has(from) && nodesIn.has(to)) ekeys.push(ek);
        const adjObj = {}; for (const [v,set] of adj) adjObj[v] = [...set];
        return { nodes: [...nodesIn], edges: ekeys, adj: adjObj };
    }

    // ========================= Walks (strict, oriented) =========================
    createAssemblyWalk(key, { mode = "auto", startNodeId = null, directionPolicy = "edgeFlow" } = {}) {
        this.#requireGraph();
        const { adj, components } = this._getInduced(key);

        // One simple path per component (diameter proxy via double BFS)
        const paths = [];
        for (const comp of components) {
            const p = this._buildStrictPathForComponent(comp, adj);
            if (p && p.nodes && p.nodes.length) paths.push(p);
        }

        this._normalizePathDirections(paths, { startNodeId, directionPolicy });
        if (directionPolicy === "edgeFlow") this._orientPathsToEdges(paths);

        return { key, paths, diagnostics: { nComponents: components.length, mode } };
    }

    getChosenWalk(key, {
        mode = "auto",
        startNodeId = null,
        directionPolicy = "edgeFlow",
        trimLeafEnds = false,
        leafEndBpMax = 0,
        leafEndNodesMax = 0
    } = {}) {
        const walk = this.createAssemblyWalk(key, { mode, startNodeId, directionPolicy });
        const chosen0 = this.#chooseLongestPath(walk.paths);
        if (!chosen0) return { key, path: null, provenance: { assemblyKey: key, note: "no path" } };

        const prov = this._provenanceForPath(key, chosen0);

        let path = chosen0;
        if (trimLeafEnds && (leafEndBpMax > 0 || leafEndNodesMax > 0)) {
            const before = chosen0.nodes.slice();
            path = this._trimLeafEndsForAssembly(key, chosen0, { bpMax: leafEndBpMax, nodesMax: leafEndNodesMax });
            const { prefixRemoved, suffixRemoved } = this._trimDiff(before, path.nodes);
            prov.trimmed = {
                enabled: true,
                leafEndBpMax, leafEndNodesMax,
                prefixRemoved,
                suffixRemoved,
                totalNodes: prefixRemoved.length + suffixRemoved.length,
                totalBp: this._bpLenOf(prefixRemoved.concat(suffixRemoved))
            };
        } else {
            prov.trimmed = { enabled: false };
        }

        prov.offSpineKeyed = this._countOffSpineKeyed(key, new Set(path.nodes));
        return { key, path, provenance: prov, diagnostics: walk.diagnostics };
    }

    getChosenWalks({ keys = null, mode = "auto", startNodeId = null, directionPolicy = "edgeFlow" } = {}) {
        const all = keys ? keys : this.listAssemblyKeys();
        const resolveStart = (k) => {
            if (!startNodeId) return null;
            if (typeof startNodeId === "string") return startNodeId;
            if (typeof startNodeId === "function") return startNodeId(k);
            if (startNodeId instanceof Map) return startNodeId.get(k) ?? null;
            if (typeof startNodeId === "object") return startNodeId[k] ?? null;
            return null;
        };
        return all.map(k => this.getChosenWalk(k, { mode, startNodeId: resolveStart(k), directionPolicy }));
    }

    // ========================= Spine + FAST features =========================
    setDefaultLocusStartBp(bp) { this.defaultLocusStartBp = Number(bp) || 0; return this.defaultLocusStartBp; }
    getDefaultLocusStartBp()   { return this.defaultLocusStartBp ?? 0; }

    getSpineFeatures(key, assessOpts = {}, walkOpts = {}) {
        this.#requireGraph();

        const {
            // discovery/perf (SAFE DEFAULTS)
            includeAdjacent = true,
            allowMidSpineReentry = true,
            includeDangling = true,
            includeOffSpineComponents = "none", // "none" | "summary" | "full"
            nestRegions = "none",               // "none" | "shallow"

            // bp origin
            locusStartBp = (this.defaultLocusStartBp ?? 0),

            // hard caps
            maxPathsPerEvent = 1,      // at most one alt path (shortest) — avoids explosion
            maxRegionHops = 64,        // depth cap
            maxRegionNodes = 4000,     // node cap per event region
            maxRegionEdges = 4000,     // edge cap per event region
            operationBudget = 500000   // global step budget for this call (prevents hangs)
        } = assessOpts || {};

        const {
            mode = "auto",
            directionPolicy = "edgeFlow",
            startNodeId = null,
            trimLeafEnds = true,
            leafEndBpMax = 0,
            leafEndNodesMax = 2
        } = walkOpts || {};

        const { path, provenance } = this.getChosenWalk(key, { mode, startNodeId, directionPolicy, trimLeafEnds, leafEndBpMax, leafEndNodesMax });

        if (!path) {
            return {
                spine: { assemblyKey: key, nodes: [], edges: [], lengthBp: 0 },
                events: [], offSpine: [],
                spineWalk: { key, paths: [] }, path: null, provenance,
                aborted: false
            };
        }

        const spineWalk = { key, paths: [path] };
        const features = this._assessGraphFeaturesFast(spineWalk, {
            includeAdjacent, allowMidSpineReentry, includeDangling,
            includeOffSpineComponents, nestRegions,
            maxPathsPerEvent, maxRegionHops, maxRegionNodes, maxRegionEdges,
            locusStartBp, operationBudget
        });

        return { ...features, spineWalk, path, provenance };
    }

    // Tooltip/helper: exact for spine; projected for off-spine (if in event)
    getAnyBpExtent(nodeId, features) {
        if (!features || !features.spine) return null;
        const m = new Map(features.spine.nodes.map(n => [n.id, { bpStart: n.bpStart, bpEnd: n.bpEnd }]));
        if (m.has(nodeId)) return m.get(nodeId);
        for (const ev of (features.events || [])) if (ev.region.nodes.includes(nodeId)) {
            return { bpStart: ev.anchors.spanStart, bpEnd: ev.anchors.spanEnd };
        }
        return null;
    }

    // ========================= Internals (FAST assessor) =========================
    _assessGraphFeaturesFast(spineWalk, opts) {
        const {
            includeAdjacent, allowMidSpineReentry, includeDangling,
            includeOffSpineComponents, nestRegions,
            maxPathsPerEvent, maxRegionHops, maxRegionNodes, maxRegionEdges,
            locusStartBp, operationBudget
        } = opts;

        let budget = Math.max(10000, Number(operationBudget) || 200000); // global step budget

        const path = spineWalk.paths[0];
        const spine = this._buildSpineBp(path, locusStartBp);
        spine.assemblyKey = spineWalk.key;

        const onSpine = new Set(spine.nodes.map(n => n.id));
        const bpOf = new Map(spine.nodes.map(n => [n.id, { bpStart: n.bpStart, bpEnd: n.bpEnd }]));
        const events = [];
        const markVisited = new Set();

        const hasOffSpineNeighbor = (id) => {
            for (const u of (this.graph.adj.get(id) || [])) { budget--; if (budget <= 0) break;
                if (!onSpine.has(u)) return true;
            }
            return false;
        };

        const collectRegionEdges = (set) => {
            const out = new Set();
            const seenPairs = new Set();
            const undirectedIndex = this.graph.undirectedIndex;
            for (const a of set) { budget--; if (budget <= 0) return { edges: out, truncated: true };
                for (const b of (this.graph.adj.get(a) || [])) {
                    if (!set.has(b)) continue;
                    const pair = (a < b) ? `${a}|${b}` : `${b}|${a}`;
                    if (seenPairs.has(pair)) continue;
                    seenPairs.add(pair);
                    const list = undirectedIndex.get(pair);
                    if (list) for (const ek of list) out.add(ek);
                    if (out.size > maxRegionEdges) return { edges: out, truncated: true };
                }
            }
            return { edges: out, truncated: false };
        };

        const regionExplore = (L, R) => {
            const blockSpine = !allowMidSpineReentry;
            const allowed = (id) => (id === L || id === R || !blockSpine || !onSpine.has(id));

            const q = [[L, 0]];
            const parent = new Map([[L, null]]);
            const region = new Set([L]);
            let touchedR = false;
            let truncated = false;

            while (q.length) {
                const [v, d] = q.shift();
                for (const u of (this.graph.adj.get(v) || [])) {
                    budget -= 2; if (budget <= 0) { truncated = true; break; }
                    if (!allowed(u)) continue;
                    if (parent.has(u)) continue;
                    if (d + 1 > maxRegionHops) { truncated = true; continue; }

                    parent.set(u, v);
                    region.add(u);
                    if (region.size > maxRegionNodes) { truncated = true; break; }
                    if (u === R) touchedR = true;
                    q.push([u, d + 1]);
                }
                if (truncated) break;
            }

            const { edges: redges, truncated: edgeTrunc } = collectRegionEdges(region);
            truncated = truncated || edgeTrunc;

            return { parent, region, redges, touchedR, truncated };
        };

        const shortestAltPath = (L, R, region) => {
            // BFS shortest by hops within region
            const q = [L];
            const parent = new Map([[L, null]]);
            while (q.length) {
                const v = q.shift();
                for (const u of (this.graph.adj.get(v) || [])) {
                    budget--; if (budget <= 0) return null;
                    if (!region.has(u) || parent.has(u)) continue;
                    parent.set(u, v);
                    if (u === R) {
                        const nodes = [];
                        let cur = u;
                        while (cur != null) { nodes.push(cur); cur = parent.get(cur); }
                        nodes.reverse();
                        const edges = this._recomputeEdges(nodes);
                        const offNodes = nodes.filter(id => !onSpine.has(id));
                        return { nodes, edges, altLenBp: this._bpLenOf(offNodes) };
                    }
                    q.push(u);
                }
            }
            return null;
        };

        // Iterate adjacent pairs along the spine (linear)
        for (let i = 0; i < spine.nodes.length - 1; i++) {
            if (budget <= 0) break;

            const L = spine.nodes[i].id;
            const R = spine.nodes[i + 1].id;
            const pairKey = `${L}|${R}`;
            if (markVisited.has(pairKey)) continue;

            // Fast degree check
            if (!hasOffSpineNeighbor(L) && !hasOffSpineNeighbor(R)) {
                markVisited.add(pairKey);
                continue;
            }

            const { region, redges, touchedR, truncated } = regionExplore(L, R);
            const onlyLR = region.size === 2 && region.has(L) && region.has(R);
            if (onlyLR && !includeAdjacent) { markVisited.add(pairKey); continue; }

            const hasOffSpine = [...region].some(n => !onSpine.has(n));
            const touchesMidSpine = [...region].some(n => n !== L && n !== R && onSpine.has(n));
            if (!hasOffSpine) { markVisited.add(pairKey); continue; }

            let type = null;
            if (touchedR) type = touchesMidSpine ? "braid" : ((bpOf.get(R).bpStart - bpOf.get(L).bpEnd) === 0 ? "pill" : "simple_bubble");
            else if (includeDangling) type = "dangling";
            if (!type) { markVisited.add(pairKey); continue; }

            const spanStart = bpOf.get(L)?.bpEnd ?? 0;
            const spanEnd   = bpOf.get(R)?.bpStart ?? spanStart;
            const refLenBp  = Math.max(0, spanEnd - spanStart);

            // Alt paths: at most 1 shortest (bounded)
            const paths = [];
            if (touchedR && maxPathsPerEvent > 0) {
                const p = shortestAltPath(L, R, region);
                if (p && !(p.nodes.length === 2 && p.nodes[0] === L && p.nodes[1] === R)) paths.push(p);
            }

            const regionNodes = [...region].filter(id => !(id === L && id === R));
            const anchors = { leftId: L, rightId: R, spanStart, spanEnd, refLenBp, orientation: "forward" };
            const stats = {
                nPaths: paths.length,
                minAltLenBp: paths.length ? Math.min(...paths.map(p => p.altLenBp)) : 0,
                maxAltLenBp: paths.length ? Math.max(...paths.map(p => p.altLenBp)) : 0,
                truncatedPaths: truncated,
                removedSpineLeg: true
            };

            events.push({
                id: `${L}~${R}`,
                type,
                anchors,
                region: { nodes: regionNodes, edges: [...redges], truncated: !!truncated },
                paths,
                stats,
                relations: { parentId: null, childrenIds: [], overlapGroup: null, sameAnchorGroup: null }
            });

            markVisited.add(pairKey);
        }

        // Off-spine components (default off)
        const offSpine = [];
        if (includeOffSpineComponents !== "none" && budget > 0) {
            const seen = new Set();
            for (const [id] of this.graph.nodes) {
                if (budget <= 0) break;
                if (onSpine.has(id) || seen.has(id)) continue;
                const q = [id], comp = new Set([id]); seen.add(id);
                let touches = false;
                while (q.length) {
                    const v = q.shift(); budget--; if (budget <= 0) break;
                    if (onSpine.has(v)) touches = true;
                    for (const u of (this.graph.adj.get(v) || [])) if (!seen.has(u)) { seen.add(u); comp.add(u); q.push(u); }
                    if (comp.size > maxRegionNodes * 2) break; // hard stop for huge islands
                }
                if (!touches) {
                    if (includeOffSpineComponents === "summary") {
                        offSpine.push({ nodes: [...comp], edges: [], keyed: false });
                    } else {
                        const { edges: e, truncated } = collectRegionEdges(comp);
                        offSpine.push({ nodes: [...comp], edges: [...e], keyed: false, truncated });
                    }
                }
            }
        }

        const aborted = (budget <= 0);
        return { spine, events, offSpine, aborted };
    }

    // ========================= Private utils =========================
    #edgeKeyOf(a, b) { return `edge:${a}:${b}`; }
    #requireGraph() { if (!this.graph) throw new Error("PangenomeService: call loadData/createGraph(json) first."); }

    _getInduced(key) {
        if (this._inducedCache.has(key)) return this._inducedCache.get(key);

        const nodesIn = new Set();
        for (const [id, n] of this.graph.nodes) if (n.assemblies.has(key)) nodesIn.add(id);

        const adj = new Map();
        const add = (a,b)=>{ if(!adj.has(a)) adj.set(a,new Set()); adj.get(a).add(b); };

        for (const [ek, {from,to}] of this.graph.edges) if (nodesIn.has(from) && nodesIn.has(to)) { add(from,to); add(to,from); }

        const components = [];
        const seen = new Set();
        for (const v of nodesIn) {
            if (seen.has(v)) continue;
            const q = [v], comp = new Set([v]); seen.add(v);
            while (q.length) {
                const x = q.shift();
                for (const y of (adj.get(x) || [])) if (!seen.has(y)) { seen.add(y); comp.add(y); q.push(y); }
            }
            components.push(comp);
        }

        const induced = { nodesIn, adj, components };
        this._inducedCache.set(key, induced);
        return induced;
    }

    #chooseLongestPath(paths) {
        if (!paths || !paths.length) return null;
        let best = null, bestLen = -1;
        for (const p of paths) {
            const L = (p && Number.isFinite(p.bpLen)) ? p.bpLen : this._bpLenOf(p?.nodes || []);
            if (L > bestLen) { best = p; bestLen = L; }
        }
        return best;
    }

    _bpLenOf(nodes) {
        let L = 0;
        for (const id of nodes) {
            const n = this.graph.nodes.get(id);
            if (n && Number.isFinite(n.lengthBp)) L += n.lengthBp;
        }
        return L;
    }

    _recomputeEdges(nodes) {
        const out = [];
        for (let i = 0; i < nodes.length - 1; i++) {
            const a = nodes[i], b = nodes[i + 1];
            const f = this.#edgeKeyOf(a, b);
            const r = this.#edgeKeyOf(b, a);
            if (this.graph.edges.has(f)) out.push(f);
            else if (this.graph.edges.has(r)) out.push(r);
        }
        return out;
    }

    _buildSpineBp(path, locusStartBp) {
        let x = Number(locusStartBp) || 0;
        const nodes = [];
        for (const id of path.nodes) {
            const len = this.graph.nodes.get(id)?.lengthBp || 0;
            nodes.push({ id, bpStart: x, bpEnd: x + len, lengthBp: len });
            x += len;
        }
        return {
            assemblyKey: null,
            nodes,
            edges: path.edges.slice(),
            lengthBp: nodes.length ? nodes[nodes.length - 1].bpEnd - nodes[0].bpStart : 0
        };
    }

    _bfsFarthest(start, adj) {
        const parent = new Map([[start, null]]);
        const q = [start];
        let last = start;
        while (q.length) {
            const v = q.shift();
            last = v;
            for (const u of (adj.get(v) || [])) if (!parent.has(u)) { parent.set(u, v); q.push(u); }
        }
        return { far: last, parent };
    }

    _reconstructPath(parent, dst) {
        const nodes = [];
        let cur = dst;
        while (cur != null) { nodes.push(cur); cur = parent.get(cur); }
        nodes.reverse();
        const edges = this._recomputeEdges(nodes);
        return { nodes, edges, bpLen: this._bpLenOf(nodes), leftEndpoint: nodes[0], rightEndpoint: nodes[nodes.length - 1] };
    }

    _buildStrictPathForComponent(compSet, adj) {
        let start = null;
        for (const v of compSet) if ((adj.get(v)?.size || 0) === 1) { start = v; break; }
        if (!start) start = compSet.values().next().value;
        const a = this._bfsFarthest(start, adj).far;
        const { far: b, parent } = this._bfsFarthest(a, adj);
        return this._reconstructPath(parent, b);
    }

    _normalizePathDirections(paths, { startNodeId = null, directionPolicy = "asFound" } = {}) {
        if (!Array.isArray(paths) || paths.length === 0) return;
        const asNum = (id) => { const m = String(id).match(/^([0-9]+)/); return m ? Number(m[1]) : Number.NEGATIVE_INFINITY; };
        const edgeVote = (nodes) => {
            let score = 0;
            const out = this.#directedOut();
            for (let i = 0; i < nodes.length - 1; i++) {
                const a = nodes[i], b = nodes[i + 1];
                if (out.get(a)?.has(b)) score += 1;
                else if (out.get(b)?.has(a)) score -= 1;
            }
            return score;
        };

        for (const p of paths) {
            if (!p || !Array.isArray(p.nodes) || p.nodes.length < 2) continue;
            let policyApplied = "asFound";
            const nodes = p.nodes;

            if (startNodeId) {
                const head = nodes[0] === startNodeId;
                const tail = nodes[nodes.length - 1] === startNodeId;
                if (!head && tail) { nodes.reverse(); policyApplied = "startNodeId"; }
            }

            if (policyApplied === "asFound" && directionPolicy === "edgeFlow") {
                const score = edgeVote(nodes);
                if (score < 0) { nodes.reverse(); policyApplied = "edgeFlow"; }
                else if (score > 0) policyApplied = "edgeFlow";
            }

            if (policyApplied === "asFound" &&
                (directionPolicy === "nodeIdAsc" || directionPolicy === "nodeIdDesc")) {
                const first = asNum(nodes[0]), last = asNum(nodes[nodes.length - 1]);
                const needAsc  = directionPolicy === "nodeIdAsc"  && first > last;
                const needDesc = directionPolicy === "nodeIdDesc" && first < last;
                if (needAsc || needDesc) { nodes.reverse(); policyApplied = directionPolicy; }
                else policyApplied = directionPolicy;
            }

            p.edges = this._recomputeEdges(nodes);
            p.leftEndpoint  = nodes[0];
            p.rightEndpoint = nodes[nodes.length - 1];
            p.direction = { start: p.leftEndpoint, end: p.rightEndpoint, policyApplied };
        }
    }

    #directedOut() {
        if (this._dirOut) return this._dirOut;
        const out = new Map();
        if (this.graph?.out?.size) {
            for (const [a, setB] of this.graph.out) out.set(a, new Set(setB));
        } else {
            for (const [ek, {from,to}] of this.graph.edges) {
                if (!out.has(from)) out.set(from, new Set());
                out.get(from).add(to);
            }
        }
        this._dirOut = out;
        return out;
    }

    _orientPathsToEdges(paths) {
        if (!Array.isArray(paths)) return;
        const out = this.#directedOut();
        const score = (nodes) => {
            let s = 0;
            for (let i = 0; i < nodes.length - 1; i++) {
                const a = nodes[i], b = nodes[i + 1];
                if (out.get(a)?.has(b)) s++;
                else if (out.get(b)?.has(a)) s--;
            }
            return s;
        };
        for (const p of paths) {
            if (!p || !Array.isArray(p.nodes) || p.nodes.length < 2) continue;
            if (p.direction && p.direction.policyApplied === "startNodeId") continue;
            const fwd = score(p.nodes), rev = score([...p.nodes].reverse());
            if (rev > fwd) {
                p.nodes.reverse();
                p.edges = this._recomputeEdges(p.nodes);
                p.leftEndpoint  = p.nodes[0];
                p.rightEndpoint = p.nodes[p.nodes.length - 1];
                p.direction = { start: p.leftEndpoint, end: p.rightEndpoint, policyApplied: "edgeFlow" };
            } else if (fwd > rev) {
                p.direction = { start: p.nodes[0], end: p.nodes[p.nodes.length - 1], policyApplied: "edgeFlow" };
            }
        }
    }

    _trimLeafEndsForAssembly(key, path, { bpMax = 0, nodesMax = 0 } = {}) {
        if (!path || !Array.isArray(path.nodes) || path.nodes.length < 2) return path;
        const { adj } = this._getInduced(key);
        const lenOf = (id) => (this.graph.nodes.get(id)?.lengthBp || 0);

        const sideLen = (forward) => {
            let i = forward ? 0 : path.nodes.length - 1;
            let j = forward ? 1 : path.nodes.length - 2;
            let total = 0, n = 0;
            while (i >= 0 && j >= 0 && i < path.nodes.length && j < path.nodes.length) {
                const a = path.nodes[i], b = path.nodes[j];
                const degA = (adj.get(a)?.size || 0);
                if (degA !== 1) break;
                total += lenOf(a); n++;
                i = forward ? i + 1 : i - 1;
                j = forward ? j + 1 : j - 1;
                const mid = path.nodes[i];
                const degMid = (adj.get(mid)?.size || 0);
                if (degMid !== 2) break;
            }
            return { totalBp: total, count: n, cutIndex: i };
        };

        let left = 0, right = path.nodes.length;
        if (bpMax > 0 || nodesMax > 0) {
            const L = sideLen(true);
            if ((bpMax > 0 && L.totalBp <= bpMax) || (nodesMax > 0 && L.count <= nodesMax)) {
                left = Math.min(Math.max(L.cutIndex, 0), right - 2);
            }
            const R = sideLen(false);
            if ((bpMax > 0 && R.totalBp <= bpMax) || (nodesMax > 0 && R.count <= nodesMax)) {
                right = Math.max(Math.min(R.cutIndex + 1, path.nodes.length), left + 2);
            }
        }
        if (left === 0 && right === path.nodes.length) return path;

        const nodes = path.nodes.slice(left, right);
        return {
            nodes,
            edges: this._recomputeEdges(nodes),
            bpLen: this._bpLenOf(nodes),
            leftEndpoint: nodes[0],
            rightEndpoint: nodes[nodes.length - 1],
            direction: { start: nodes[0], end: nodes[nodes.length - 1], policyApplied: (path.direction?.policyApplied || "trimmed") }
        };
    }

    _trimDiff(before, after) {
        let i = 0; while (i < before.length && i < after.length && before[i] === after[i]) i++;
        let j = 0; while (j < before.length && j < after.length && before[before.length-1-j] === after[after.length-1-j]) j++;
        const prefixRemoved = before.slice(0, before.length - (after.length + (before.length - after.length - j)));
        const suffixRemoved = before.slice(before.length - j + 0);
        // The above is conservative; provide straightforward version instead:
        const pr = before.slice(0, i);
        const sr = before.slice(before.length - j);
        return { prefixRemoved: pr, suffixRemoved: sr };
    }

    _countOffSpineKeyed(key, pathNodeSet) {
        const set = this.graph.assembliesIndex.get(key) || new Set();
        let c = 0; for (const id of set) if (!pathNodeSet.has(id)) c++;
        return c;
    }

    _edgeFlowScores(nodes) {
        const out = this.#directedOut();
        let fwd = 0, rev = 0;
        for (let i = 0; i < nodes.length - 1; i++) {
            const a = nodes[i], b = nodes[i + 1];
            if (out.get(a)?.has(b)) fwd++;
            if (out.get(b)?.has(a)) rev++;
        }
        const rnodes = [...nodes].reverse();
        let fwdR = 0, revR = 0;
        for (let i = 0; i < rnodes.length - 1; i++) {
            const a = rnodes[i], b = rnodes[i + 1];
            if (out.get(a)?.has(b)) fwdR++;
            if (out.get(b)?.has(a)) revR++;
        }
        return { forward: fwd - rev, reverse: fwdR - revR };
    }

    _provenanceForPath(key, path) {
        const ef = this._edgeFlowScores(path.nodes);
        return {
            assemblyKey: key,
            endpoints: { start: path.leftEndpoint, end: path.rightEndpoint },
            direction: path.direction || { policyApplied: "unknown" },
            edgeFlow: { forwardScore: ef.forward, reverseScore: ef.reverse, chosen: (ef.forward >= ef.reverse) ? "forward" : "reverse" },
            method: "induced-longest-simple + edgeFlow + optional leafTrim",
            trimmed: { enabled: false },
            offSpineKeyed: 0
        };
    }
}

export default PangenomeService;
