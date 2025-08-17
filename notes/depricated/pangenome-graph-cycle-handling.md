# Pangenome Graph Cycle Handling and Path Analysis

## Overview

This document details the implementation of cycle handling in the `PangenomeGraph` class and its crucial role in supporting path visualization and assembly analysis for pangenome data. Cycles in pangenome graphs represent important biological phenomena and create path diversity that reflects population differences.

## Biological Significance of Cycles

### What Cycles Represent

Cycles in pangenome graphs represent:

1. **Structural Variations**: Where sequences can be traversed in multiple ways
2. **Repeated Regions**: That create circular paths through the genome
3. **Complex Genomic Rearrangements**: That form loops and alternative paths
4. **Alternative Splicing Patterns**: That create circular dependencies
5. **Population-Specific Variations**: Where different human populations have different genomic structures

### Visual Evidence

From the provided pangenome graph visualizations:
- **cici.png**: Shows a large graph with at least one prominent cycle in the lower-central area
- **cici-cycle.png**: Provides a detailed view of the cyclic structure
- These cycles are not artifacts but represent real biological variation

## Implementation Details

### 1. Cycle Detection Algorithm

The `detectCycles()` method uses a **DFS with recursion stack** approach:

```javascript
detectCycles() {
    const cycles = [];
    const visited = new Set();
    const recursionStack = new Set(); // Key for cycle detection
    
    const dfs = (node, path) => {
        if (recursionStack.has(node)) {
            // Found a cycle - node is in current recursion stack
            const cycleStart = path.indexOf(node);
            const cycle = path.slice(cycleStart);
            cycles.push([...cycle, node]);
            return;
        }
        
        if (visited.has(node)) return;
        
        visited.add(node);
        recursionStack.add(node);  // Add to recursion stack
        path.push(node);
        
        // Explore neighbors
        for (const neighbor of this.getNeighbors(node)) {
            dfs(neighbor, path);
        }
        
        recursionStack.delete(node); // Remove from recursion stack
        path.pop();
    };
}
```

**Key Insight**: The `recursionStack` tracks nodes in the current DFS path. If we encounter a node that's already in the recursion stack, we've found a cycle.

### 2. Path Finding with Cycle Protection

The `findAllPaths()` method includes cycle protection:

```javascript
findAllPaths(startNode, endNode, maxPaths = 10, maxPathLength = 50) {
    const dfs = (current, target, path) => {
        if (paths.length >= maxPaths) return;
        if (path.length >= maxPathLength) return; // Prevent infinite loops
        
        visited.add(current);
        path.push(current);
        
        if (current === target) {
            paths.push([...path]);
        } else {
            for (const neighbor of this.getNeighbors(current)) {
                if (!visited.has(neighbor)) {
                    dfs(neighbor, target, path);
                }
            }
        }
        
        visited.delete(current);
        path.pop();
    };
}
```

**Key Features**:
- `maxPathLength` parameter prevents infinite loops in cyclic graphs
- `visited` set prevents revisiting nodes in the same path
- Path backtracking allows finding multiple distinct paths

### 3. Strongly Connected Components (SCCs)

The `findStronglyConnectedComponents()` method uses Kosaraju's algorithm:

```javascript
findStronglyConnectedComponents() {
    // First DFS to fill stack
    const dfs1 = (node) => {
        visited.add(node);
        const neighbors = this.getNeighbors(node);
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                dfs1(neighbor);
            }
        }
        stack.push(node);
    };
    
    // Create transpose graph and second DFS
    // ... implementation details
}
```

SCCs help identify groups of nodes that are mutually reachable, which is crucial for understanding cycle structure.

## Path Analysis for Visualization

### 1. Comprehensive Path Analysis

The `analyzeAllPaths()` method provides complete path information:

```javascript
analyzeAllPaths(maxPaths = 50, maxPathLength = 100) {
    const allPaths = [];
    const nodeFrequency = new Map(); // node -> frequency across paths
    
    // Find paths between all source-sink pairs
    for (const source of sourceNodes) {
        for (const sink of sinkNodes) {
            const paths = this.findAllPaths(source, sink, maxPaths, maxPathLength);
            allPaths.push(...paths);
        }
    }
    
    // Analyze each path
    for (const path of allPaths) {
        for (const node of path) {
            nodeFrequency.set(node, (nodeFrequency.get(node) || 0) + 1);
        }
    }
    
    return {
        paths: allPaths,
        pathCount: allPaths.length,
        nodeFrequency: Object.fromEntries(nodeFrequency),
        pathStatistics: { /* ... */ }
    };
}
```

