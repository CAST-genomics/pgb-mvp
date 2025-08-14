// -----------------------------
// Sign helpers
// -----------------------------
function parseSignedId(id) {
  const m = String(id).match(/^(.+?)([+-])$/);
  if (!m) throw new Error(`Node id "${id}" must end with + or -`);
  return { bareId: m[1], sign: m[2] }; // sign is "+" or "-"
}

// Your diagrams say:
// - starting_node: if its sign == node's sign  -> leave from END, else START
// - ending_node:   if its sign == node's sign  -> arrive to END, else START
function portForStartingNode(startingNode, nodeId) {
  return parseSignedId(startingNode).sign === parseSignedId(nodeId).sign ? "END" : "START";
}
function portForEndingNode(endingNode, nodeId) {
  return parseSignedId(endingNode).sign === parseSignedId(nodeId).sign ? "END" : "START";
}

/**
 * Build a bidirected, sign-aware graph from your JSON.
 * - No DAG assumptions (cycles, parallel edges, self-loops allowed)
 * - Keeps both node list and adjacency
 * - Warns (does not crash) on minor data surprises
 *
 * @param {object} json  The parsed JSON (your cici-*.json format)
 * @returns {{
 *   nodes: Map<string, { id:string, sign:string, bareId:string, lengthBp:number, assemblies?:string[], ogdf?:object, seqLen?:number }>,
 *   edges: Array<{ id:number, from:string, to:string, fromPort:"START"|"END", toPort:"START"|"END" }>,
 *   adj:   Map<string, Array<{ edge:any, other:string, selfPort:"START"|"END", otherPort:"START"|"END" }>>,
 *   problems: object
 * }}
 */
function buildBidirectedGraphFromCiciJson(json) {
  if (!json || typeof json !== "object") throw new Error("Bad JSON");

  const problems = {
    lengthMismatches: [],
    missingEdgeEndpoints: 0
  };

  // ---------- Nodes ----------
  const nodes = new Map();
  const nodeObj = json.node || {};
  const seqObj  = json.sequence || {};

  for (const id in nodeObj) {
    const n = nodeObj[id];
    const { bareId, sign } = parseSignedId(id);

    // assemblies: array of { assembly_name, haplotype, sequence_id }
    const assemblies = Array.isArray(n.assembly)
      ? n.assembly.map(a => a && a.assembly_name).filter(Boolean)
      : undefined;

    // ogdf_coordinates (not used for topology, but keep for reference)
    let ogdf;
    if (Array.isArray(n.ogdf_coordinates) && n.ogdf_coordinates.length) {
      ogdf = {
        start: n.ogdf_coordinates[0]
          ? { x: +n.ogdf_coordinates[0].x, y: +n.ogdf_coordinates[0].y }
          : undefined,
        end: n.ogdf_coordinates[1]
          ? { x: +n.ogdf_coordinates[1].x, y: +n.ogdf_coordinates[1].y }
          : undefined
      };
    }

    // Prefer explicit length; fall back to sequence length if present
    const seqLen = typeof seqObj[id] === "string" ? seqObj[id].length : undefined;
    let lengthBp = Number.isFinite(n.length) ? Number(n.length)
                  : Number.isFinite(seqLen) ? seqLen
                  : 0;

    if (seqLen !== undefined && Number(seqLen) !== Number(lengthBp)) {
      problems.lengthMismatches.push({ id, length: Number(lengthBp), seqLen: Number(seqLen) });
      console.warn(`Length mismatch for ${id}: length=${lengthBp} seqLen=${seqLen}`);
    }

    nodes.set(id, { id, sign, bareId, lengthBp: Number(lengthBp), assemblies, ogdf, seqLen });
  }

  // ---------- Edges ----------
  const edges = [];
  const rawEdges = Array.isArray(json.edge) ? json.edge : [];

  rawEdges.forEach((e, i) => {
    const from = e.starting_node;
    const to   = e.ending_node;

    if (!nodes.has(from) || !nodes.has(to)) {
      problems.missingEdgeEndpoints++;
      console.warn(`Skipping edge[${i}] due to missing endpoint(s): ${from} or ${to}`);
      return;
    }

    edges.push({
      id: i,
      from,
      to,
      fromPort: portForStartingNode(from, from),
      toPort:   portForEndingNode(to, to)
    });
  });

  // ---------- Adjacency (node-centric; undirected view for traversal convenience) ----------
  const adj = new Map();
  for (const id of nodes.keys()) adj.set(id, []);
  for (const e of edges) {
    adj.get(e.from).push({ edge: e, other: e.to,   selfPort: e.fromPort, otherPort: e.toPort });
    adj.get(e.to).push(  { edge: e, other: e.from, selfPort: e.toPort,   otherPort: e.fromPort });
  }

  return { nodes, edges, adj, problems };
}
