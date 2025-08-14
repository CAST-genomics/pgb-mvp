import {edgeKeyOf, parseSignedId, portForStartingNode, portForEndingNode, tripleKey} from "./assemblyWalkUtils.js"

function createGraph(json) {
  if (!json || typeof json !== "object") throw new Error("Bad JSON");

  const nodes = new Map();               // id -> nodeRec
  const edges = new Map();               // edgeKey(a,b) -> { a,b, variants:[...] }
  const adjSet = new Map();              // id -> Set(neighbor ids)
  const index = { byAssembly: new Map() };
  const seqObj = json.sequence || {};
  const nodeObj = json.node || {};
  const rawEdges = Array.isArray(json.edge) ? json.edge : [];

  // --- nodes (canonical ids are exactly the keys in json.node) ---
  for (const id in nodeObj) {
    const n = nodeObj[id];
    const { bare, sign } = parseSignedId(id);
    const assemblies = Array.isArray(n.assembly)
      ? n.assembly.map(a => a && a.assembly_name).filter(Boolean)
      : [];
    // also add full contig keys
    const contigKeys = Array.isArray(n.assembly)
      ? n.assembly.map(a => `${ tripleKey(a)}`).filter(k => !k.includes("undefined")) : [];

    const seqLen = typeof seqObj[id] === "string" ? seqObj[id].length : undefined;
    const lengthBp = Number.isFinite(n.length) ? Number(n.length)
                   : Number.isFinite(seqLen) ? seqLen
                   : 0;

    const nodeRec = {
      id, sign, bareId: bare, lengthBp,
      assemblies: [...assemblies, ...contigKeys],   // both forms available for queries
      // You can keep ogdf here if you want it; topology does not use it.
    };
    nodes.set(id, nodeRec);
    adjSet.set(id, new Set());

    // build assembly index
    for (const key of nodeRec.assemblies) {
      if (!index.byAssembly.has(key)) index.byAssembly.set(key, new Set());
      index.byAssembly.get(key).add(id);
    }
  }

  // --- edges (canonicalize both endpoints to your node ids) ---
  rawEdges.forEach((e, i) => {
    const from = e.starting_node;
    const to   = e.ending_node;
    if (!nodes.has(from) || !nodes.has(to)) {
      console.warn(`Skipping edge[${i}] due to missing endpoint(s): ${from} or ${to}`);
      return;
    }
    const ek = edgeKeyOf(from, to);                   // your key, keeps raw direction
    if (!edges.has(ek)) edges.set(ek, { a: from, b: to, variants: [] });
    edges.get(ek).variants.push({
      rawIndex: i,
      from, to,
      fromPort: portForStartingNode(from, from),
      toPort:   portForEndingNode(to, to)
    });
    // undirected adjacency for traversal
    adjSet.get(from).add(to);
    adjSet.get(to).add(from);
  });

  // freeze adjacency to arrays
  const adj = new Map();
  for (const [id, set] of adjSet) adj.set(id, Array.from(set));

  return { nodes, edges, adj, index };
}

export { createGraph }
