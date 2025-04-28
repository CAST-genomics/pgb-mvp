# All Simple Paths Finder

This module provides a function `findAllPaths` to enumerate all simple paths in a directed graph from a specified start node to an end node.

## API

### `findAllPaths(graph, start, end)`

- **Parameters:**
  - `graph` (*Object*): adjacency list mapping node keys to an array of neighbor keys.
  - `start` (*string*): the key of the start node.
  - `end` (*string*): the key of the end node.
- **Returns:** `string[][]` — an array of paths; each path is an array of node keys representing a simple path from `start` to `end`.

## Implementation

```js
function findAllPaths(graph, start, end) {
  const allPaths = [];
  const currentPath = [];

  function dfs(node) {
    currentPath.push(node);

    if (node === end) {
      allPaths.push([...currentPath]);
    } else {
      const neighbors = graph[node] || [];
      for (const nbr of neighbors) {
        if (!currentPath.includes(nbr)) {
          dfs(nbr);
        }
      }
    }

    currentPath.pop();
  }

  dfs(start);
  return allPaths;
}

module.exports = findAllPaths;
```

## Example

```js
const findAllPaths = require('./findAllPaths');

const graph = {
  A: ['B','C'],
  B: ['C','D'],
  C: ['D'],
  D: []
};

const paths = findAllPaths(graph, 'A', 'D');
console.log(paths);
// [
//   ['A','B','C','D'],
//   ['A','B','D'],
//   ['A','C','D']
// ]
```

## How It Works

1. We perform a **depth-first search** starting at `start`.
2. Maintain `currentPath` to track the nodes visited so far.
3. Upon reaching `end`, we clone and store `currentPath`.
4. We avoid revisiting nodes already in `currentPath` to prevent cycles.
5. Backtracking ensures we explore every branch.

## Performance Notes

- The number of simple paths can be exponential in graph size.
- Consider adding heuristics or depth limits for large or dense graphs.

