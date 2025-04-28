#!/usr/bin/env node
// buildAdjacencyEnds.cjs – builds adjacency list keyed by node-end (start/end)
// Rule recap:
//   Starting node  '+' → connects from the END of that node line
//   Starting node  '-' → connects from the START of that node line
//   Ending   node  '+' → connects to   the START of that node line
//   Ending   node  '-' → connects to   the END   of that node line

const fs = require('fs');
const path = require('path');

const CICI_PATH = path.join(__dirname, '..', 'public', 'cici.json');

function nodeEndLabel(nodeId, role /* 'start' or 'end' side of edge? */) {
  // nodeId includes trailing + or -
  const sign = nodeId.slice(-1);
  if (role === 'from') {
    return sign === '+' ? 'end' : 'start';
  } else if (role === 'to') {
    // role === 'to' means ending_node semantics
    return sign === '+' ? 'start' : 'end';
  }
  throw new Error('Invalid role');
}

function buildAdjacency(json) {
  const adj = Object.create(null);
  for (const { starting_node, ending_node } of json.edge) {
    const fromEndpoint = nodeEndLabel(starting_node, 'from');
    const toEndpoint = nodeEndLabel(ending_node, 'to');

    const fromKey = `${starting_node}_${fromEndpoint}`; // e.g., 2912+_end
    const toKey = `${ending_node}_${toEndpoint}`;       // e.g., 2913+_start

    if (!adj[fromKey]) adj[fromKey] = new Set();
    adj[fromKey].add(toKey);
  }

  // Convert sets to arrays
  for (const k of Object.keys(adj)) adj[k] = [...adj[k]].sort();
  return adj;
}

const raw = fs.readFileSync(CICI_PATH, 'utf8');
const json = JSON.parse(raw);
const adj = buildAdjacency(json);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(adj, null, 2));
} else {
  console.log('const graph = ' + JSON.stringify(adj, null, 2) + ';');
}
