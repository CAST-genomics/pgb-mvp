
/*
// How to use it in your tooltip

// after you compute features:
svc.setActiveSpine(features.spine);

// 1) If you only want true spine coords (and nothing for off-spine):
const ext = svc.getBpExtent(nodeId);

// 2) Or, allow projected coords when not on spine:
const ext2 = svc.getAnyBpExtent(nodeId, features);

if (ext2) {
  tooltip.show({
    node: nodeId,
    bpStart: Math.round(ext2.bpStart),
    bpEnd: Math.round(ext2.bpEnd),
    note: ext2.projected ? "projected to spine span" : "on spine"
  });
} else {
  tooltip.show({ node: nodeId, bpStart: "—", bpEnd: "—" });
}

 */


// 1) Node-local (always defined if length known)
getNodeLocalExtent(nodeId) {
  const n = this.graph?.nodes.get(nodeId);
  if (!n) return null;
  return { start: 0, end: n.lengthBp || 0, system: "node-local" };
}

// 2) On a particular walk (true coords if node appears in that walk)
indexWalkBpExtents(walk) {
  const map = new Map();
  let acc = 0;
  const nodes = walk?.paths?.[0]?.nodes || [];
  for (const id of nodes) {
    const len = this.graph.nodes.get(id)?.lengthBp || 0;
    map.set(id, { bpStart: acc, bpEnd: acc + len });
    acc += len;
  }
  return map;
}

getBpExtentOnWalk(nodeId, walk, precomputedMap = null) {
  const m = precomputedMap || this.indexWalkBpExtents(walk);
  const hit = m.get(nodeId);
  return hit ? { ...hit, system: "walk" } : null;
}

// 3) Projected within a specific event (for rendering in linear view)
// event: one item from features.events
// Returns { bpStart, bpEnd, onSpine?, projected:true } or null if node not present.
getProjectedBpInEvent(nodeId, event) {
  if (!event || !Array.isArray(event.paths)) return null;

  // anchors map (in case hover is exactly the left/right anchor)
  if (nodeId === event.anchors.leftId) {
    return { bpStart: event.anchors.spanStart, bpEnd: event.anchors.spanStart, onSpine: true, projected: false };
  }
  if (event.anchors.rightId && nodeId === event.anchors.rightId) {
    return { bpStart: event.anchors.spanEnd, bpEnd: event.anchors.spanEnd, onSpine: true, projected: false };
  }

  for (const p of event.paths) {
    if (!Array.isArray(p.nodesDetailed)) continue;
    for (const d of p.nodesDetailed) {
      if (d.id === nodeId) {
        return {
          bpStart: d.refBpStart, bpEnd: d.refBpEnd,
          onSpine: !!d.isSpine, projected: !d.isSpine
        };
      }
    }
  }
  return null;
}

// features is the full output of assessGraphFeatures
getAnyBpExtent(nodeId, features) {
  const onSpine = this.getBpExtent(nodeId);
  if (onSpine) return onSpine;

  if (features && Array.isArray(features.events)) {
    for (const ev of features.events) {
      const hit = this.getProjectedBpInEvent(nodeId, ev);
      if (hit) return hit;
    }
  }
  return null;
}
