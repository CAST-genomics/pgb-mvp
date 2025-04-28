#!/usr/bin/env node
// buildAdjacency.cjs – CommonJS version to avoid ESM "require" issues

const fs = require('fs');
const path = require('path');

const CICI_PATH = path.join(__dirname, '..', 'public', 'cici.json');

function buildAdjacency(json) {
  const adj = Object.create(null);
  for (const { starting_node, ending_node } of json.edge) {
    const start = starting_node.replace(/[+-]$/, '');
    const end = ending_node.replace(/[+-]$/, '');
    if (!adj[start]) adj[start] = new Set();
    adj[start].add(end);
  }
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
