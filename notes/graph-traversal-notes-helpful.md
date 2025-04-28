Here’s a drop-in, recursive DFS implementation in plain JavaScript that will enumerate **all simple paths** from a given `start` node to `end` in a directed adjacency-list graph:

```js
/**
 * Find all simple paths from `start` to `end` in a directed graph.
 *
 * @param {Object.<string, string[]>} graph
 *   An adjacency list, e.g.
 *     {
 *       A: ['B','C'],
 *       B: ['C','D'],
 *       C: ['D'],
 *       D: []
 *     }
 * @param {string} start  The key of the start node
 * @param {string} end    The key of the end node
 * @returns {string[][]}  An array of paths (each a list of node-keys)
 */
function findAllPaths(graph, start, end) {
  const allPaths = [];
  const currentPath = [];

  function dfs(node) {
    currentPath.push(node);

    if (node === end) {
      // record a copy of the current path
      allPaths.push([...currentPath]);
    } else {
      const neighbors = graph[node] || [];
      for (const nbr of neighbors) {
        // only visit each node once per path (no cycles)
        if (!currentPath.includes(nbr)) {
          dfs(nbr);
        }
      }
    }

    // backtrack
    currentPath.pop();
  }

  dfs(start);
  return allPaths;
}

// ——— Example usage ———
const graph = {
  A: ['B','C'],
  B: ['C','D'],
  C: ['D'],
  D: []
};

console.log(findAllPaths(graph, 'A', 'D'));
// → [ [ 'A','B','C','D' ],
//     [ 'A','B','D' ],
//     [ 'A','C','D' ] ]
```

**How it works:**

1. **`dfs(node)`**  
   - Pushes `node` onto `currentPath`.  
   - If `node === end`, clones `currentPath` into `allPaths`.  
   - Otherwise, iterates each neighbor not already in `currentPath` (to prevent revisiting and infinite loops) and recurses.  
   - **Backtracks** by popping `node` off `currentPath` before returning.

2. **Result**  
   - `findAllPaths(...)` returns an array of all unique simple paths from `start` to `end`.  

> ⚠️ Keep in mind that in dense graphs or graphs with many routes, the number of simple paths can grow exponentially. If you need to prune or limit path length, you can add extra checks before recursing.
