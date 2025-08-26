// PangenomeService v1.1 — deterministic walks + bounded feature assessment.
// Pure JavaScript. No external dependencies.

class PangenomeService {
    constructor() {
        this.graph = null;       // { nodes, edges, out, adj, assembliesIndex }
        this._dirOut = null;
        this._defaultLocusStartBp = 0;
    }

    // ---------- Public API ----------

    loadData(json, { assemblyKeyDelim = "#" } = {}) {
        const nodes = new Map();      // id -> { id, lengthBp, assemblies:Set, raw? }
        const edges = new Map();      // "edge:a:b" -> { from, to }
        const out   = new Map();      // id -> Set(neighbors) (directed)
        const adj   = new Map();      // id -> Set(neighbors) (undirected)
        const assembliesIndex = new Map(); // asmKey -> Set(nodeId)

        const addOut=(a,b)=>{ if(!out.has(a)) out.set(a,new Set()); out.get(a).add(b); };
        const addAdj=(a,b)=>{ if(!adj.has(a)) adj.set(a,new Set()); if(!adj.has(b)) adj.set(b,new Set()); adj.get(a).add(b); adj.get(b).add(a); };

        const seqs = new Map();
        if (json?.sequence) for (const [id, seq] of Object.entries(json.sequence)) seqs.set(String(id), String(seq ?? ""));

        const nodeBag = json?.node || {};
        for (const [k, raw] of Object.entries(nodeBag)) {
            const id = String(raw?.name ?? k);
            const seq = seqs.get(id) ?? null;
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

            nodes.set(id, { id, lengthBp, assemblies, raw });
            if (!out.has(id)) out.set(id, new Set());
            if (!adj.has(id)) adj.set(id, new Set());
        }

        const stripSign = s => String(s).replace(/[+-]$/, "");
        const resolveNodeId = rawId => {
            if (!rawId) return null;
            const id = String(rawId);
            if (nodes.has(id)) return id;
            if (/[+-]$/.test(id)) {
                const base = stripSign(id);
                for (const cand of nodes.keys()) if (stripSign(cand) === base) return cand;
            } else {
                for (const cand of nodes.keys()) if (stripSign(cand) === id) return cand;
            }
            return null;
        };

        for (const e of (json?.edge || [])) {
            const from = resolveNodeId(e.starting_node);
            const to   = resolveNodeId(e.ending_node);
            if (!from || !to) continue;
            const key = `edge:${from}:${to}`;
            if (!edges.has(key)) { edges.set(key, { from, to }); addOut(from, to); addAdj(from, to); }
        }

        this.graph = { nodes, edges, out, adj, assembliesIndex, locus: json?.locus ?? null };
        this._dirOut = null;
        return true;
    }

    listAssemblyKeys() {
        this.#requireGraph();
        return [...this.graph.assembliesIndex.keys()].sort();
    }

    // --- Walks ---

    /**
     * Return a single **linear, non-branching** path for an assembly.
     * If `startNodeId` is present in the assembly component and `startPolicy:"forceFromNode"`,
     * the path **starts at that node**.
     */
    getAssemblyWalk(assemblyKey, {
        startNodeId = null,
        startPolicy = "preferEndpoint",   // "preferEndpoint" | "forceFromNode"
        directionPolicy = "edgeFlow"      // "edgeFlow" | "asIs"
    } = {}) {
        this.#requireGraph();

        const induced = this.#induced(assemblyKey);
        if (induced.nodesIn.size === 0) return { nodes: [], edges: [] };

        if (startNodeId && !induced.nodesIn.has(startNodeId)) {
            throw new Error(`startNodeId ${startNodeId} is not in assembly ${assemblyKey}`);
        }

        const comp = (startNodeId)
            ? this.#componentContaining(startNodeId, induced.adj)
            : this.#largestComponentByBp(induced.adj);

        let nodes = (startNodeId && startPolicy === "forceFromNode")
            ? this.#anchoredPathByDoubleSweep(comp, startNodeId, induced.adj)
            : this.#diameterPath(comp, induced.adj);

        if (directionPolicy === "edgeFlow" && !(startNodeId && startPolicy === "forceFromNode")) {
            const sF = this.#edgeFlowScore(nodes);
            const sR = this.#edgeFlowScore([...nodes].reverse());
            if (sR > sF) nodes.reverse();
        }

        const edges = this._recomputeEdges(nodes);
        return { nodes, edges };
    }

