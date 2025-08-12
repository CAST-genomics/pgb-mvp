/**
 * Build ordered, oriented walks per (assembly_name, haplotype, sequence_id).
 * Input: graph = { node, edge, sequence, ... } using your IL7 JSON shape.
 * Output: Map<tripleKey, Array<Walk>>, where Walk is
 *   Array<{ name: "85853+", id: "85853", orient: "+" }>
 */
function buildAssemblyWalks(graph) {
  const { node, edge } = graph;

  // ---------- helpers ----------

  const baseOf = (oriented) => oriented.slice(0, -1); // "85853+" -> "85853"
  const orientOf = (oriented) => oriented.slice(-1);   // "+" or "-"
  const ensure = (map, key, init) => (map.has(key) ? map.get(key) : (map.set(key, init()), map.get(key)));

  // Per-base memberships: which triples appear on each base node
  const triplesByBase = new Map(); // base -> Set<tripleKey>
  for (const [plusName, info] of Object.entries(node)) {
    const base = baseOf(plusName);
    const set = ensure(triplesByBase, base, () => new Set());
    for (const a of info.assembly) set.add(tripleKey(a));
  }

  // Global oriented adjacency from the file’s edges
  const out = new Map();  // oriented -> Array<oriented>
  const inn = new Map();  // oriented -> Array<oriented>
  const orientedUniverse = new Set();
  for (const { starting_node: u, ending_node: v } of edge) {
    orientedUniverse.add(u); orientedUniverse.add(v);
    ensure(out, u, () => []).push(v);
    ensure(inn, v, () => []).push(u);
    ensure(out, v, () => []); // ensure presence
    ensure(inn, u, () => []);
  }

  // All triples present anywhere
  const allTriples = new Set();
  for (const s of triplesByBase.values()) for (const t of s) allTriples.add(t);

  // Topological order for tie-breaking
  function topoOrder(nodesSet, outMap, inMap) {
    const indeg = new Map();
    const q = [];
    for (const u of nodesSet) {
      const d = (inMap.get(u) || []).length;
      indeg.set(u, d);
      if (d === 0) q.push(u);
    }
    const order = [];
    for (let i = 0; i < q.length; i++) {
      const u = q[i];
      order.push(u);
      for (const v of outMap.get(u) || []) {
        const nv = indeg.get(v) - 1;
        indeg.set(v, nv);
        if (nv === 0) q.push(v);
      }
    }
    // If cycles remain, append the rest in stable iteration order
    if (order.length !== nodesSet.size) {
      for (const u of nodesSet) if (!order.includes(u)) order.push(u);
    }
    const rank = new Map(order.map((u, i) => [u, i]));
    return { order, rank };
  }

  const walksByTriple = new Map();

  for (const triple of allTriples) {
    // Allowed bases for this triple
    const allowedBases = new Set(
      [...triplesByBase.entries()]
        .filter(([, set]) => set.has(triple))
        .map(([base]) => base)
    );

    // Filtered oriented nodes (only orientations seen in the file’s edges)
    const fNodes = new Set([...orientedUniverse].filter(n => allowedBases.has(baseOf(n))));

    // Filtered adjacency
    const fOut = new Map(); const fIn = new Map();
    for (const u of fNodes) { fOut.set(u, []); fIn.set(u, []); }
    for (const u of fNodes) {
      for (const v of out.get(u) || []) {
        if (fNodes.has(v)) { fOut.get(u).push(v); fIn.get(v).push(u); }
      }
    }

    // **NEW: drop isolated oriented nodes** (deg=0 after filtering)
    for (const u of [...fNodes]) {
      const deg = (fOut.get(u)?.length ?? 0) + (fIn.get(u)?.length ?? 0);
      if (deg === 0) {
        fNodes.delete(u);
        fOut.delete(u);
        fIn.delete(u);
      }
    }
    if (fNodes.size === 0) { walksByTriple.set(triple, []); continue; }

    // Extract linear walks (there may be multiple disjoint chains)
    const remaining = new Set(fNodes);
    const { rank } = topoOrder(fNodes, fOut, fIn);
    const walks = [];

    function nextStart() {
      // Prefer indegree-0 starts; tie-break by topo rank
      let candidates = [...remaining].filter(u => (fIn.get(u) || []).filter(p => remaining.has(p)).length === 0);
      if (candidates.length === 0) candidates = [...remaining];
      return candidates.sort((a, b) => (rank.get(a) ?? 1e9) - (rank.get(b) ?? 1e9))[0];
    }

    while (remaining.size) {
      let u = nextStart();
      const walk = [];
      while (u && remaining.has(u)) {
        walk.push({ name: u, id: baseOf(u), orient: orientOf(u) });
        remaining.delete(u);

        const outs = (fOut.get(u) || []).filter(v => remaining.has(v));
        if (outs.length === 0) break;

        // Prefer non-skip edges (target indegree==1 in filtered graph), then tie-break by topo rank
        const indeg1 = outs.filter(v => (fIn.get(v) || []).filter(p => remaining.has(p) || p === u).length === 1);
        const choices = indeg1.length ? indeg1 : outs;
        choices.sort((a, b) => (rank.get(a) ?? 1e9) - (rank.get(b) ?? 1e9));
        u = choices[0];
      }
      if (walk.length) walks.push(walk);
    }

    walksByTriple.set(triple, walks);
  }

  return walksByTriple;
}

function tripleKey(a) {
    return `${a.assembly_name}||${a.haplotype}||${a.sequence_id}`
}

export { buildAssemblyWalks, tripleKey }
