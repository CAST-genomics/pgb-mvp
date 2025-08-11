/**
 * Build ordered, oriented walks per assembly triplet (assembly_name, haplotype, sequence_id).
 * Works with your JSON shape: { locus, node, edge, sequence }.
 *
 * Returns a Map<tripleKey, Array<Walk>>, where each Walk is
 *   Array<{ name: "85853+", id: "85853", orient: "+" }>
 *
 * tripleKey format: "assembly_name||haplotype||sequence_id"
 */
function buildAssemblyWalks(graph) {
  const { node, edge } = graph;

  // ---- helpers ----
  const tripleKey = (a) => `${a.assembly_name}||${a.haplotype}||${a.sequence_id}`;
  const baseOf = (oriented) => oriented.slice(0, -1); // "85853+" -> "85853"
  const orientOf = (oriented) => oriented.slice(-1);  // "+" or "-"
  const nameOf = (base, orient) => `${base}${orient}`;

  const ensure = (map, key, init) => {
    if (!map.has(key)) map.set(key, init());
    return map.get(key);
  };

  // 1) Per-base memberships: which assembly triples appear on each base node
  const triplesByBase = new Map(); // base -> Set<tripleKey>
  for (const [plusName, info] of Object.entries(node)) {
    const base = baseOf(plusName);
    const set = ensure(triplesByBase, base, () => new Set());
    for (const a of info.assembly) set.add(tripleKey(a));
  }

  // 2) Global oriented adjacency (only edges actually present in the file)
  const out = new Map();  // oriented -> Array<oriented>
  const inn = new Map();  // oriented -> Array<oriented>
  const orientedUniverse = new Set();
  for (const { starting_node: u, ending_node: v } of edge) {
    orientedUniverse.add(u); orientedUniverse.add(v);
    ensure(out, u, () => []).push(v);
    ensure(inn, v, () => []).push(u);
    // make sure keys exist even if no edges later
    ensure(out, v, () => []);
    ensure(inn, u, () => []);
  }

  // 3) Collect all triples present anywhere
  const allTriples = new Set();
  for (const s of triplesByBase.values()) for (const t of s) allTriples.add(t);

  // 4) Topological order on the oriented Universe (used for consistent tie-breaking)
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
    // If not all covered, append remaining in stable iteration order
    if (order.length !== nodesSet.size) {
      for (const u of nodesSet) if (!order.includes(u)) order.push(u);
    }
    const rank = new Map(order.map((u, i) => [u, i]));
    return { order, rank };
  }
  const globalTopo = topoOrder(orientedUniverse, out, inn);

  // 5) For each triple, build filtered graph and extract one or more linear walks
  const walksByTriple = new Map();

  for (const triple of allTriples) {
    // Allowed bases for this triple
    const allowedBases = new Set(
      [...triplesByBase.entries()]
        .filter(([, set]) => set.has(triple))
        .map(([base]) => base)
    );

    // Filtered oriented nodes = those oriented names whose base is allowed
    const fNodes = new Set([...orientedUniverse].filter(n => allowedBases.has(baseOf(n))));

    // Filtered adjacency
    const fOut = new Map();
    const fIn  = new Map();
    for (const u of fNodes) { fOut.set(u, []); fIn.set(u, []); }
    for (const u of fNodes) {
      for (const v of out.get(u) || []) {
        if (fNodes.has(v)) {
          fOut.get(u).push(v);
          fIn.get(v).push(u);
        }
      }
    }

    // We may have multiple disjoint chains for a triple; extract all
    const remaining = new Set(fNodes);
    const { rank } = topoOrder(fNodes, fOut, fIn);
    const walks = [];

    function nextStart() {
      // Prefer nodes with indegree 0; tie-break by topo rank
      let candidates = [...remaining].filter(u => (fIn.get(u) || []).filter(p => remaining.has(p)).length === 0);
      if (candidates.length === 0) candidates = [...remaining]; // fallback
      return candidates.sort((a, b) => (rank.get(a) ?? 1e9) - (rank.get(b) ?? 1e9))[0];
    }

    while (remaining.size) {
      let u = nextStart();
      const walk = [];

      // Greedy forward walk:
      while (u && remaining.has(u)) {
        walk.push({ name: u, id: baseOf(u), orient: orientOf(u) });
        remaining.delete(u);

        const outs = (fOut.get(u) || []).filter(v => remaining.has(v));
        if (outs.length === 0) break;

        // Prefer the neighbor that is NOT a "skip edge" (i.e., neighbor with indegree==1 in the filtered graph),
        // tie-break by nearest in topological order.
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

export { buildAssemblyWalks }