    // --- Locus baseline ---

    setDefaultLocusStartBp(bp) { this._defaultLocusStartBp = Number(bp) || 0; return this._defaultLocusStartBp; }
    getDefaultLocusStartBp()   { return this._defaultLocusStartBp ?? 0; }

    // --- Spine + features (bounded, fast) ---

    /**
     * Build a linearized “spine” for an assembly and discover nearby events.
     * Bounded by caps & a global operation budget to avoid stalls.
     *
     * assessOpts:
     *  - includeAdjacent=true
     *  - allowMidSpineReentry=true
     *  - includeDangling=true
     *  - includeOffSpineComponents="none"|"summary"|"full"
     *  - maxPathsPerEvent=1
     *  - maxRegionHops=64, maxRegionNodes=4000, maxRegionEdges=4000
     *  - operationBudget=500000
     *  - locusStartBp = (default set via setDefaultLocusStartBp)
     *
     * walkOpts: passed to getAssemblyWalk (startNodeId, startPolicy, directionPolicy)
     */
    getSpineFeatures(assemblyKey, assessOpts = {}, walkOpts = {}) {
        this.#requireGraph();

        const {
            includeAdjacent = true,
            allowMidSpineReentry = true,
            includeDangling = true,
            includeOffSpineComponents = "none",  // "none" | "summary" | "full"
            maxPathsPerEvent = 1,
            maxRegionHops = 64,
            maxRegionNodes = 4000,
            maxRegionEdges = 4000,
            operationBudget = 500000,
            locusStartBp = (this._defaultLocusStartBp ?? 0)
        } = assessOpts || {};

        // 1) Spine path (linear, anchored if requested)
        const path = this.getAssemblyWalk(assemblyKey, walkOpts);
        if (!path.nodes.length) {
            return {
                spine: { assemblyKey, nodes: [], edges: [], lengthBp: 0 },
                events: [],
                offSpine: [],
                aborted: false
            };
        }

        // 2) Spine with bp coords
        let x = Number(locusStartBp) || 0;
        const spineNodes = [];
        for (const id of path.nodes) {
            const len = this.graph.nodes.get(id)?.lengthBp || 0;
            spineNodes.push({ id, bpStart: x, bpEnd: x + len, lengthBp: len });
            x += len;
        }
        const spine = {
            assemblyKey,
            nodes: spineNodes,
            edges: path.edges.slice(),
            lengthBp: spineNodes.length ? (spineNodes[spineNodes.length-1].bpEnd - spineNodes[0].bpStart) : 0
        };

        // 3) Event discovery (bounded)
        let budget = Math.max(10000, Number(operationBudget) || 200000);
        const onSpine = new Set(spine.nodes.map(n => n.id));
        const bpOf = new Map(spine.nodes.map(n => [n.id, { bpStart: n.bpStart, bpEnd: n.bpEnd }]));
        const events = [];
        const seenPairs = new Set();

        const hasOffSpineNeighbor = (id) => {
            for (const u of (this.graph.adj.get(id) || [])) {
                if (--budget <= 0) break;
                if (!onSpine.has(u)) return true;
            }
            return false;
        };

        // Explore around (L,R) to find alt region
        const exploreRegion = (L, R) => {
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

            // Region edges (directed keys, de-duplicated by undirected pair)
            const redges = new Set();
            const undPairs = new Set();
            for (const a of region) {
                for (const b of (this.graph.adj.get(a) || [])) {
                    if (!region.has(b)) continue;
                    const pair = (a < b) ? `${a}|${b}` : `${b}|${a}`;
                    if (undPairs.has(pair)) continue;
                    undPairs.add(pair);
                    const k1 = `edge:${a}:${b}`;
                    const k2 = `edge:${b}:${a}`;
                    if (this.graph.edges.has(k1)) redges.add(k1);
                    if (this.graph.edges.has(k2)) redges.add(k2);
                    if (redges.size > maxRegionEdges) { truncated = true; break; }
                }
                if (truncated) break;
            }

            return { parent, region, redges: [...redges], touchedR, truncated };
        };

        const shortestAltPath = (L, R, region) => {
            const q = [L];
            const p = new Map([[L, null]]);
            while (q.length) {
                const v = q.shift();
                for (const u of (this.graph.adj.get(v) || [])) {
                    if (--budget <= 0) return null;
                    if (!region.has(u) || p.has(u)) continue;
                    p.set(u, v);
                    if (u === R) {
                        const nodes = [];
                        for (let cur = u; cur != null; cur = p.get(cur)) nodes.push(cur);
                        nodes.reverse();
                        const edges = this._recomputeEdges(nodes);
                        const offNodes = nodes.filter(id => !onSpine.has(id));
                        const altLenBp = offNodes.reduce((s, id)=> s + (this.graph.nodes.get(id)?.lengthBp || 0), 0);
                        return { nodes, edges, altLenBp };
                    }
                    q.push(u);
                }
            }
            return null;
        };

        for (let i = 0; i < spine.nodes.length - 1; i++) {
            if (budget <= 0) break;
            const L = spine.nodes[i].id;
            const R = spine.nodes[i+1].id;
            const pairKey = `${L}|${R}`;
            if (seenPairs.has(pairKey)) continue;

            if (!hasOffSpineNeighbor(L) && !hasOffSpineNeighbor(R)) {
                seenPairs.add(pairKey);
                continue;
            }

            const { region, redges, touchedR, truncated } = exploreRegion(L, R);

            // If region == {L,R} only and we don't want adjacent-only pills, skip
            const onlyLR = (region.size === 2 && region.has(L) && region.has(R));
            if (onlyLR && !includeAdjacent) { seenPairs.add(pairKey); continue; }

            // Must actually include off-spine content
            const hasOff = [...region].some(n => !onSpine.has(n));
            if (!hasOff) { seenPairs.add(pairKey); continue; }

            const touchesMidSpine = [...region].some(n => n !== L && n !== R && onSpine.has(n));

            let type = null;
            if (touchedR) {
                const refLen = Math.max(0, (bpOf.get(R).bpStart - bpOf.get(L).bpEnd));
                type = touchesMidSpine ? "braid" : (refLen === 0 ? "pill" : "simple_bubble");
            } else if (includeDangling) {
                type = "dangling";
            }
            if (!type) { seenPairs.add(pairKey); continue; }

            const spanStart = bpOf.get(L)?.bpEnd ?? 0;
            const spanEnd   = bpOf.get(R)?.bpStart ?? spanStart;
            const refLenBp  = Math.max(0, spanEnd - spanStart);

            const paths = [];
            if (touchedR && maxPathsPerEvent > 0) {
                const p = shortestAltPath(L, R, region);
                if (p && !(p.nodes.length === 2 && p.nodes[0] === L && p.nodes[1] === R)) paths.push(p);
            }

            const regionNodes = [...region].filter(id => !(id === L && id === R));
            events.push({
                id: `${L}~${R}`,
                type,
                anchors: { leftId: L, rightId: R, spanStart, spanEnd, refLenBp, orientation: "forward" },
                region: { nodes: regionNodes, edges: redges, truncated: !!truncated },
                paths,
                stats: {
                    nPaths: paths.length,
                    minAltLenBp: paths.length ? Math.min(...paths.map(p => p.altLenBp)) : 0,
                    maxAltLenBp: paths.length ? Math.max(...paths.map(p => p.altLenBp)) : 0,
                    truncatedPaths: !!truncated,
                    removedSpineLeg: true
                },
                relations: { parentId: null, childrenIds: [], overlapGroup: null, sameAnchorGroup: null }
            });

            seenPairs.add(pairKey);
        }

        // 4) Optional: off-spine components (context only)
        const offSpine = [];
        if (includeOffSpineComponents !== "none" && budget > 0) {
            const seen = new Set([...onSpine]);
            for (const [id] of this.graph.nodes) {
                if (budget <= 0) break;
                if (seen.has(id)) continue;
                const q = [id], comp = new Set([id]); seen.add(id);
                let touches = false;
                while (q.length) {
                    const v = q.shift();
                    for (const u of (this.graph.adj.get(v) || [])) {
                        if (--budget <= 0) break;
                        if (onSpine.has(u)) touches = true;
                        if (!seen.has(u)) { seen.add(u); comp.add(u); q.push(u); }
                        if (comp.size > maxRegionNodes * 2) break;
                    }
                    if (budget <= 0) break;
                }
                if (!touches) {
                    if (includeOffSpineComponents === "summary") {
                        offSpine.push({ nodes: [...comp], edges: [], keyed: false });
                    } else {
                        // full: collect internal directed edges
                        const redges = new Set();
                        const pairs = new Set();
                        for (const a of comp) {
                            for (const b of (this.graph.adj.get(a) || [])) {
                                if (!comp.has(b)) continue;
                                const pair = (a < b) ? `${a}|${b}` : `${b}|${a}`;
                                if (pairs.has(pair)) continue;
                                pairs.add(pair);
                                const k1 = `edge:${a}:${b}`, k2 = `edge:${b}:${a}`;
                                if (this.graph.edges.has(k1)) redges.add(k1);
                                if (this.graph.edges.has(k2)) redges.add(k2);
                                if (redges.size > maxRegionEdges) break;
                            }
                            if (redges.size > maxRegionEdges) break;
                        }
                        offSpine.push({ nodes: [...comp], edges: [...redges], keyed: false, truncated: redges.size > maxRegionEdges });
                    }
                }
            }
        }

        const aborted = (budget <= 0);
        return { spine, events, offSpine, aborted };
    }