### 2. Detailed Path Information

The `getPathDetails()` method provides comprehensive path analysis:

```javascript
getPathDetails(path) {
    const pathInfo = {
        nodes: path,
        length: path.length,
        edges: [],
        nodeSigns: [],
        edgeInterpretations: []
    };
    
    // Get node signs and edge information
    for (let i = 0; i < path.length; i++) {
        const node = path[i];
        const nodeSign = this.getNodeSign(node);
        pathInfo.nodeSigns.push({ node, sign: nodeSign });
        
        // Get edge to next node
        if (i < path.length - 1) {
            const nextNode = path[i + 1];
            const edge = this.getEdge(node, nextNode);
            if (edge) {
                pathInfo.edges.push(edge);
                const interpretation = this.interpretEdgeSigns(edge.id);
                if (interpretation) {
                    pathInfo.edgeInterpretations.push(interpretation);
                }
            }
        }
    }
    
    return pathInfo;
}
```

### 3. Assembly Distribution Analysis

The `getAssemblyDistribution()` method analyzes assembly patterns:

```javascript
getAssemblyDistribution(getAssemblyForNode) {
    const pathAnalysis = this.analyzeAllPaths(100, 100);
    const assemblyPaths = new Map(); // assembly -> array of paths
    const assemblyFrequency = new Map(); // assembly -> frequency count
    
    for (const path of pathAnalysis.paths) {
        const pathAssemblies = new Set();
        
        // Get assemblies for each node in the path
        for (const node of path) {
            const assembly = getAssemblyForNode(node);
            if (assembly) {
                pathAssemblies.add(assembly);
                assemblyFrequency.set(assembly, (assemblyFrequency.get(assembly) || 0) + 1);
            }
        }
        
        // Record which assemblies appear in this path
        for (const assembly of pathAssemblies) {
            if (!assemblyPaths.has(assembly)) {
                assemblyPaths.set(assembly, []);
            }
            assemblyPaths.get(assembly).push(path);
        }
    }
    
    return {
        assemblyFrequency: Object.fromEntries(assemblyFrequency),
        assemblyPaths: Object.fromEntries(assemblyPaths),
        totalPaths: pathAnalysis.pathCount,
        uniqueAssemblies: assemblyFrequency.size
    };
}
```

## Implications for Visualization Feature

### 1. Path Representation of Assembly Collections

Each path through the graph represents a **unique combination of genomic sequences**:

```
Path 1: 22223+ → 22224+ → 22225+ → 22226+ → 22227+
Path 2: 22223+ → 690719+ → 22225+ → 531230+ → 22227+
Path 3: 22223+ → 22224+ → 535184+ → 22225+ → 22226+ → 22227+
```

Each path corresponds to:
- **Specific assembly combinations** (GRCh38, HG02027.1, HG03239.1, etc.)
- **Unique sequence concatenations**
- **Population-specific genomic variations**

### 2. Cycle Impact on Path Diversity

Cycles create **multiple possible paths** through the same genomic region:

```
Example with cycle:
A → B → C → D
     ↓   ↑
     E → F

Possible paths from A to D:
1. A → B → C → D (direct path)
2. A → B → E → F → C → D (path through cycle)
3. A → B → E → F → C → B → C → D (multiple cycle traversals)
```

This represents **structural variations** where:
- Some populations have the direct path (A→B→C→D)
- Others have the alternative path through the cycle (A→B→E→F→C→D)
- Some might have repeated regions (multiple cycle traversals)

### 3. Visual Path Comparison

For the visualization feature, users can:

- **Highlight common nodes** (shared DNA across populations)
- **Show unique nodes** (population-specific variations)
- **Display cycle regions** (structural variations)
- **Compare assembly distributions** across paths

### 4. Integration with Existing Services

The `PangenomeGraph` works with the existing architecture:

