// PangenomeService.js  — plain JS, no deps

class PangenomeService {
    constructor(json = null) {
        this.graph = null;
        if (json) this.createGraph(json);
    }

    // ------------------------- public API -------------------------

    createGraph(json) {
        if (!json || typeof json !== "object") throw new Error("createGraph: bad JSON");

        const nodes = new Map();     // id -> { id, sign, bareId, lengthBp, assemblies[], seq? }
        const edges = new Map();     // "edge:a:b" -> { a, b, variants: [...] }
        const adjSet = new Map();    // id -> Set(neighbor ids)
        const index = { byAssembly: new Map() };

        const seqObj  = json.sequence || {};         // { "id": "ACGT..." } (if present)
        const nodeObj = json.node     || {};         // { "id": { length?, assembly?[] } }
        const rawEdges = Array.isArray(json.edge) ? json.edge : [];

        // --- helpers
        const parseSignedId = (id) => {
            const m = String(id).match(/^(.+?)([+-])$/);
            if (!m) throw new Error(`Node id "${id}" must end with + or -`);
            return { bare: m[1], sign: m[2] };
        };
        const edgeKeyOf = (a, b) => `edge:${a}:${b}`;

        // --- nodes
        for (const id in nodeObj) {
            const n = nodeObj[id] || {};
            const { bare, sign } = parseSignedId(id);

            const assemblies = Array.isArray(n.assembly)
                ? n.assembly.map(a => a && a.assembly_name).filter(Boolean)
                : [];

            const contigKeys = Array.isArray(n.assembly)
                ? n.assembly
                    .map(a => `${a.assembly_name}#${a.haplotype}#${a.sequence_id}`)
                    .filter(k => !k.includes("undefined"))
                : [];

            const seqLen = typeof seqObj[id] === "string" ? seqObj[id].length : undefined;
            const lengthBp = Number.isFinite(n.length) ? Number(n.length)
                : Number.isFinite(seqLen)    ? seqLen
                    : 0;

            const rec = {
                id,
                sign,
                bareId: bare,
                lengthBp,
                assemblies: [...assemblies, ...contigKeys],
                seq: typeof seqObj[id] === "string" ? seqObj[id] : undefined
            };

            nodes.set(id, rec);
            adjSet.set(id, new Set());

            for (const key of rec.assemblies) {
                if (!index.byAssembly.has(key)) index.byAssembly.set(key, new Set());
                index.byAssembly.get(key).add(id);
            }
        }

        // --- edges
        rawEdges.forEach((e, i) => {
            const from = e.starting_node;
            const to   = e.ending_node;
            if (!nodes.has(from) || !nodes.has(to)) {
                // skip edges that point outside parsed node set
                return;
            }
            const ek = edgeKeyOf(from, to);
            if (!edges.has(ek)) edges.set(ek, { a: from, b: to, variants: [] });
            edges.get(ek).variants.push({ rawIndex: i, from, to });

            // undirected traversal view
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

    // mode: "auto" | "endpoint" | "blockcut"
    createAssemblyWalk(key, { mode = "auto" } = {}) {
        this.#requireGraph();
        const g = this.graph;

        const nodeSet = g.index.byAssembly.get(key);
        if (!nodeSet || nodeSet.size === 0) {
            return { key, paths: [], diagnostics: { inducedNodes: 0, inducedEdges: 0, modeUsed: null, warnings: ["no nodes"] } };
        }

        const indAdj = this.#inducedAdj(g.adj, nodeSet);

        let inducedEdges = 0;
        for (const [, nbrs] of indAdj) inducedEdges += nbrs.length;
        inducedEdges = Math.floor(inducedEdges / 2);

        const comps = this.#connectedComponents(indAdj);
        const paths = [];
        const warnings = [];

        for (const comp of comps) {
            const subAdj = new Map(comp.map(id => [id, indAdj.get(id)]));
            const actualMode = mode === "auto" ? this.#decideMode(subAdj, comp) : mode;

            // --- Patch C: robust path selection with fallbacks ---
            let nodes = (actualMode === "endpoint")
                ? this.#extractPathEndpointWalk(subAdj, comp)
                : this.#extractPathBlockCut(subAdj, comp);

            // If block-cut (or odd cases) produced nothing, fall back to endpoint
            if (!nodes || nodes.length === 0) {
                nodes = this.#extractPathEndpointWalk(subAdj, comp);
            }
            // Absolute last resort: singleton component
            if ((!nodes || nodes.length === 0) && comp.length === 1) {
                nodes = [comp[0]];
            }
            if (!nodes || nodes.length === 0) {
                warnings.push(`empty walk for component of ${key} (size=${comp.length})`);
                continue;
            }
            // --- end Patch C ---

            // Build edge list along the walk
            const edgesOnPath = [];
            for (let i = 0; i < nodes.length - 1; i++) {
                const a = nodes[i], b = nodes[i + 1];
                const ekF = this.#edgeKeyOf(a, b), ekR = this.#edgeKeyOf(b, a);
                if (this.graph.edges.has(ekF)) edgesOnPath.push(ekF);
                else if (this.graph.edges.has(ekR)) edgesOnPath.push(ekR);
                else warnings.push(`No edge found between ${a} and ${b} for ${key}`);
            }

            const bpLen = nodes.reduce((s, id) => s + (this.graph.nodes.get(id)?.lengthBp || 0), 0);
            paths.push({
                nodes,
                edges: edgesOnPath,
                leftEndpoint: nodes[0],
                rightEndpoint: nodes[nodes.length - 1],
                bpLen,
                modeUsed: actualMode
            });
        }


        return {
            key,
            paths,
            diagnostics: { inducedNodes: nodeSet.size, inducedEdges, modeUsed: mode, warnings }
        };
    }

    createAssemblyWalks({ keys = null, mode = "auto" } = {}) {
        this.#requireGraph();
        const all = keys ? keys : this.listAssemblyKeys();
        return all.map(k => this.createAssemblyWalk(k, { mode }));
    }

    // Kitchen-sink analyzer (latest version) — returns { spine, events, offSpine }
    assessGraphFeatures(spineWalk, opts = {}) {
        this.#requireGraph();
        return this.#assessGraphFeaturesImpl(spineWalk, opts);
    }

    // ------------------------- private helpers -------------------------

    #requireGraph() {
        if (!this.graph) throw new Error("PangenomeService: graph not created. Call createGraph(json) first.");
    }

    #edgeKeyOf(a, b) { return `edge:${a}:${b}`; }

    #parseSignedId(id) {
        const m = String(id).match(/^(.+?)([+-])$/);
        if (!m) throw new Error(`Node id "${id}" must end with + or -`);
        return { bare: m[1], sign: m[2] };
    }

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
            const q = [id], comp = [];
            vis.add(id);
            while (q.length) {
                const v = q.shift(); comp.push(v);
                for (const w of (indAdj.get(v) || [])) if (!vis.has(w)) { vis.add(w); q.push(w); }
            }
            comps.push(comp);
        }
        return comps;
    }

    #degreeMap(indAdj) {
        const d = new Map();
        for (const [id, list] of indAdj) d.set(id, (list || []).length);
        return d;
    }

    #chooseEndpoints(indAdj, comp) {
        const deg = this.#degreeMap(indAdj);
        const endpoints = comp.filter(id => (deg.get(id) || 0) === 1);
        if (endpoints.length >= 2) return [endpoints[0], endpoints[1]];

        const farthest = (start) => {
            const q = [start], dist = new Map([[start, 0]]); let last = start;
            while (q.length) {
                const v = q.shift(); last = v;
                for (const w of (indAdj.get(v) || [])) if (!dist.has(w)) { dist.set(w, dist.get(v) + 1); q.push(w); }
            }
            return last;
        };
        const a = comp[0];
        const u = farthest(a);
        const v = farthest(u);
        return [u, v];
    }

    #extractPathEndpointWalk(indAdj, comp) {
        if (!comp.length) return [];
        const deg = this.#degreeMap(indAdj);
        const [start] = this.#chooseEndpoints(indAdj, comp);
        const walk = [];
        const vis = new Set();
        let prev = null, cur = start;
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

    // ---- Block–cut decomposition (Tarjan) to extract canonical path in complex components
    #biconnectedDecomposition(indAdj) {
        const disc = new Map(), low = new Map(), parent = new Map();
        let time = 0;
        const edgeStack = [];
        const blocks = [];
        const articulation = new Set();

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
                    if ((parent.get(u) !== undefined && low.get(v) >= disc.get(u)) ||
                        (parent.get(u) === undefined && childCount > 1)) {
                        articulation.add(u);
                        popUntil(u, v);
                    }
                } else if (v !== parent.get(u) && disc.get(v) < disc.get(u)) {
                    push(u, v);
                    low.set(u, Math.min(low.get(u), disc.get(v)));
                }
            }
        };

        for (const u of indAdj.keys()) if (!disc.has(u)) { dfs(u); if (edgeStack.length) popUntil(...edgeStack[edgeStack.length - 1]); }
        return { blocks, articulation };
    }

    #buildBlockCutTree(blocks, articulation) {
        const bctAdj = new Map();
        const blockNodes = [];
        const add = (n) => { if (!bctAdj.has(n)) bctAdj.set(n, new Set()); };

        for (let i = 0; i < blocks.length; i++) {
            const B = `B#${i}`; add(B);
            blockNodes[i] = blocks[i];
            for (const v of blocks[i]) {
                if (!articulation.has(v)) continue;
                const A = `A#${v}`; add(A);
                bctAdj.get(B).add(A);
                bctAdj.get(A).add(B);
            }
        }
        const adj = new Map();
        for (const [k, set] of bctAdj) adj.set(k, Array.from(set));
        return { adj, blockNodes };
    }

    #blockOfVertex(blocks, v) {
        for (let i = 0; i < blocks.length; i++) if (blocks[i].has(v)) return i;
        return -1;
    }

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
                    const path = [w]; let cur = v;
                    while (cur) { path.push(cur); cur = prev.get(cur); }
                    path.reverse(); return path;
                }
                q.push(w);
            }
        }
        return null;
    }

    // --- Patch B: robust block–cut extractor ---
    #extractPathBlockCut(indAdj, comp) {
        // 1) Trivial component
        if (!comp || comp.length === 0) return [];
        if (comp.length === 1) return [comp[0]];

        // 2) Decompose the component
        const { blocks, articulation } = this.#biconnectedDecomposition(indAdj);

        // If decomposition failed or there are no blocks (degenerate/pure cycle),
        // produce a reasonable simple path.
        if (!blocks || blocks.length === 0) {
            return this.#extractPathEndpointWalk(indAdj, comp);
        }

        // 3) Choose endpoints and locate their blocks
        const [s, t] = this.#chooseEndpoints(indAdj, comp);
        const bs = this.#blockOfVertex(blocks, s);
        const bt = this.#blockOfVertex(blocks, t);

        // If we can't place endpoints in blocks, fall back to a plain BFS or endpoint walk.
        if (bs === -1 || bt === -1) {
            const p = this.#bfsPath(indAdj, s, t);
            return (p && p.length) ? p : this.#extractPathEndpointWalk(indAdj, comp);
        }

        // 4) Build the Block–Cut Tree (BCT) and find a route from s's block to t's block
        const { adj: bctAdj } = this.#buildBlockCutTree(blocks, articulation);
        const start = `B#${bs}`, goal = `B#${bt}`;

        // BFS on the BCT
        const Q = [start], prev = new Map([[start, null]]);
        while (Q.length) {
            const x = Q.shift();
            if (x === goal) break;
            for (const y of (bctAdj.get(x) || [])) {
                if (!prev.has(y)) { prev.set(y, x); Q.push(y); }
            }
        }
        // If no BCT path, fall back
        if (!prev.has(goal)) {
            const p = this.#bfsPath(indAdj, s, t);
            return (p && p.length) ? p : this.#extractPathEndpointWalk(indAdj, comp);
        }

        // Recover BCT path: alternates B#i, A#v, B#j, A#u, ...
        const bctPath = [];
        for (let cur = goal; cur; cur = prev.get(cur)) bctPath.push(cur);
        bctPath.reverse();

        // 5) Stitch a final node path by walking block segments
        const finalPath = [];
        let entry = s;

        for (let i = 0; i < bctPath.length; i++) {
            const label = bctPath[i];
            if (!label.startsWith("B#")) continue;                // skip articulation labels here

            const bi = Number(label.slice(2));                    // block index
            const allowSet = new Set(blocks[bi]);                 // vertices allowed inside this block

            // Determine entry/exit vertices for this block segment
            const inEntry = (i === 0)
                ? entry
                : (bctPath[i - 1].startsWith("A#") ? bctPath[i - 1].slice(2) : entry);

            let inExit;
            if (i === bctPath.length - 1) {
                inExit = t;                                         // last block goes to t
            } else {
                const nextLabel = bctPath[i + 1];
                inExit = (nextLabel && nextLabel.startsWith("A#"))
                    ? nextLabel.slice(2)                              // next articulation in BCT path
                    : t;
            }

            // BFS inside this block from inEntry to inExit
            const seg = this.#bfsPath(indAdj, inEntry, inExit, allowSet) || [];

            // If we failed to find a segment inside a block, fall back to a global simple path
            if (!seg.length) {
                const p = this.#bfsPath(indAdj, s, t) || this.#extractPathEndpointWalk(indAdj, comp);
                return p;
            }

            // Append, avoiding duplicate join node
            if (finalPath.length && finalPath[finalPath.length - 1] === seg[0]) {
                finalPath.push(...seg.slice(1));
            } else {
                finalPath.push(...seg);
            }

            // Next block will enter from the articulation we just exited
            entry = inExit;
        }

        // 6) Safety fallback
        if (!finalPath.length) {
            const p = this.#bfsPath(indAdj, s, t) || this.#extractPathEndpointWalk(indAdj, comp);
            return p || [];
        }
        return finalPath;
    }

    #decideMode(subAdj, comp) {
        const deg = this.#degreeMap(subAdj);
        const n = comp.length;
        const e = comp.reduce((s, id) => s + (subAdj.get(id) || []).length, 0) / 2;
        const endpoints = comp.filter(id => (deg.get(id) || 0) === 1).length;
        const maxDeg = Math.max(0, ...comp.map(id => deg.get(id) || 0));

        // Small/degenerate → endpoint extraction
        if (n <= 2 || e <= 1) return "endpoint";

        const looksChainy = (endpoints === 2) && (maxDeg <= 2) && (e <= n);
        return looksChainy ? "endpoint" : "blockcut";
    }

    // --------------------- assessGraphFeatures (full) ---------------------

    #assessGraphFeaturesImpl(spineWalk, {
        locusStartBp = 0,
        includeAdjacent = true,
        includeUpstream = true,
        allowMidSpineReentry = true,
        includeDangling = true,
        includeOffSpineComponents = true,
        maxPathsPerEvent = 8,
        maxRegionNodes = 5000,
        maxRegionEdges = 8000
    } = {}) {
        const g = this.graph;
        const edgeKeyOf = (a, b) => `edge:${a}:${b}`;
        const num = (id) => this.#num(id);

        // ---- spine map
        const chain = (spineWalk?.paths?.[0]?.nodes || []).slice();
        const adj = g.adj;
        const spineSet = new Set(chain);
        const indexOnSpine = new Map(chain.map((id, i) => [id, i]));

        const bpStart = new Map(), bpEnd = new Map();
        let acc = locusStartBp;
        for (const id of chain) { bpStart.set(id, acc); acc += (g.nodes.get(id)?.lengthBp || 0); bpEnd.set(id, acc); }

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
            nodes: chain.map(id => ({
                id, bpStart: bpStart.get(id), bpEnd: bpEnd.get(id), lenBp: g.nodes.get(id)?.lengthBp || 0
            })),
            edges: edgesForPath(chain),
            lengthBp: (bpEnd.get(chain.at(-1)) || locusStartBp) - locusStartBp
        };

        const offNbrs = new Map();
        for (const v of chain) offNbrs.set(v, (adj.get(v) || []).filter(u => !spineSet.has(u)));
        const spineWindow = (i, j) => new Set(chain.slice(Math.min(i, j), Math.max(i, j) + 1));

        // ---- discover candidate anchors
        const candidatePairs = new Map(); // "${L}|${R}" or "${L}|null:sig" -> { L, R, kind }
        const visitedDanglingSets = new Set();

        const addPair = (L, R, kind) => {
            const i = indexOnSpine.get(L), j = indexOnSpine.get(R);
            if (R != null) {
                if (!includeAdjacent && j === i + 1) return;
                if (!includeUpstream && j <= i) return;
            }
            const key = `${L}|${R}`;
            if (!candidatePairs.has(key)) candidatePairs.set(key, { L, R, kind });
        };

        for (const L of chain) {
            const q = [...offNbrs.get(L)];
            const seen = new Set([L, ...offNbrs.get(L)]);
            let hitAny = false;
            while (q.length) {
                const v = q.shift();
                for (const w of (adj.get(v) || [])) {
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
                    const sig = regionNodes.slice().sort((a, b) => num(a) - num(b)).join(",");
                    const key = `${L}|null:${sig}`;
                    if (!visitedDanglingSets.has(sig)) {
                        visitedDanglingSets.add(sig);
                        candidatePairs.set(key, { L, R: null, kind: "dangling" });
                    }
                }
            }
        }

        // ---- region & path utilities
        const growOff = (seed) => {
            const S = new Set([seed]);
            const q = (adj.get(seed) || []).filter(x => !spineSet.has(x));
            for (const x of q) S.add(x);
            while (q.length) {
                const v = q.shift();
                for (const w of (adj.get(v) || [])) {
                    if (S.has(w)) continue;
                    if (spineSet.has(w)) continue;
                    S.add(w); q.push(w);
                }
            }
            return S;
        };

        const makeRegion = (L, R) => {
            const Lset = growOff(L);
            let Rset = null;
            if (R) Rset = growOff(R);
            const region = new Set([L]); if (R) region.add(R);
            if (R) { for (const v of Lset) if (Rset.has(v)) region.add(v); }
            else   { for (const v of Lset) if (!spineSet.has(v)) region.add(v); }
            if (allowMidSpineReentry && R) {
                const i = indexOnSpine.get(L), j = indexOnSpine.get(R);
                for (const s of spineWindow(i, j)) region.add(s);
            }
            return region;
        };

        const buildRegionAdj = (region) => {
            const allow = new Set(region);
            const subAdj = new Map(); let edgeCount = 0;
            for (const v of allow) subAdj.set(v, []);
            for (const v of allow) {
                for (const w of (adj.get(v) || [])) {
                    if (!allow.has(w)) continue;
                    subAdj.get(v).push(w);
                    if (num(v) < num(w)) edgeCount++;
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
            const interiorLens = pathNodes.map((id, idx) => (idx > 0 && idx < pathNodes.length - 1) ? len(id) : 0);
            const totalAlt = interiorLens.reduce((a, b) => a + b, 0);
            const spanLen = Math.max(0, spanEnd - spanStart);
            const details = [];
            let cum = 0;
            for (let i = 0; i < pathNodes.length; i++) {
                const id = pathNodes[i];
                const isSpine = spineSet.has(id);
                const nLen = len(id);
                const altStartBp = cum;
                const addLen = (i > 0 && i < pathNodes.length - 1) ? nLen : 0;
                const altEndBp = cum + addLen;

                let refBpStart, refBpEnd;
                if (isSpine && bpStart.has(id)) {
                    refBpStart = bpStart.get(id);
                    refBpEnd = bpEnd.get(id);
                } else {
                    const t0 = totalAlt > 0 ? (altStartBp / totalAlt) : 0;
                    const t1 = totalAlt > 0 ? (altEndBp / totalAlt) : t0;
                    refBpStart = spanStart + t0 * spanLen;
                    refBpEnd = spanStart + t1 * spanLen;
                }

                details.push({ id, isSpine, lenBp: nLen, altStartBp, altEndBp, refBpStart, refBpEnd });
                if (addLen > 0) cum += nLen;
            }
            return { nodesDetailed: details, altPathLenBp: totalAlt };
        };

        // ---- build all events
        const events = [];
        for (const [, cand] of candidatePairs) {
            const { L, R, kind } = cand;

            const region = makeRegion(L, R);
            const regionTooBig = region.size > maxRegionNodes;
            const { subAdj: regionAdj, edgeCount } = buildRegionAdj(region);
            const adjTooBig = edgeCount > maxRegionEdges;

            const regionNodes = Array.from(region).filter(x => !spineSet.has(x));

            // off<->off unique edges
            const regionEdges = [];
            const offOffSeen = new Set();
            for (const v of regionNodes) {
                for (const nb of (adj.get(v) || [])) {
                    if (!region.has(nb) || spineSet.has(nb)) continue;
                    const a = num(v) < num(nb) ? v : nb;
                    const b = a === v ? nb : v;
                    const key = `${a}|${b}`;
                    if (offOffSeen.has(key)) continue;
                    offOffSeen.add(key);
                    const ek = g.edges.has(edgeKeyOf(a, b)) ? edgeKeyOf(a, b) : edgeKeyOf(b, a);
                    regionEdges.push(ek);
                }
            }

            // off<->spine edges inside region
            const regionSpineNodes = Array.from(region).filter(id => spineSet.has(id));
            const regionSpineSet = new Set(regionSpineNodes);
            const anchorEdgesSet = new Set();
            for (const v of regionNodes) {
                for (const nb of (adj.get(v) || [])) {
                    if (!regionSpineSet.has(nb)) continue;
                    const ek = g.edges.has(edgeKeyOf(v, nb)) ? edgeKeyOf(v, nb) : edgeKeyOf(nb, v);
                    anchorEdgesSet.add(ek);
                }
            }
            const anchorEdges = Array.from(anchorEdgesSet);

            // anchors on reference
            const spanStart = bpEnd.get(L);
            const spanEnd = R ? bpStart.get(R) : bpEnd.get(L);
            const refLenBp = R ? Math.max(0, spanEnd - spanStart) : 0;

            // paths (edge-disjoint, filter spine hop; remove L<->R if encountered)
            const paths = [];
            const mutableAdj = new Map();
            for (const [v, ns] of regionAdj) mutableAdj.set(v, ns ? ns.slice() : []);
            let truncatedPaths = false;
            let removedSpineLeg = false;

            const removeInteriorEdges = (nodePath) => {
                for (let i = 0; i < nodePath.length - 1; i++) {
                    const a = nodePath[i], b = nodePath[i + 1];
                    const la = mutableAdj.get(a) || [], lb = mutableAdj.get(b) || [];
                    const ia = la.indexOf(b); if (ia >= 0) la.splice(ia, 1);
                    const ib = lb.indexOf(a); if (ib >= 0) lb.splice(ib, 1);
                }
            };

            if (R) {
                for (let k = 0; k < maxPathsPerEvent; k++) {
                    const allowSet = new Set(mutableAdj.keys());
                    const path = dijkstraNodeWeighted(regionAdj, L, R, allowSet);
                    if (!path) break;

                    const interior = path.slice(1, -1);
                    const hasOffSpineInterior = interior.some(id => !spineSet.has(id));
                    if (!hasOffSpineInterior) {
                        removedSpineLeg = true;
                        const la = mutableAdj.get(L) || [];
                        const lb = mutableAdj.get(R) || [];
                        if (la.includes(R)) mutableAdj.set(L, la.filter(x => x !== R));
                        if (lb.includes(L)) mutableAdj.set(R, lb.filter(x => x !== L));
                        continue;
                    }

                    const { nodesDetailed, altPathLenBp } = decoratePath(path, spanStart, spanEnd);
                    const altLenBp = altPathLenBp;

                    paths.push({
                        nodes: path,
                        edges: edgesForPath(path),
                        altLenBp,
                        altPathLenBp,
                        nodesDetailed
                    });

                    removeInteriorEdges(path);
                }
                truncatedPaths = (maxPathsPerEvent > 0) && (paths.length === maxPathsPerEvent);
            }

            let type = "simple_bubble";
            if (!R) type = "dangling";
            else if (L === R || refLenBp === 0) type = "pill";

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
                    rightBpEnd: R ? bpEnd.get(R) : null
                },
                region: {
                    nodes: regionNodes,
                    edges: regionEdges,
                    anchorEdges,
                    truncated: !!(regionTooBig || adjTooBig)
                },
                paths,
                stats: {
                    nPaths: paths.length,
                    minAltLenBp: paths.length ? Math.min(...paths.map(p => p.altLenBp)) : 0,
                    maxAltLenBp: paths.length ? Math.max(...paths.map(p => p.altLenBp)) : 0,
                    truncatedPaths,
                    removedSpineLeg
                },
                relations: { parentId: null, childrenIds: [], overlapGroup: null, sameAnchorGroup: null }
            });
        }

        // ---- interval relations & coarse classes
        const contains = (A, B) => A.start <= B.start && A.end >= B.end;
        const overlaps = (A, B) => !(A.end <= B.start || B.end <= A.start);

        const proper = events.filter(e => e.anchors.rightId);

        // group by same anchors (parallel detours)
        const sameKeyToGroup = new Map(); let sg = 1;
        for (const e of proper) {
            const k = `${e.anchors.leftId}|${e.anchors.rightId}`;
            if (!sameKeyToGroup.has(k)) sameKeyToGroup.set(k, sg++);
            e.relations.sameAnchorGroup = sameKeyToGroup.get(k);
        }

        const intervals = proper.map(e => ({
            id: e.id,
            start: Math.min(e.anchors.spanStart, e.anchors.spanEnd),
            end: Math.max(e.anchors.spanStart, e.anchors.spanEnd)
        })).sort((a, b) => a.start - b.start || a.end - b.end);

        const byId = new Map(proper.map(e => [e.id, e]));
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

        // ---- off-spine components (context only)
        let offSpine = [];
        if (includeOffSpineComponents) {
            const off = new Set(g.nodes.keys());
            for (const s of chain) off.delete(s);
            const seen = new Set();
            for (const v of off) {
                if (seen.has(v)) continue;
                const comp = []; const q = [v]; seen.add(v);
                while (q.length) {
                    const x = q.shift(); comp.push(x);
                    for (const nb of (adj.get(x) || [])) {
                        if (spineSet.has(nb) || seen.has(nb)) continue;
                        seen.add(nb); q.push(nb);
                    }
                }
                const edges = [];
                for (const x of comp) {
                    for (const nb of (adj.get(x) || [])) {
                        if (spineSet.has(nb)) continue;
                        if (comp.indexOf(nb) < 0) continue;
                        if (num(nb) < num(x)) continue;
                        const ek = g.edges.has(edgeKeyOf(x, nb)) ? edgeKeyOf(x, nb) : edgeKeyOf(nb, x);
                        edges.push(ek);
                    }
                }
                offSpine.push({ nodes: comp, edges, size: comp.length });
            }
        }

        return { spine, events, offSpine };
    }
}

// ------------------------- usage example -------------------------
// const svc = new PangenomeService(json);
// // or: svc.createGraph(json);
// const grch = svc.createAssemblyWalk("GRCh38", { mode: "auto" });
// const features = svc.assessGraphFeatures(grch, {
//   includeAdjacent: true,
//   includeUpstream: true,
//   allowMidSpineReentry: true,
//   includeDangling: true,
//   includeOffSpineComponents: true,
//   maxPathsPerEvent: 8
// });
// // features.spine, features.events, features.offSpine → feed to your renderer.

export default PangenomeService;