    // ---------- Private: induced subgraph & components ----------

    #induced(assemblyKey) {
        const nodesIn = new Set();
        for (const [id, n] of this.graph.nodes) if (n.assemblies.has(assemblyKey)) nodesIn.add(id);

        const adj = new Map();
        const add=(a,b)=>{ if(!adj.has(a)) adj.set(a,new Set()); adj.get(a).add(b); };

        for (const [id] of nodesIn) adj.set(id, new Set());
        for (const [from, outs] of this.graph.out) if (nodesIn.has(from)) {
            for (const to of outs) if (nodesIn.has(to)) { add(from,to); add(to,from); }
        }
        return { nodesIn, adj };
    }

    #componentContaining(start, adj) {
        const seen = new Set([start]);
        const q = [start];
        while (q.length) {
            const v = q.shift();
            for (const u of (adj.get(v) || [])) if (!seen.has(u)) { seen.add(u); q.push(u); }
        }
        return seen;
    }

    #largestComponentByBp(adj) {
        const lenOf = (id)=> (this.graph.nodes.get(id)?.lengthBp || 0);
        const seen = new Set();
        let best = null, bestBp = -1;

        for (const v of adj.keys()) {
            if (seen.has(v)) continue;
            const q = [v], comp = new Set([v]); seen.add(v);
            let bp = lenOf(v);
            while (q.length) {
                const x = q.shift();
                for (const y of (adj.get(x) || [])) if (!seen.has(y)) { seen.add(y); comp.add(y); q.push(y); bp += lenOf(y); }
            }
            if (bp > bestBp) { bestBp = bp; best = comp; }
        }
        return best;
    }

    // ---------- Private: path algorithms (deterministic) ----------

    #diameterPath(comp, adj) {
        const seed = [...comp].sort(this.#idCmp)[0];
        const a = this.#bfsFarthest(seed, adj).far;
        const { far: b, parent } = this.#bfsFarthest(a, adj);
        return this.#reconstruct(parent, b);
    }

    #anchoredPathByDoubleSweep(comp, anchor, adj) {
        if (!comp.has(anchor)) throw new Error("Anchor not in component.");
        const fromA = this.#bfsAll(anchor, adj);
        const end = this.#argMaxBy(comp, (u)=>[
            fromA.dist.get(u) ?? -Infinity,
            fromA.bp.get(u) ?? -Infinity,
            -this.#idRank(u)
        ]);
        const path = this.#reconstruct(fromA.parent, end);
        const idx = path.indexOf(anchor);
        return (idx <= 0) ? path : path.slice(idx);
    }

    #bfsFarthest(start, adj) {
        const parent = new Map([[start, null]]);
        const dist   = new Map([[start, 0]]);
        const q = [start];
        let far = start;

        while (q.length) {
            const v = q.shift();
            for (const u of (adj.get(v) || [])) {
                if (dist.has(u)) continue;
                parent.set(u, v);
                dist.set(u, dist.get(v) + 1);
                q.push(u);
                if (dist.get(u) > dist.get(far) || (dist.get(u) === dist.get(far) && this.#idCmp(u, far) < 0)) {
                    far = u;
                }
            }
        }
        return { far, parent, dist };
    }

    #bfsAll(start, adj) {
        const lenOf = (id)=> (this.graph.nodes.get(id)?.lengthBp || 0);
        const parent = new Map([[start, null]]);
        const dist   = new Map([[start, 0]]);
        const bp     = new Map([[start, lenOf(start)]]);
        const q = [start];

        while (q.length) {
            const v = q.shift();
            for (const u of (adj.get(v) || [])) {
                const candD = dist.get(v) + 1;
                const candB = (bp.get(v) || 0) + lenOf(u);
                if (!dist.has(u)) {
                    parent.set(u, v);
                    dist.set(u, candD);
                    bp.set(u, candB);
                    q.push(u);
                } else if (candD === dist.get(u) && candB > bp.get(u)) {
                    parent.set(u, v);
                    bp.set(u, candB);
                }
            }
        }
        return { parent, dist, bp };
    }

    #reconstruct(parent, end) {
        const arr = [];
        for (let cur = end; cur != null; cur = parent.get(cur)) arr.push(cur);
        arr.reverse();
        return arr;
    }

    // ---------- Private: utilities ----------

    _recomputeEdges(nodes) {
        const keys = [];
        for (let i = 0; i < nodes.length - 1; i++) {
            const a = nodes[i], b = nodes[i+1];
            const k1 = `edge:${a}:${b}`, k2 = `edge:${b}:${a}`;
            if (this.graph.edges.has(k1)) keys.push(k1);
            else if (this.graph.edges.has(k2)) keys.push(k2);
            else keys.push(`edge:${a}:${b}`); // fall back for display
        }
        return keys;
    }

    #directedOut() {
        if (this._dirOut) return this._dirOut;
        const out = new Map();
        for (const [a, setB] of this.graph.out) out.set(a, new Set(setB));
        this._dirOut = out;
        return out;
    }

    #edgeFlowScore(nodes) {
        const out = this.#directedOut();
        let s = 0;
        for (let i = 0; i < nodes.length - 1; i++) {
            const a = nodes[i], b = nodes[i+1];
            if (out.get(a)?.has(b)) s++;
            else if (out.get(b)?.has(a)) s--;
        }
        return s;
    }

    #idCmp = (a, b) => String(a).localeCompare(String(b), 'en', { numeric: true });
    #idRank = (a) => { const m = String(a).match(/^(\d+)/); return m ? Number(m[1]) : Number.POSITIVE_INFINITY; };

    #argMaxBy(iterable, keyFn) {
        let best = null, bestK = null;
        for (const x of iterable) {
            const k = keyFn(x);
            if (!bestK || this.#tupleCmp(k, bestK) > 0) { best = x; bestK = k; }
        }
        return best;
    }

    #tupleCmp(a, b) {
        const n = Math.max(a.length, b.length);
        for (let i = 0; i < n; i++) {
            const va = a[i] ?? 0, vb = b[i] ?? 0;
            if (va === vb) continue;
            return (va > vb) ? 1 : -1;
        }
        return 0;
    }

    #requireGraph() {
        if (!this.graph) throw new Error("PangenomeService: call loadData(json) first.");
    }
}

export default PangenomeService;
