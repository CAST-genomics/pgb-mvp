import PangenomeGraph from '../../src/pangenomeGraph.js';

/**
 * Example usage of PangenomeGraph - focused on topology analysis
 */
async function demonstratePangenomeGraph() {
    // Load the pangenome data
    const response = await fetch('/public/version2/chr2-879500-880000.json');
    const jsonData = await response.json();

    // Create and build the graph
    const graph = new PangenomeGraph();
    graph.buildFromJSON(jsonData);

    console.log('=== Pangenome Graph Topology Analysis ===');

    // Get graph statistics
    const stats = graph.getStatistics();
    console.log('Graph Statistics:', stats);

    // Get source and sink nodes
    const sourceNodes = graph.getSourceNodes();
    const sinkNodes = graph.getSinkNodes();
    console.log('Source nodes (no incoming edges):', sourceNodes);
    console.log('Sink nodes (no outgoing edges):', sinkNodes);

    // Example: Find paths between nodes
    if (sourceNodes.length > 0 && sinkNodes.length > 0) {
        const startNode = sourceNodes[0];
        const endNode = sinkNodes[0];

        console.log(`\n=== Path Analysis from ${startNode} to ${endNode} ===`);

        // Find shortest path
        const shortestPath = graph.findShortestPath(startNode, endNode);
        console.log('Shortest path:', shortestPath);

        // Find all paths (limited to 5 for performance)
        const allPaths = graph.findAllPaths(startNode, endNode, 5);
        console.log(`Found ${allPaths.length} paths between ${startNode} and ${endNode}:`);
        allPaths.forEach((path, index) => {
            console.log(`  Path ${index + 1}:`, path);
        });
    }

    // Example: Analyze node connectivity
    console.log('\n=== Node Connectivity Analysis ===');
    for (const nodeName of graph.getNodes()) {
        const neighbors = graph.getNeighbors(nodeName);
        const predecessors = graph.getPredecessors(nodeName);

        console.log(`Node ${nodeName}:`);
        console.log(`  - Outgoing edges: ${neighbors.size}`);
        console.log(`  - Incoming edges: ${predecessors.size}`);

        if (neighbors.size > 0) {
            console.log(`  - Neighbors: ${Array.from(neighbors).join(', ')}`);
        }
    }

    // Example: Topological sort (if it's a DAG)
    try {
        const topoSort = graph.topologicalSort();
        console.log('\n=== Topological Sort ===');
        console.log('Topologically sorted nodes:', topoSort);
    } catch (error) {
        console.log('\n=== Topological Sort ===');
        console.log('Graph contains cycles, cannot perform topological sort');
    }

    return graph;
}

/**
 * Example: Find all paths through specific nodes
 */
function findPathsThroughNodes(graph, targetNodes) {
    console.log(`\n=== Paths through nodes: ${targetNodes.join(', ')} ===`);

    // Find paths that go through any of these nodes
    const sourceNodes = graph.getSourceNodes();
    const sinkNodes = graph.getSinkNodes();

    for (const source of sourceNodes) {
        for (const sink of sinkNodes) {
            const allPaths = graph.findAllPaths(source, sink, 3);

            for (const path of allPaths) {
                // Check if path contains any target node
                const containsTargetNode = path.some(node =>
                    targetNodes.includes(node)
                );

                if (containsTargetNode) {
                    console.log(`Path from ${source} to ${sink} through target nodes:`, path);
                }
            }
        }
    }
}

/**
 * Example: Analyze graph connectivity patterns
 */
