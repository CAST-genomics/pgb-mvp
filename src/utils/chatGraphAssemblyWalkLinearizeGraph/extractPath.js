import {chooseEndpoints, degreeMap} from "./assemblyWalkUtils.js"

function extractPathEndpointWalk(indAdj, comp) {
  if (!comp.length) return [];
  const deg = degreeMap(indAdj);
  const [start] = chooseEndpoints(indAdj, comp);
  const walk = [];
  const vis = new Set();
  let prev = null, cur = start;

  while (cur && !vis.has(cur)) {
    walk.push(cur); vis.add(cur);
    const cand = (indAdj.get(cur)||[]).filter(n => n !== prev && !vis.has(n));
    if (cand.length === 0) break;
    if (cand.length === 1) { prev = cur; cur = cand[0]; continue; }
    // chord-avoid heuristic: pick neighbor with smaller degree; tie-break numeric id
    cand.sort((a,b) => (deg.get(a)||0) - (deg.get(b)||0) || (num(a)-num(b)));
    prev = cur; cur = cand[0];
  }
  return walk;
}

export { extractPathEndpointWalk }

