/**
 * Convert the rich graph (with ports) into the shape
 * expected by linearizePangenome(): { nodes: Map<id,{lengthBp, neighbors:[]}> }
 */
function toLinearizerGraph(bigraph) {
  const out = new Map();
  for (const [id, n] of bigraph.nodes) {
    out.set(id, { lengthBp: n.lengthBp, neighbors: [] });
  }
  // de-duplicate neighbor ids per node
  const seen = new Map(); // id -> Set(other)
  for (const id of bigraph.nodes.keys()) seen.set(id, new Set());
  for (const [id, list] of bigraph.adj) {
    const s = seen.get(id);
    for (const item of list) s.add(item.other);
  }
  for (const [id, set] of seen) {
    out.get(id).neighbors = Array.from(set);
  }
  return { nodes: out };
}