function analyzeConnectivityPatterns(graph) {
    console.log('\n=== Connectivity Pattern Analysis ===');

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

    console.log('High connectivity nodes:');
    highConnectivityNodes
        .sort((a, b) => b.totalDegree - a.totalDegree)
        .forEach(node => {
            console.log(`  ${node.node}: out=${node.outDegree}, in=${node.inDegree}, total=${node.totalDegree}`);
        });

    // Find isolated paths (linear chains)
    const isolatedPaths = [];
    for (const nodeName of graph.getNodes()) {
        const outDegree = graph.getNeighbors(nodeName).size;
        const inDegree = graph.getPredecessors(nodeName).size;

        if (outDegree === 1 && inDegree === 1) {
            // This is part of a linear chain
            const path = [nodeName];
            let current = nodeName;

            // Follow the chain forward
            while (true) {
                const neighbors = graph.getNeighbors(current);
                if (neighbors.size !== 1) break;
                const next = Array.from(neighbors)[0];
                if (path.includes(next)) break; // Avoid cycles
                path.push(next);
                current = next;
            }

            if (path.length > 1) {
                isolatedPaths.push(path);
            }
        }
    }

    console.log('\nLinear chains found:');
    isolatedPaths.forEach((path, index) => {
        console.log(`  Chain ${index + 1}: ${path.join(' -> ')}`);
    });
}

/**
 * Example: Find all reachable nodes from a starting point
 */
function analyzeReachability(graph, startNode) {
    console.log(`\n=== Reachability Analysis from ${startNode} ===`);

    const reachable = graph.getReachableNodes(startNode);
    console.log(`Nodes reachable from ${startNode}: ${Array.from(reachable).join(', ')}`);
    console.log(`Total reachable nodes: ${reachable.size}`);

    // Find nodes that can reach the start node
    const reaching = graph.getNodesReaching(startNode);
    console.log(`Nodes that can reach ${startNode}: ${Array.from(reaching).join(', ')}`);
    console.log(`Total nodes reaching: ${reaching.size}`);
}

/**
 * Example: Analyze graph structure
 */
function analyzeGraphStructure(graph) {
    console.log('\n=== Graph Structure Analysis ===');

    const stats = graph.getStatistics();
    const sourceNodes = graph.getSourceNodes();
    const sinkNodes = graph.getSinkNodes();

    console.log(`Graph type analysis:`);
    console.log(`  - Total nodes: ${stats.nodeCount}`);
    console.log(`  - Total edges: ${stats.edgeCount}`);
    console.log(`  - Source nodes: ${sourceNodes.length}`);
    console.log(`  - Sink nodes: ${sinkNodes.length}`);

    if (sourceNodes.length === 1 && sinkNodes.length === 1) {
        console.log(`  - This appears to be a single-source, single-sink graph`);
    } else if (sourceNodes.length > 1) {
        console.log(`  - This is a multi-source graph`);
    } else if (sinkNodes.length > 1) {
        console.log(`  - This is a multi-sink graph`);
    }

    // Check for cycles
    try {
        graph.topologicalSort();
        console.log(`  - This is a Directed Acyclic Graph (DAG)`);
    } catch (error) {
        console.log(`  - This graph contains cycles`);
    }

    // Analyze connectivity
    const isolatedNodes = [];
    for (const nodeName of graph.getNodes()) {
        const outDegree = graph.getNeighbors(nodeName).size;
        const inDegree = graph.getPredecessors(nodeName).size;
        if (outDegree === 0 && inDegree === 0) {
            isolatedNodes.push(nodeName);
        }
    }

    if (isolatedNodes.length > 0) {
        console.log(`  - Isolated nodes: ${isolatedNodes.join(', ')}`);
    }
}

/**
 * Example: Demonstrate edge sign interpretation
 */
