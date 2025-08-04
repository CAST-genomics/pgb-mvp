# Pangenome Graph Traversal

This document describes the `PangenomeGraph` class, which provides a minimal graph representation focused on topology and traversal for pangenome data.

## Overview

The pangenome data is stored as separate nodes and edges in JSON format, but for analysis purposes, we need a proper graph structure that supports traversal. The `PangenomeGraph` class builds an adjacency list representation focused solely on graph topology and path-finding algorithms. All other concerns (assembly, sequence, geometry) are handled by other services in the codebase.

## Data Structure

### Input JSON Format
```json
{
  "locus": "chr2:879500-880000",
  "node": {
    "22223+": {
      "name": "22223+",
      "length": 7,
      "assembly": "GRCh38",
      "range": "chr2:879,305-879,311",
      "ogdf_coordinates": [{"x": 869.0, "y": 60.0}, {"x": 757.0, "y": 98.0}]
    }
  },
  "edge": [
    {"starting_node": "22223+", "ending_node": "22224+"}
  ],
  "sequence": {
    "22223+": "GTTTGTT"
  }
}
```

### Graph Representation
The `PangenomeGraph` class creates:
- **Nodes Set**: Set of signed node names (e.g., "1234+", "5678-")
- **Edges Map**: `edgeId -> {from, to, fromSign, toSign, startingNode, endingNode}`
- **Adjacency List**: `signedNodeName -> Set of neighboring signed node names`
- **Reverse Adjacency List**: `signedNodeName -> Set of predecessor signed node names`

### Edge Sign Interpretation
The graph implements edge sign interpretation rules for geometry creation:
- **starting_node**: opposite sign → START of node (parameter 0), same sign → END of node (parameter 1)
- **ending_node**: opposite sign → END of node (parameter 1), same sign → START of node (parameter 0)

This determines the spline parameters used for edge geometry creation in `GeometryFactory`.

## Usage

### Basic Setup
```javascript
import PangenomeGraph from './src/pangenomeGraph.js';

// Create graph instance
const graph = new PangenomeGraph();

// Load data from JSON
const response = await fetch('/path/to/pangenome.json');
const jsonData = await response.json();
graph.buildFromJSON(jsonData);
```

### Basic Operations

#### Get Graph Information
```javascript
// Get all node names
const nodes = graph.getNodes(); // Returns Set of node names

// Get all edges
const edges = graph.getEdges();

// Get graph statistics
const stats = graph.getStatistics();
console.log(`Nodes: ${stats.nodeCount}, Edges: ${stats.edgeCount}`);

// Check if node exists
const hasNode = graph.hasNode('22223+');
```

#### Node Operations
```javascript
// Get neighbors (outgoing edges)
const neighbors = graph.getNeighbors('22223+');

// Get predecessors (incoming edges)
const predecessors = graph.getPredecessors('22224+');

// Check if edge exists
const hasEdge = graph.hasEdge('22223+', '22224+');

// Get edge data
const edgeData = graph.getEdge('22223+', '22224+');
```



### Graph Traversal

#### Find Shortest Path
```javascript
const shortestPath = graph.findShortestPath('22223+', '22227+');
if (shortestPath) {
            console.log('Shortest path:', shortestPath.join(' -> '));
        console.log('Path length:', shortestPath.length, 'nodes');
    }
```

#### Find All Paths
```javascript
const allPaths = graph.findAllPaths('22223+', '22227+', 10);
console.log(`Found ${allPaths.length} paths`);
allPaths.forEach((path, index) => {
    console.log(`Path ${index + 1}:`, path.join(' -> '));
});
```

#### Topological Sort (for DAGs)
```javascript
try {
    const topoSort = graph.topologicalSort();
    console.log('Topologically sorted:', topoSort);
} catch (error) {
    console.log('Graph contains cycles');
}
```

### Analysis Functions

#### Find Source and Sink Nodes
```javascript
const sourceNodes = graph.getSourceNodes(); // No incoming edges
const sinkNodes = graph.getSinkNodes();     // No outgoing edges
```