```javascript
// In your app.js or visualization component
const graph = new PangenomeGraph();
graph.buildFromJSON(jsonData);

// Get all paths for visualization
const pathAnalysis = graph.analyzeAllPaths(100, 100);

// For each path, get assembly information
pathAnalysis.paths.forEach(path => {
    const pathDetails = graph.getPathDetails(path);
    const assemblies = path.map(node => genomicService.getAssemblyForNodeName(node));
    
    // Visualize this path with assembly colors
    visualizePath(pathDetails, assemblies);
});
```

## Key Methods for Visualization

### Core Analysis Methods

1. **`analyzeAllPaths()`**: Finds all possible paths through the graph
2. **`getPathDetails()`**: Provides detailed information for each path
3. **`findPathsContainingNodes()`**: Finds paths containing specific assemblies
4. **`getAssemblyDistribution()`**: Analyzes assembly frequency across paths
5. **`analyzeCycleImpact()`**: Analyzes how cycles affect path options

### Cycle-Specific Methods

1. **`detectCycles()`**: Finds all cycles in the graph
2. **`hasCycles()`**: Quick check if the graph contains cycles
3. **`findStronglyConnectedComponents()`**: Identifies SCCs using Kosaraju's algorithm

### Path Analysis Methods

1. **`findAllPaths()`**: Finds all paths between two nodes with cycle protection
2. **`findShortestPath()`**: Finds the shortest path (BFS, works in cyclic graphs)
3. **`getReachableNodes()`**: Gets all nodes reachable from a starting point
4. **`getNodesReaching()`**: Gets all nodes that can reach a target

## Statistics and Metrics

The enhanced `getStatistics()` method provides comprehensive metrics:

```javascript
{
    nodeCount: 8,
    edgeCount: 10,
    sourceNodes: 1,
    sinkNodes: 1,
    averageOutDegree: 1.25,
    averageInDegree: 1.25,
    hasCycles: true,
    cycleCount: 2,
    stronglyConnectedComponents: 3,
    isDAG: false
}
```

## Biological Interpretation

### Path Diversity and Population Differences

Each path represents:
- **Specific assembly combinations** (GRCh38, HG02027.1, etc.)
- **Population-specific genomic variations**
- **Structural variations** (cycles)
- **Shared vs. unique DNA sequences**

### Cycle Significance

Cycles indicate:
- **Structural polymorphisms** in the population
- **Alternative genomic arrangements**
- **Repeated or duplicated regions**
- **Complex evolutionary events**

## Computational Considerations

### Performance Optimizations

1. **Path Length Limits**: Prevent infinite loops in cyclic graphs
2. **Max Path Limits**: Control computational complexity
3. **Efficient Cycle Detection**: DFS with recursion stack
4. **Memory Management**: Clear data structures after analysis

### Scalability

- **Small graphs** (< 100 nodes): Full path analysis feasible
- **Medium graphs** (100-1000 nodes): Limited path analysis with constraints
- **Large graphs** (> 1000 nodes): Focused analysis on specific regions

## Future Enhancements

### Potential Improvements

1. **Weighted Edges**: Add support for edge weights based on sequence similarity
2. **Subgraph Extraction**: Extract subgraphs based on criteria
3. **Path Statistics**: Calculate path length distributions, coverage statistics
4. **Assembly Comparison**: Compare paths between different assemblies
5. **Caching**: Cache frequently accessed paths or subgraphs
6. **Visualization Integration**: Integrate graph analysis results with the 3D visualization

### Advanced Analysis

1. **Path Clustering**: Group similar paths together
2. **Assembly Correlation**: Analyze which assemblies tend to appear together
3. **Cycle Classification**: Categorize different types of cycles
4. **Evolutionary Analysis**: Track path changes across different populations

## Conclusion

The cycle-aware path analysis implementation in `PangenomeGraph` provides a robust foundation for understanding and visualizing the complex structure of pangenome data. By properly handling cycles and providing comprehensive path analysis, it enables users to:

- **See all possible genomic paths** through a region
- **Understand population differences** through path diversity
- **Identify shared vs. unique sequences** across human populations
- **Visualize structural variations** represented by cycles

This implementation handles the computational complexity of cyclic graphs while providing the detailed path information needed for meaningful biological visualization and analysis. 