function demonstrateEdgeSignInterpretation(graph) {
    console.log('\n=== Edge Sign Interpretation ===');

    // Get all edge interpretations
    const interpretations = graph.getAllEdgeInterpretations();

    console.log('Edge sign interpretations:');
    interpretations.forEach((interpretation, index) => {
        console.log(`\nEdge ${index + 1}: ${interpretation.edgeId}`);
        console.log(`  - Starting node: ${interpretation.startingNode} (${interpretation.fromSign})`);
        console.log(`  - Ending node: ${interpretation.endingNode} (${interpretation.toSign})`);
        console.log(`  - From connection: ${interpretation.fromConnection}`);
        console.log(`  - To connection: ${interpretation.toConnection}`);
        console.log(`  - Interpretation: ${interpretation.interpretation.from}`);
        console.log(`  - Interpretation: ${interpretation.interpretation.to}`);
    });

    // Show how this affects the adjacency list
    console.log('\nAdjacency list (graph topology):');
    for (const nodeName of graph.getNodes()) {
        const neighbors = graph.getNeighbors(nodeName);
        const predecessors = graph.getPredecessors(nodeName);

        console.log(`  ${nodeName}:`);
        if (neighbors.size > 0) {
            console.log(`    - Outgoing: ${Array.from(neighbors).join(', ')}`);
        }
        if (predecessors.size > 0) {
            console.log(`    - Incoming: ${Array.from(predecessors).join(', ')}`);
        }
    }

    // Demonstrate spline parameter calculation for geometry
    console.log('\n=== Spline Parameter Calculation for Geometry ===');
    const sampleEdges = Array.from(graph.getEdges().values()).slice(0, 3);
    sampleEdges.forEach((edge, index) => {
        // Get base node names for spline lookup
        const startNodeName = graph.getNodeNameFromSignedRef(edge.startingNode);
        const endNodeName = graph.getNodeNameFromSignedRef(edge.endingNode);

        // Get spline parameters
        const startParam = graph.getSplineParameter(edge.startingNode, 'starting');
        const endParam = graph.getSplineParameter(edge.endingNode, 'ending');

        console.log(`\nEdge ${index + 1}: ${edge.startingNode} -> ${edge.endingNode}`);
        console.log(`  Start node: ${startNodeName} (from ${edge.startingNode})`);
        console.log(`  End node: ${endNodeName} (from ${edge.endingNode})`);
        console.log(`  Start parameter: ${startParam} (${startParam === 0 ? 'START' : 'END'} of node ${edge.from})`);
        console.log(`  End parameter: ${endParam} (${endParam === 0 ? 'START' : 'END'} of node ${edge.to})`);
        console.log(`  Note: ending_node uses opposite logic - opposite sign → END (1), same sign → START (0)`);
        console.log(`  Geometry usage:`);
        console.log(`    startSpline = splines.get("${startNodeName}")`);
        console.log(`    endSpline = splines.get("${endNodeName}")`);
        console.log(`    xyzStart = startSpline.getPoint(${startParam})`);
        console.log(`    xyzEnd = endSpline.getPoint(${endParam})`);

        // Demonstrate the new getActualSignedNodeName method
        const actualStartNode = graph.getActualSignedNodeName(edge.startingNode);
        const actualEndNode = graph.getActualSignedNodeName(edge.endingNode);
        console.log(`  Actual signed node names for spline lookup:`);
        console.log(`    startSpline = splines.get("${actualStartNode}")`);
        console.log(`    endSpline = splines.get("${actualEndNode}")`);

        // Show the difference between the methods
        const baseStartNode = graph.getNodeNameFromSignedRef(edge.startingNode);
        const baseEndNode = graph.getNodeNameFromSignedRef(edge.endingNode);
        console.log(`  Base node names (for reference):`);
        console.log(`    startNode base: "${baseStartNode}"`);
        console.log(`    endNode base: "${baseEndNode}"`);
    });
}

/**
 * Example: Analyze edge patterns
 */
function analyzeEdgePatterns(graph) {
    console.log('\n=== Edge Pattern Analysis ===');

    // Count different sign combinations
    const signPatterns = new Map();

    for (const [edgeId, edgeData] of graph.getEdges()) {
        const pattern = `${edgeData.fromSign}->${edgeData.toSign}`;
        signPatterns.set(pattern, (signPatterns.get(pattern) || 0) + 1);
    }

    console.log('Edge sign patterns:');
    for (const [pattern, count] of signPatterns) {
        console.log(`  ${pattern}: ${count} edges`);
    }

    // Find edges with specific patterns
    console.log('\nEdges by pattern:');
    for (const [pattern, count] of signPatterns) {
        console.log(`\n${pattern} pattern (${count} edges):`);
        for (const [edgeId, edgeData] of graph.getEdges()) {
            const edgePattern = `${edgeData.fromSign}->${edgeData.toSign}`;
            if (edgePattern === pattern) {
                console.log(`  ${edgeData.startingNode} -> ${edgeData.endingNode}`);
            }
        }
    }
}