#### Reachability Analysis
```javascript
// Get all nodes reachable from a starting node
const reachable = graph.getReachableNodes('22223+');

// Get all nodes that can reach a target node
const reaching = graph.getNodesReaching('22227+');

console.log(`Reachable from 22223+: ${Array.from(reachable).join(', ')}`);
console.log(`Can reach 22227+: ${Array.from(reaching).join(', ')}`);
```

## Example Analysis Scenarios

### 1. Find All Paths Through Specific Nodes
```javascript
function findPathsThroughNodes(graph, targetNodes) {
    const sourceNodes = graph.getSourceNodes();
    const sinkNodes = graph.getSinkNodes();
    
    for (const source of sourceNodes) {
        for (const sink of sinkNodes) {
            const allPaths = graph.findAllPaths(source, sink, 5);
            for (const path of allPaths) {
                if (path.some(node => targetNodes.includes(node))) {
                    console.log(`Path through target nodes:`, path);
                }
            }
        }
    }
}
```

### 2. Connectivity Pattern Analysis
```javascript
function analyzeConnectivityPatterns(graph) {
    // Find nodes with high connectivity
    const highConnectivityNodes = [];
    for (const nodeName of graph.getNodes()) {
        const outDegree = graph.getNeighbors(nodeName).size;
        const inDegree = graph.getPredecessors(nodeName).size;
        const totalDegree = outDegree + inDegree;
        
        if (totalDegree > 2) {
            highConnectivityNodes.push({
                node: nodeName,
                outDegree,
                inDegree,
                totalDegree
            });
        }
    }
    
    console.log('High connectivity nodes:', highConnectivityNodes);
}
```

### 3. Graph Structure Analysis
```javascript
function analyzeGraphStructure(graph) {
    const stats = graph.getStatistics();
    const sourceNodes = graph.getSourceNodes();
    const sinkNodes = graph.getSinkNodes();
    
    console.log(`Graph type: ${sourceNodes.length} sources, ${sinkNodes.length} sinks`);
    
    // Check for cycles
    try {
        graph.topologicalSort();
        console.log('This is a Directed Acyclic Graph (DAG)');
    } catch (error) {
        console.log('This graph contains cycles');
    }
}
```

## Performance Considerations

- **Memory Usage**: The graph stores all nodes, edges, and sequences in memory
- **Path Finding**: `findAllPaths` can be expensive for large graphs - use the `maxPaths` parameter to limit results
- **Topological Sort**: Only works for Directed Acyclic Graphs (DAGs)
- **Large Graphs**: For very large graphs, consider implementing lazy loading or streaming

## Integration with Existing Codebase

The `PangenomeGraph` class is designed to work alongside the existing visualization code:

```javascript
// In your existing app.js or similar
import PangenomeGraph from './src/pangenomeGraph.js';

class App {
    constructor() {
        this.graph = new PangenomeGraph();
    }
    
    async handleSearch(url) {
        const json = await loadPath(url);
        
        // Build graph for analysis
        this.graph.buildFromJSON(json);
        
        // Continue with existing visualization logic
        this.genomicService.createMetadata(json.node, json.sequence, ...);
        // ... rest of existing code
    }
}
```

## Testing

Use the provided test page `graph-test.html` to experiment with the graph functionality:

1. Open `graph-test.html` in a web browser
2. Click "Run Basic Analysis" to load and analyze the graph
3. Use "Run Path Analysis" to find paths between nodes
4. Use "Run Assembly Analysis" to analyze assembly-specific data

## Future Enhancements

Potential improvements to consider:
- **Weighted Edges**: Add support for edge weights (e.g., based on sequence similarity)
- **Subgraph Extraction**: Extract subgraphs based on criteria
- **Path Statistics**: Calculate path length distributions, coverage statistics
- **Assembly Comparison**: Compare paths between different assemblies
- **Caching**: Cache frequently accessed paths or subgraphs
- **Visualization Integration**: Integrate graph analysis results with the 3D visualization 