/**
 * Example: Demonstrate the correct edge sign interpretation rule
 */
function demonstrateCorrectSignRule(graph) {
    console.log('\n=== Correct Edge Sign Interpretation Rule ===');

    console.log('The rule works as follows:');
    console.log('1. Find the node that the edge reference points to');
    console.log('2. Get the node\'s actual sign');
    console.log('3. Compare the edge reference sign with the node\'s actual sign');
    console.log('4. Apply the appropriate rule based on whether it\'s a starting_node or ending_node');
    console.log('');
    console.log('Spline Parameter Rules:');
    console.log('- starting_node: opposite sign → START (0), same sign → END (1)');
    console.log('- ending_node: opposite sign → END (1), same sign → START (0)');
    console.log('');

    console.log('Example:');
    console.log('- Edge: {"starting_node": "1234-", "ending_node": "5678+"}');
    console.log('- This means: from node 1234 (negative reference) to node 5678 (positive reference)');
    console.log('- We need to find the actual signs of nodes 1234 and 5678');
    console.log('');

    // Show actual node signs
    console.log('Actual node signs:');
    for (const nodeName of graph.getNodes()) {
        const nodeSign = graph.getNodeSign(nodeName);
        console.log(`  Node ${nodeName}: ${nodeSign}`);
    }
    console.log('');

    // Show edge interpretations
    console.log('Edge interpretations:');
    const interpretations = graph.getAllEdgeInterpretations();
    interpretations.forEach((interpretation, index) => {
        console.log(`\nEdge ${index + 1}: ${interpretation.edgeId}`);
        console.log(`  - Starting node reference: ${interpretation.startingNode} (ref: ${interpretation.fromSign})`);
        console.log(`  - Starting node actual: ${interpretation.fromNode} (${interpretation.fromNodeSign})`);
        console.log(`  - Ending node reference: ${interpretation.endingNode} (ref: ${interpretation.toSign})`);
        console.log(`  - Ending node actual: ${interpretation.toNode} (${interpretation.toNodeSign})`);
        console.log(`  - From connection: ${interpretation.fromConnection} (${interpretation.fromSign} vs ${interpretation.fromNodeSign})`);
        console.log(`  - To connection: ${interpretation.toConnection} (${interpretation.toSign} vs ${interpretation.toNodeSign})`);
    });
}

/**
 * Example: Analyze cycles in the graph
 */
function analyzeCycles(graph) {
    console.log('\n=== Cycle Analysis ===');

    const cycles = graph.detectCycles();
    const sccs = graph.findStronglyConnectedComponents();

    console.log(`Cycle detection:`);
    console.log(`  - Has cycles: ${graph.hasCycles()}`);
    console.log(`  - Number of cycles: ${cycles.length}`);
    console.log(`  - Strongly connected components: ${sccs.length}`);

    if (cycles.length > 0) {
        console.log('\nDetected cycles:');
        cycles.forEach((cycle, index) => {
            console.log(`  Cycle ${index + 1}: ${cycle.join(' -> ')}`);
        });
    }

    if (sccs.length > 0) {
        console.log('\nStrongly connected components:');
        sccs.forEach((scc, index) => {
            if (scc.length > 1) { // Only show non-trivial SCCs
                console.log(`  SCC ${index + 1}: ${scc.join(', ')}`);
            }
        });
    }

    // Analyze cycle properties
    if (cycles.length > 0) {
        console.log('\nCycle properties:');
        const cycleLengths = cycles.map(cycle => cycle.length - 1); // -1 because cycle includes start node twice
        const avgCycleLength = cycleLengths.reduce((sum, len) => sum + len, 0) / cycleLengths.length;
        const minCycleLength = Math.min(...cycleLengths);
        const maxCycleLength = Math.max(...cycleLengths);

        console.log(`  - Average cycle length: ${avgCycleLength.toFixed(2)} nodes`);
        console.log(`  - Shortest cycle: ${minCycleLength} nodes`);
        console.log(`  - Longest cycle: ${maxCycleLength} nodes`);
    }
}

/**
 * Example: Analyze graph structure with cycles
 */
function analyzeGraphStructureWithCycles(graph) {
    console.log('\n=== Graph Structure Analysis (with cycles) ===');

    const stats = graph.getStatistics();
    const sourceNodes = graph.getSourceNodes();
    const sinkNodes = graph.getSinkNodes();

    console.log(`Graph type analysis:`);
    console.log(`  - Total nodes: ${stats.nodeCount}`);
    console.log(`  - Total edges: ${stats.edgeCount}`);
    console.log(`  - Source nodes: ${sourceNodes.length}`);
    console.log(`  - Sink nodes: ${sinkNodes.length}`);
    console.log(`  - Has cycles: ${stats.hasCycles}`);
    console.log(`  - Cycle count: ${stats.cycleCount}`);
    console.log(`  - Strongly connected components: ${stats.stronglyConnectedComponents}`);
    console.log(`  - Is DAG: ${stats.isDAG}`);

    if (sourceNodes.length === 1 && sinkNodes.length === 1) {
        console.log(`  - This appears to be a single-source, single-sink graph`);
    } else if (sourceNodes.length > 1) {
        console.log(`  - This is a multi-source graph`);
    } else if (sinkNodes.length > 1) {
        console.log(`  - This is a multi-sink graph`);
    }

    // Check for cycles
    if (stats.hasCycles) {
        console.log(`  - This graph contains cycles (not a DAG)`);
        console.log(`  - Topological sort is not possible`);
    } else {
        console.log(`  - This is a Directed Acyclic Graph (DAG)`);
        try {
            const topoSort = graph.topologicalSort();
            console.log(`  - Topologically sorted nodes: ${topoSort.join(', ')}`);
        } catch (error) {
            console.log(`  - Error in topological sort: ${error.message}`);
        }
    }

    // Analyze connectivity
    const isolatedNodes = [];
    for (const nodeName of graph.getNodes()) {
        const outDegree = graph.getNeighbors(nodeName).size;
        const inDegree = graph.getPredecessors(nodeName).size;
        if (outDegree === 0 && inDegree === 0) {
            isolatedNodes.push(nodeName);
        }
    }

    if (isolatedNodes.length > 0) {
        console.log(`  - Isolated nodes: ${isolatedNodes.join(', ')}`);
    }
}

/**
 * Example: Find paths in cyclic graphs
 */
function analyzePathsInCyclicGraph(graph) {
    console.log('\n=== Path Analysis in Cyclic Graph ===');

    const sourceNodes = graph.getSourceNodes();
    const sinkNodes = graph.getSinkNodes();

    if (sourceNodes.length === 0 || sinkNodes.length === 0) {
        console.log('No source or sink nodes found for path analysis.');
        return;
    }

    const startNode = sourceNodes[0];
    const endNode = sinkNodes[0];

    console.log(`Finding paths from ${startNode} to ${endNode} in cyclic graph...`);

    // Find shortest path (BFS still works in cyclic graphs)
    const shortestPath = graph.findShortestPath(startNode, endNode);
    if (shortestPath) {
        console.log(`Shortest path: ${shortestPath.join(' -> ')}`);
        console.log(`Path length: ${shortestPath.length} nodes`);
    } else {
        console.log('No path found between these nodes.');
    }

    // Find all paths with cycle handling
    console.log('\nFinding all paths (with cycle protection)...');
    const allPaths = graph.findAllPaths(startNode, endNode, 10, 30); // Limit path length to 30
    console.log(`Found ${allPaths.length} paths:`);
    allPaths.forEach((path, index) => {
        console.log(`  Path ${index + 1}: ${path.join(' -> ')} (${path.length} nodes)`);
    });

    // Analyze path properties
    if (allPaths.length > 0) {
        const pathLengths = allPaths.map(path => path.length);
        const avgPathLength = pathLengths.reduce((sum, len) => sum + len, 0) / pathLengths.length;
        const minPathLength = Math.min(...pathLengths);
        const maxPathLength = Math.max(...pathLengths);

        console.log('\nPath statistics:');
        console.log(`  - Average path length: ${avgPathLength.toFixed(2)} nodes`);
        console.log(`  - Shortest path: ${minPathLength} nodes`);
        console.log(`  - Longest path: ${maxPathLength} nodes`);
    }
}

/**
 * Example: Analyze reachability in cyclic graphs
 */
function analyzeReachabilityInCyclicGraph(graph) {
    console.log('\n=== Reachability Analysis in Cyclic Graph ===');

    const sourceNodes = graph.getSourceNodes();
    const sinkNodes = graph.getSinkNodes();

    if (sourceNodes.length > 0) {
        const startNode = sourceNodes[0];
        console.log(`\nReachability from ${startNode}:`);

        const reachable = graph.getReachableNodes(startNode);
        console.log(`  - Nodes reachable from ${startNode}: ${Array.from(reachable).join(', ')}`);
        console.log(`  - Total reachable nodes: ${reachable.size}`);
        console.log(`  - Reachability percentage: ${((reachable.size / graph.getNodes().size) * 100).toFixed(1)}%`);
    }

    if (sinkNodes.length > 0) {
        const endNode = sinkNodes[0];
        console.log(`\nNodes reaching ${endNode}:`);

        const reaching = graph.getNodesReaching(endNode);
        console.log(`  - Nodes that can reach ${endNode}: ${Array.from(reaching).join(', ')}`);
        console.log(`  - Total nodes reaching: ${reaching.size}`);
        console.log(`  - Reachability percentage: ${((reaching.size / graph.getNodes().size) * 100).toFixed(1)}%`);
    }

    // Analyze strongly connected components
    const sccs = graph.findStronglyConnectedComponents();
    console.log(`\nStrongly connected components analysis:`);
    console.log(`  - Number of SCCs: ${sccs.length}`);

    const nonTrivialSCCs = sccs.filter(scc => scc.length > 1);
    console.log(`  - Non-trivial SCCs (size > 1): ${nonTrivialSCCs.length}`);

    if (nonTrivialSCCs.length > 0) {
        console.log(`  - Largest SCC: ${Math.max(...nonTrivialSCCs.map(scc => scc.length))} nodes`);
        console.log(`  - Average SCC size: ${(nonTrivialSCCs.reduce((sum, scc) => sum + scc.length, 0) / nonTrivialSCCs.length).toFixed(2)} nodes`);
    }
}

/**
 * Example: Comprehensive path analysis for visualization
 */
function analyzePathsForVisualization(graph) {
    console.log('\n=== Path Analysis for Visualization ===');

    // Analyze all possible paths
    const pathAnalysis = graph.analyzeAllPaths(50, 100);

    console.log('Path Statistics:');
    console.log(`  - Total paths found: ${pathAnalysis.pathCount}`);
    console.log(`  - Average path length: ${pathAnalysis.pathStatistics.averageLength.toFixed(2)} nodes`);
    console.log(`  - Path length range: ${pathAnalysis.pathStatistics.minLength} - ${pathAnalysis.pathStatistics.maxLength} nodes`);
    console.log(`  - Unique paths: ${pathAnalysis.pathStatistics.uniquePaths}`);

    // Show node frequency (which nodes appear most often)
    console.log('\nNode frequency across all paths:');
    const sortedNodes = Object.entries(pathAnalysis.nodeFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10); // Top 10 most frequent nodes

    sortedNodes.forEach(([node, frequency]) => {
        console.log(`  ${node}: appears in ${frequency} paths`);
    });

    // Show sample paths
    console.log('\nSample paths (first 5):');
    pathAnalysis.paths.slice(0, 5).forEach((path, index) => {
        console.log(`  Path ${index + 1}: ${path.join(' -> ')}`);
    });

    return pathAnalysis;
}

/**
 * Example: Cycle impact on path diversity
 */
function demonstrateCycleImpact(graph) {
    console.log('\n=== Cycle Impact on Path Diversity ===');

    const cycleImpact = graph.analyzeCycleImpact();

    console.log(`Cycle analysis:`);
    console.log(`  - Number of cycles: ${cycleImpact.cycleCount}`);
    console.log(`  - Nodes involved in cycles: ${Array.from(cycleImpact.cycleNodes).join(', ')}`);
    console.log(`  - Paths that go through cycles: ${cycleImpact.pathsThroughCycles.length}`);

    if (cycleImpact.cycles.length > 0) {
        console.log('\nDetected cycles:');
        cycleImpact.cycles.forEach((cycle, index) => {
            console.log(`  Cycle ${index + 1}: ${cycle.join(' -> ')}`);
        });
    }

    if (cycleImpact.pathsThroughCycles.length > 0) {
        console.log('\nPaths that traverse cycles:');
        cycleImpact.pathsThroughCycles.slice(0, 5).forEach((pathInfo, index) => {
            console.log(`  Path ${index + 1}: ${pathInfo.path.join(' -> ')}`);
            console.log(`    - Goes through cycle nodes: ${pathInfo.cycleNodes.join(', ')}`);
        });
    }

    return cycleImpact;
}

/**
 * Example: Assembly distribution analysis
 */
function analyzeAssemblyDistribution(graph, getAssemblyForNode) {
    console.log('\n=== Assembly Distribution Analysis ===');

    const assemblyDistribution = graph.getAssemblyDistribution(getAssemblyForNode);

    console.log('Assembly frequency across all paths:');
    const sortedAssemblies = Object.entries(assemblyDistribution.assemblyFrequency)
        .sort(([,a], [,b]) => b - a);

    sortedAssemblies.forEach(([assembly, frequency]) => {
        console.log(`  ${assembly}: appears ${frequency} times across all paths`);
    });

    console.log(`\nSummary:`);
    console.log(`  - Total paths analyzed: ${assemblyDistribution.totalPaths}`);
    console.log(`  - Unique assemblies found: ${assemblyDistribution.uniqueAssemblies}`);

    // Show which assemblies appear together in paths
    console.log('\nAssembly co-occurrence in paths:');
    const assemblyPaths = assemblyDistribution.assemblyPaths;
    Object.entries(assemblyPaths).forEach(([assembly, paths]) => {
        console.log(`  ${assembly}: appears in ${paths.length} paths`);
    });

    return assemblyDistribution;
}

/**
 * Example: Detailed path analysis for visualization
 */
function getDetailedPathAnalysis(graph) {
    console.log('\n=== Detailed Path Analysis for Visualization ===');

    const pathAnalysis = graph.analyzeAllPaths(10, 50); // Limit for demonstration

    console.log('Detailed path information:');
    pathAnalysis.paths.slice(0, 3).forEach((path, index) => {
        console.log(`\nPath ${index + 1}:`);

        const pathDetails = graph.getPathDetails(path);
        console.log(`  - Nodes: ${pathDetails.nodes.join(' -> ')}`);
        console.log(`  - Length: ${pathDetails.length} nodes`);

        console.log(`  - Node signs:`);
        pathDetails.nodeSigns.forEach(({ node, sign }) => {
            console.log(`    ${node}: ${sign}`);
        });

        console.log(`  - Edge interpretations:`);
        pathDetails.edgeInterpretations.forEach((interpretation, edgeIndex) => {
            console.log(`    Edge ${edgeIndex + 1}: ${interpretation.interpretation.from}`);
            console.log(`           ${interpretation.interpretation.to}`);
        });
    });

    return pathAnalysis;
}

/**
 * Example: Find paths containing specific assemblies
 */
function findPathsForAssemblies(graph, targetAssemblies, getAssemblyForNode) {
    console.log(`\n=== Finding Paths for Assemblies: ${targetAssemblies.join(', ')} ===`);

    // First, find nodes that belong to target assemblies
    const targetNodes = [];
    for (const nodeName of graph.getNodes()) {
        const assembly = getAssemblyForNode(nodeName);
        if (assembly && targetAssemblies.includes(assembly)) {
            targetNodes.push(nodeName);
        }
    }

    console.log(`Nodes from target assemblies: ${targetNodes.join(', ')}`);

    // Find paths that contain these nodes
    const matchingPaths = graph.findPathsContainingNodes(targetNodes, 10);

    console.log(`\nPaths containing target assemblies:`);
    matchingPaths.forEach((pathInfo, index) => {
        console.log(`\nPath ${index + 1}:`);
        console.log(`  - Full path: ${pathInfo.path.join(' -> ')}`);
        console.log(`  - Contains nodes: ${pathInfo.containedNodes.join(', ')}`);
        console.log(`  - From ${pathInfo.source} to ${pathInfo.sink}`);

        // Show assembly distribution in this path
        const pathAssemblies = new Set();
        for (const node of pathInfo.path) {
            const assembly = getAssemblyForNode(node);
            if (assembly) {
                pathAssemblies.add(assembly);
            }
        }
        console.log(`  - Assemblies in path: ${Array.from(pathAssemblies).join(', ')}`);
    });

    return matchingPaths;
}

/**
 * Example: Visual path comparison
 */
function comparePathsVisually(graph, path1, path2) {
    console.log('\n=== Visual Path Comparison ===');

    const details1 = graph.getPathDetails(path1);
    const details2 = graph.getPathDetails(path2);

    console.log('Path 1:');
    console.log(`  - Nodes: ${details1.nodes.join(' -> ')}`);
    console.log(`  - Length: ${details1.length} nodes`);

    console.log('\nPath 2:');
    console.log(`  - Nodes: ${details2.nodes.join(' -> ')}`);
    console.log(`  - Length: ${details2.length} nodes`);

    // Find common and unique nodes
    const nodes1 = new Set(details1.nodes);
    const nodes2 = new Set(details2.nodes);

    const commonNodes = [...nodes1].filter(node => nodes2.has(node));
    const uniqueToPath1 = [...nodes1].filter(node => !nodes2.has(node));
    const uniqueToPath2 = [...nodes2].filter(node => !nodes1.has(node));

    console.log('\nComparison:');
    console.log(`  - Common nodes: ${commonNodes.join(', ')}`);
    console.log(`  - Unique to Path 1: ${uniqueToPath1.join(', ')}`);
    console.log(`  - Unique to Path 2: ${uniqueToPath2.join(', ')}`);
    console.log(`  - Similarity: ${((commonNodes.length / Math.max(nodes1.size, nodes2.size)) * 100).toFixed(1)}%`);

    return {
        path1: details1,
        path2: details2,
        commonNodes,
        uniqueToPath1,
        uniqueToPath2
    };
}

// Export for use in other modules
export {
    demonstratePangenomeGraph,
    findPathsThroughNodes,
    analyzeConnectivityPatterns,
    analyzeReachability,
    analyzeGraphStructure,
    demonstrateEdgeSignInterpretation,
    analyzeEdgePatterns,
    demonstrateCorrectSignRule,
    analyzeCycles,
    analyzeGraphStructureWithCycles,
    analyzePathsInCyclicGraph,
    analyzeReachabilityInCyclicGraph,
    analyzePathsForVisualization,
    demonstrateCycleImpact,
    analyzeAssemblyDistribution,
    getDetailedPathAnalysis,
    findPathsForAssemblies,
    comparePathsVisually
};
