/**
 * PangenomeGraph - A minimal graph representation focused on topology and traversal
 * This class handles only the graph structure and path-finding algorithms.
 * All other data (assembly, sequence, geometry) is handled by other services.
 *
 * Edge Sign Interpretation Rules:
 * - starting_node: opposite sign → START of node, same sign → END of node
 * - ending_node: opposite sign → START of node, same sign → END of node
 *
 * The rule works by:
 * 1. Find the node that the edge reference points to
 * 2. Get the node's actual sign
 * 3. Compare the edge reference sign with the node's actual sign
 *
 * Note: Pangenome graphs can contain cycles, representing structural variations
 * and complex genomic rearrangements.
 *
 * Node Naming Convention:
 * - Nodes are stored with their full signed names (e.g., "1234+", "5678-")
 * - The sign is part of the node's identity and must be preserved
 * - Map keys use the full signed node name to maintain sign information
 */
class PangenomeGraph {
    constructor() {
        this.nodes = new Set(); // Set of signed node names (e.g., "1234+", "5678-")
        this.edges = new Map(); // edgeId -> {from, to, fromSign, toSign}
        this.adjacencyList = new Map(); // signedNodeName -> Set of adjacent signed node names
        this.reverseAdjacencyList = new Map(); // signedNodeName -> Set of predecessor signed node names
    }

    /**
     * Extract node name and sign from a signed node identifier
     * @param {string} signedNode - Node identifier like "2918+" or "2918-"
     * @returns {Object} {nodeName, sign}
     */
    #parseSignedNode(signedNode) {
        const match = signedNode.match(/^(.+?)([+-])$/);
        if (!match) {
            throw new Error(`Invalid signed node format: ${signedNode}`);
        }
        return {
            nodeName: match[1],
            sign: match[2]
        };
    }

    /**
     * Get the actual sign of a node from its signed name
     * @param {string} signedNodeName - The signed node name (e.g., "1234+", "5678-")
     * @returns {string} The node's actual sign ('+' or '-')
     */
    getNodeSign(signedNodeName) {
        const { sign } = this.#parseSignedNode(signedNodeName);
        return sign;
    }

    /**
     * Build the graph from JSON data
     * @param {Object} jsonData - The pangenome JSON data
     */
    buildFromJSON(jsonData) {
        this.clear();

        // Add nodes with their full signed names
        for (const signedNodeName of Object.keys(jsonData.node)) {
            this.addNode(signedNodeName);
        }

        // Add edges
        if (jsonData.edge) {
            for (const edgeData of jsonData.edge) {
                this.addEdge(edgeData.starting_node, edgeData.ending_node);
            }
        }
    }

    /**
     * Add a node to the graph
     * @param {string} signedNodeName - The signed node name (e.g., "1234+", "5678-")
     */
    addNode(signedNodeName) {
        this.nodes.add(signedNodeName);
        this.adjacencyList.set(signedNodeName, new Set());
        this.reverseAdjacencyList.set(signedNodeName, new Set());
    }

    /**
     * Add an edge to the graph using sign interpretation rules
     * @param {string} startingNode - Starting node with sign (e.g., "2918+")
     * @param {string} endingNode - Ending node with sign (e.g., "2919-")
     */
    addEdge(startingNode, endingNode) {
        const { nodeName: fromNode, sign: fromSign } = this.#parseSignedNode(startingNode);
        const { nodeName: toNode, sign: toSign } = this.#parseSignedNode(endingNode);

        const edgeId = `${startingNode}->${endingNode}`;

        // Add to edges map with sign information
        this.edges.set(edgeId, {
            id: edgeId,
            from: fromNode,
            to: toNode,
            fromSign: fromSign,
            toSign: toSign,
            startingNode: startingNode,
            endingNode: endingNode
        });

        // Add to adjacency lists (the actual graph connections)
        // Note: The adjacency lists represent the actual graph topology
        // based on the sign interpretation rules
        if (this.adjacencyList.has(startingNode)) {
            this.adjacencyList.get(startingNode).add(endingNode);
        }

        if (this.reverseAdjacencyList.has(endingNode)) {
            this.reverseAdjacencyList.get(endingNode).add(startingNode);
        }
    }

    /**
     * Get all signed node names in the graph
     * @returns {Set} Set of signed node names
     */
    getNodes() {
        return this.nodes;
    }

    /**
     * Get all edges in the graph
     * @returns {Map} Map of edgeId -> edgeData
     */
    getEdges() {
        return this.edges;
    }

    /**
     * Check if a node exists in the graph
     * @param {string} signedNodeName - The signed node name to check (e.g., "1234+")
     * @returns {boolean} True if node exists
     */
    hasNode(signedNodeName) {
        return this.nodes.has(signedNodeName);
    }

    /**
     * Get neighbors of a node (outgoing edges)
     * @param {string} signedNodeName - The signed node to get neighbors for (e.g., "1234+")
     * @returns {Set} Set of neighboring signed node names
     */
    getNeighbors(signedNodeName) {
        return this.adjacencyList.get(signedNodeName) || new Set();
    }

    /**
     * Get predecessors of a node (incoming edges)
     * @param {string} signedNodeName - The signed node to get predecessors for (e.g., "1234+")
     * @returns {Set} Set of predecessor signed node names
     */
    getPredecessors(signedNodeName) {
        return this.reverseAdjacencyList.get(signedNodeName) || new Set();
    }

    /**
     * Get edge data
     * @param {string} fromNode - Starting node (base name without sign)
     * @param {string} toNode - Ending node (base name without sign)
     * @returns {Object|null} Edge data or null if edge doesn't exist
     */
    getEdge(fromNode, toNode) {
        // Find edge by matching base node names
        for (const [edgeId, edgeData] of this.edges) {
            if (edgeData.from === fromNode && edgeData.to === toNode) {
                return edgeData;
            }
        }
        return null;
    }

    /**
     * Get all edges between two nodes (there might be multiple with different signs)
     * @param {string} fromNode - Starting node (base name without sign)
     * @param {string} toNode - Ending node (base name without sign)
     * @returns {Array} Array of edge data objects
     */
    getEdgesBetween(fromNode, toNode) {
        const edges = [];
        for (const [edgeId, edgeData] of this.edges) {
            if (edgeData.from === fromNode && edgeData.to === toNode) {
                edges.push(edgeData);
            }
        }
        return edges;
    }

    /**
     * Check if an edge exists
     * @param {string} fromNode - Starting node (base name without sign)
     * @param {string} toNode - Ending node (base name without sign)
     * @returns {boolean} True if edge exists
     */
    hasEdge(fromNode, toNode) {
        return this.getEdge(fromNode, toNode) !== null;
    }

    /**
     * Get signed node information for an edge
     * @param {string} edgeId - The edge identifier
     * @returns {Object|null} Edge data with sign information
     */
    getSignedEdge(edgeId) {
        return this.edges.get(edgeId) || null;
    }

    /**
     * Demonstrate edge sign interpretation for a specific edge
     * This shows how the sign rules determine connection points
     * @param {string} edgeId - The edge identifier
     * @returns {Object|null} Interpretation details or null if edge doesn't exist
     */
    interpretEdgeSigns(edgeId) {
        const edgeData = this.edges.get(edgeId);
        if (!edgeData) return null;

        const { from, to, fromSign, toSign, startingNode, endingNode } = edgeData;

        // Get the actual signs of the nodes by parsing the signed node names
        const fromNodeSign = this.getNodeSign(startingNode);
        const toNodeSign = this.getNodeSign(endingNode);

        if (!fromNodeSign || !toNodeSign) {
            throw new Error(`Node signs not found for ${startingNode} or ${endingNode}`);
        }

        // Determine connection points based on sign interpretation rules
        let fromConnection, toConnection;

        // For starting node: opposite sign → START, same sign → END
        if (fromSign !== fromNodeSign) {
            fromConnection = 'START'; // Opposite signs
        } else {
            fromConnection = 'END';   // Same signs
        }

        // For ending node: opposite sign → START, same sign → END
        if (toSign !== toNodeSign) {
            toConnection = 'START';   // Opposite signs
        } else {
            toConnection = 'END';     // Same signs
        }

        return {
            edgeId,
            startingNode,
            endingNode,
            fromNode: from,
            toNode: to,
            fromSign,
            toSign,
            fromNodeSign,
            toNodeSign,
            fromConnection,
            toConnection,
            interpretation: {
                from: `Edge starts at ${fromConnection} of node ${from} (edge ref: ${fromSign}, node: ${fromNodeSign})`,
                to: `Edge ends at ${toConnection} of node ${to} (edge ref: ${toSign}, node: ${toNodeSign})`
            }
        };
    }

    /**
     * Get all edges with their sign interpretations
     * @returns {Array} Array of edge interpretations
     */
    getAllEdgeInterpretations() {
        const interpretations = [];
        for (const edgeId of this.edges.keys()) {
            const interpretation = this.interpretEdgeSigns(edgeId);
            if (interpretation) {
                interpretations.push(interpretation);
            }
        }
        return interpretations;
    }

    /**
     * Detect cycles in the graph using DFS
     * @returns {Array} Array of cycle arrays (each cycle is an array of node names)
     */
    detectCycles() {
        const cycles = [];
        const visited = new Set();
        const recursionStack = new Set();

        const dfs = (node, path) => {
            if (recursionStack.has(node)) {
                // Found a cycle
                const cycleStart = path.indexOf(node);
                const cycle = path.slice(cycleStart);
                cycles.push([...cycle, node]);
                return;
            }

            if (visited.has(node)) {
                return;
            }

            visited.add(node);
            recursionStack.add(node);
            path.push(node);

            const neighbors = this.getNeighbors(node);
            for (const neighbor of neighbors) {
                dfs(neighbor, path);
            }

            recursionStack.delete(node);
            path.pop();
        };

        for (const node of this.nodes) {
            if (!visited.has(node)) {
                dfs(node, []);
            }
        }

        return cycles;
    }

    /**
     * Check if the graph contains cycles
     * @returns {boolean} True if graph contains cycles
     */
    hasCycles() {
        return this.detectCycles().length > 0;
    }

    /**
     * Find all paths between two nodes using DFS (handles cycles)
     * @param {string} startNode - Starting node (base name without sign)
     * @param {string} endNode - Ending node (base name without sign)
     * @param {number} maxPaths - Maximum number of paths to find (default: 10)
     * @param {number} maxPathLength - Maximum path length to prevent infinite loops (default: 50)
     * @returns {Array} Array of path arrays (each path is an array of node names)
     */
    findAllPaths(startNode, endNode, maxPaths = 10, maxPathLength = 50) {
        const paths = [];
        const pathVisited = new Set(); // Track visited nodes in current path only
        const pathSet = new Set(); // Track unique paths to avoid duplicates

        const dfs = (current, target, path) => {
            if (paths.length >= maxPaths) return;
            if (path.length >= maxPathLength) return; // Prevent infinite loops in cyclic graphs

            // Check if current node is already in the current path (cycle detection)
            if (pathVisited.has(current)) {
                return; // Avoid cycles within the same path
            }

            pathVisited.add(current);
            path.push(current);

            if (current === target) {
                const pathString = path.join('->');
                // Only add if this is a unique path
                if (!pathSet.has(pathString)) {
                    pathSet.add(pathString);
                    paths.push([...path]);
                }
            } else {
                const neighbors = this.getNeighbors(current);
                for (const neighbor of neighbors) {
                    dfs(neighbor, target, path);
                }
            }

            pathVisited.delete(current);
            path.pop();
        };

        dfs(startNode, endNode, []);
        return paths;
    }

    /**
     * Find the shortest path between two nodes using BFS
     * @param {string} startNode - Starting node (base name without sign)
     * @param {string} endNode - Ending node (base name without sign)
     * @returns {Array|null} Array of node names representing the shortest path, or null if no path exists
     */
    findShortestPath(startNode, endNode) {
        const queue = [[startNode, [startNode]]];
        const visited = new Set([startNode]);

        while (queue.length > 0) {
            const [current, path] = queue.shift();

            if (current === endNode) {
                return path;
            }

            const neighbors = this.getNeighbors(current);
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push([neighbor, [...path, neighbor]]);
                }
            }
        }

        return null; // No path found
    }

    /**
     * Get all nodes that are sources (no incoming edges)
     * @returns {Array} Array of source node names
     */
    getSourceNodes() {
        const sources = [];
        for (const nodeName of this.nodes) {
            const predecessors = this.getPredecessors(nodeName);
            if (predecessors.size === 0) {
                sources.push(nodeName);
            }
        }
        return sources;
    }

    /**
     * Get all nodes that are sinks (no outgoing edges)
     * @returns {Array} Array of sink node names
     */
    getSinkNodes() {
        const sinks = [];
        for (const nodeName of this.nodes) {
            const neighbors = this.getNeighbors(nodeName);
            if (neighbors.size === 0) {
                sinks.push(nodeName);
            }
        }
        return sinks;
    }

    /**
     * Perform topological sort (for DAGs)
     * @returns {Array} Topologically sorted array of node names
     * @throws {Error} If graph contains cycles
     */
    topologicalSort() {
        const result = [];
        const visited = new Set();
        const temp = new Set();

        const visit = (nodeName) => {
            if (temp.has(nodeName)) {
                throw new Error('Graph contains cycles');
            }
            if (visited.has(nodeName)) {
                return;
            }

            temp.add(nodeName);

            const neighbors = this.getNeighbors(nodeName);
            for (const neighbor of neighbors) {
                visit(neighbor);
            }

            temp.delete(nodeName);
            visited.add(nodeName);
            result.unshift(nodeName);
        };

        for (const nodeName of this.nodes) {
            if (!visited.has(nodeName)) {
                visit(nodeName);
            }
        }

        return result;
    }

    /**
     * Get all nodes reachable from a starting node
     * @param {string} startNode - Starting node (base name without sign)
     * @returns {Set} Set of reachable node names
     */
    getReachableNodes(startNode) {
        const reachable = new Set();
        const queue = [startNode];

        while (queue.length > 0) {
            const current = queue.shift();
            if (!reachable.has(current)) {
                reachable.add(current);
                const neighbors = this.getNeighbors(current);
                for (const neighbor of neighbors) {
                    queue.push(neighbor);
                }
            }
        }

        return reachable;
    }

    /**
     * Get all nodes that can reach a target node
     * @param {string} targetNode - Target node (base name without sign)
     * @returns {Set} Set of node names that can reach the target
     */
    getNodesReaching(targetNode) {
        const reaching = new Set();
        const queue = [targetNode];

        while (queue.length > 0) {
            const current = queue.shift();
            if (!reaching.has(current)) {
                reaching.add(current);
                const predecessors = this.getPredecessors(current);
                for (const predecessor of predecessors) {
                    queue.push(predecessor);
                }
            }
        }

        return reaching;
    }

    /**
     * Analyze strongly connected components (SCCs) in the graph
     * @returns {Array} Array of SCC arrays (each SCC is an array of node names)
     */
    findStronglyConnectedComponents() {
        const sccs = [];
        const visited = new Set();
        const stack = [];

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

        for (const node of this.nodes) {
            if (!visited.has(node)) {
                dfs1(node);
            }
        }

        // Create transpose graph
        const transpose = new Map();
        for (const node of this.nodes) {
            transpose.set(node, new Set());
        }

        for (const [edgeId, edgeData] of this.edges) {
            const { startingNode, endingNode } = edgeData;
            // Use the actual signed node names for the transpose
            transpose.get(endingNode).add(startingNode);
        }

        // Second DFS on transpose
        visited.clear();
        const dfs2 = (node, scc) => {
            visited.add(node);
            scc.push(node);
            const neighbors = transpose.get(node) || new Set();
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    dfs2(neighbor, scc);
                }
            }
        };

        while (stack.length > 0) {
            const node = stack.pop();
            if (!visited.has(node)) {
                const scc = [];
                dfs2(node, scc);
                sccs.push(scc);
            }
        }

        return sccs;
    }

    /**
     * Clear all graph data
     */
    clear() {
        this.nodes.clear();
        this.edges.clear();
        this.adjacencyList.clear();
        this.reverseAdjacencyList.clear();
    }

    /**
     * Get graph statistics
     * @returns {Object} Graph statistics
     */
    getStatistics() {
        let totalOutDegree = 0;
        let totalInDegree = 0;

        for (const nodeName of this.nodes) {
            totalOutDegree += this.getNeighbors(nodeName).size;
            totalInDegree += this.getPredecessors(nodeName).size;
        }

        const cycles = this.detectCycles();
        const sccs = this.findStronglyConnectedComponents();

        return {
            nodeCount: this.nodes.size,
            edgeCount: this.edges.size,
            sourceNodes: this.getSourceNodes().length,
            sinkNodes: this.getSinkNodes().length,
            averageOutDegree: this.nodes.size > 0 ? totalOutDegree / this.nodes.size : 0,
            averageInDegree: this.nodes.size > 0 ? totalInDegree / this.nodes.size : 0,
            hasCycles: cycles.length > 0,
            cycleCount: cycles.length,
            stronglyConnectedComponents: sccs.length,
            isDAG: cycles.length === 0
        };
    }

    /**
     * Analyze all possible paths through the graph
     * This is crucial for understanding assembly distribution
     * @param {number} maxPaths - Maximum number of paths to find (default: 50)
     * @param {number} maxPathLength - Maximum path length (default: 100)
     * @returns {Object} Comprehensive path analysis
     */
    analyzeAllPaths(maxPaths = 50, maxPathLength = 100) {
        const sourceNodes = this.getSourceNodes();
        const sinkNodes = this.getSinkNodes();

        if (sourceNodes.length === 0 || sinkNodes.length === 0) {
            return {
                error: 'No source or sink nodes found',
                paths: [],
                pathCount: 0,
                assemblyDistribution: {},
                pathStatistics: {}
            };
        }

        const allPaths = [];
        const assemblyCounts = new Map(); // assembly -> count
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
            // Count node frequency
            for (const node of path) {
                nodeFrequency.set(node, (nodeFrequency.get(node) || 0) + 1);
            }
        }

        // Calculate path statistics
        const pathLengths = allPaths.map(path => path.length);
        const pathStatistics = {
            totalPaths: allPaths.length,
            averageLength: pathLengths.length > 0 ? pathLengths.reduce((sum, len) => sum + len, 0) / pathLengths.length : 0,
            minLength: pathLengths.length > 0 ? Math.min(...pathLengths) : 0,
            maxLength: pathLengths.length > 0 ? Math.max(...pathLengths) : 0,
            uniquePaths: new Set(allPaths.map(path => path.join('->'))).size
        };

        return {
            paths: allPaths,
            pathCount: allPaths.length,
            nodeFrequency: Object.fromEntries(nodeFrequency),
            pathStatistics,
            sourceNodes,
            sinkNodes
        };
    }

    /**
     * Get detailed path information for visualization
     * @param {Array} path - Array of node names representing a path
     * @returns {Object} Detailed path information
     */
    getPathDetails(path) {
        if (!path || path.length === 0) return null;

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

                    // Get edge interpretation
                    const interpretation = this.interpretEdgeSigns(edge.id);
                    if (interpretation) {
                        pathInfo.edgeInterpretations.push(interpretation);
                    }
                }
            }
        }

        return pathInfo;
    }

    /**
     * Find paths that contain specific nodes (useful for assembly analysis)
     * @param {Array} targetNodes - Array of node names to search for
     * @param {number} maxPaths - Maximum number of paths to return
     * @returns {Array} Paths that contain any of the target nodes
     */
    findPathsContainingNodes(targetNodes, maxPaths = 20) {
        const sourceNodes = this.getSourceNodes();
        const sinkNodes = this.getSinkNodes();
        const matchingPaths = [];

        for (const source of sourceNodes) {
            for (const sink of sinkNodes) {
                const allPaths = this.findAllPaths(source, sink, maxPaths, 50);

                for (const path of allPaths) {
                    // Check if path contains any target node
                    const containsTarget = targetNodes.some(target => path.includes(target));
                    if (containsTarget) {
                        matchingPaths.push({
                            path,
                            source,
                            sink,
                            containedNodes: targetNodes.filter(target => path.includes(target))
                        });
                    }
                }
            }
        }

        return matchingPaths;
    }

    /**
     * Analyze cycle impact on path diversity
     * @returns {Object} Analysis of how cycles affect path options
     */
    analyzeCycleImpact() {
        const cycles = this.detectCycles();
        const sourceNodes = this.getSourceNodes();
        const sinkNodes = this.getSinkNodes();

        const cycleImpact = {
            cycles: cycles,
            cycleCount: cycles.length,
            pathsThroughCycles: [],
            cycleNodes: new Set()
        };

        // Collect all nodes involved in cycles
        for (const cycle of cycles) {
            for (const node of cycle) {
                cycleImpact.cycleNodes.add(node);
            }
        }

        // Find paths that go through cycle nodes
        for (const source of sourceNodes) {
            for (const sink of sinkNodes) {
                const allPaths = this.findAllPaths(source, sink, 20, 50);

                for (const path of allPaths) {
                    const cycleNodesInPath = path.filter(node => cycleImpact.cycleNodes.has(node));
                    if (cycleNodesInPath.length > 0) {
                        cycleImpact.pathsThroughCycles.push({
                            path,
                            source,
                            sink,
                            cycleNodes: cycleNodesInPath,
                            cycleCount: cycleNodesInPath.length
                        });
                    }
                }
            }
        }

        return cycleImpact;
    }

    /**
     * Get the base node name from a signed node reference
     * @param {string} signedNodeRef - The signed node reference (e.g., "2918+" or "2918-")
     * @returns {string} The base node name (e.g., "2918")
     */
    getNodeNameFromSignedRef(signedNodeRef) {
        const { nodeName } = this.#parseSignedNode(signedNodeRef);
        return nodeName;
    }

    /**
     * Get the actual signed node name that exists in the graph
     * This method finds the correct signed node name for spline lookup
     * @param {string} signedNodeRef - The signed node reference (e.g., "2918+" or "2918-")
     * @returns {string} The actual signed node name that exists in the graph
     * @throws {Error} If no matching node is found
     */
    getActualSignedNodeName(signedNodeRef) {
        const { nodeName } = this.#parseSignedNode(signedNodeRef);

        // Look for the node with this base name in our graph
        for (const signedNode of this.nodes) {
            const { nodeName: existingNodeName } = this.#parseSignedNode(signedNode);
            if (existingNodeName === nodeName) {
                return signedNode; // Return the actual signed node name from the graph
            }
        }

        throw new Error(`No node found with base name ${nodeName} for reference ${signedNodeRef}`);
    }

    /**
     * Get the full signed node name from a signed node reference
     * This is useful when you need the exact signed name for spline lookup
     * @param {string} signedNodeRef - The signed node reference (e.g., "2918+" or "2918-")
     * @returns {string} The full signed node name (e.g., "2918+" or "2918-")
     */
    getSignedNodeName(signedNodeRef) {
        // For spline lookup, we need the exact signed name that matches the node data
        // This method returns the signed node reference as-is, which should match
        // the keys in the JSON node data
        return signedNodeRef;
    }

    /**
     * Get the spline parameter (0 or 1) for a signed node reference
     * This implements the sign interpretation rule for geometry creation
     * @param {string} signedNodeRef - The signed node reference (e.g., "2918+" or "2918-")
     * @param {string} nodeType - Either "starting" or "ending" to determine the rule
     * @returns {number} 0 or 1 for spline.getPoint() parameter
     */
    getSplineParameter(signedNodeRef, nodeType) {
        const { nodeName, sign: edgeSign } = this.#parseSignedNode(signedNodeRef);
        const nodeSign = this.getNodeSign(signedNodeRef);

        if (!nodeSign) {
            throw new Error(`Node sign not found for ${signedNodeRef}`);
        }

        // Determine if signs are opposite (edge sign ≠ node sign)
        const signsOpposite = edgeSign !== nodeSign;

        if (nodeType === 'starting') {
            // This is a starting_node. If the sign is opposite to the node sign
            // use node.start xyz (0). If the sign is the same, use node.end xyz (1)
            return signsOpposite ? 0 : 1;
        } else if (nodeType === 'ending') {
            // This is an ending_node. If the sign is opposite to the node sign
            // use node.end xyz (1). If the sign is the same, use node.start xyz (0)
            return signsOpposite ? 1 : 0;
        } else {
            throw new Error(`Invalid nodeType: ${nodeType}. Must be 'starting' or 'ending'`);
        }
    }

    /**
     * Analyze path complexity between two nodes
     * This helps understand why there might be many paths
     * @param {string} startNode - Starting node
     * @param {string} endNode - Ending node
     * @returns {Object} Path complexity analysis
     */
    analyzePathComplexity(startNode, endNode) {
        const analysis = {
            startNode,
            endNode,
            reachableNodes: new Set(),
            nodesReachingEnd: new Set(),
            commonNodes: new Set(),
            branchingPoints: [],
            convergencePoints: []
        };

        // Find all nodes reachable from start
        const queue = [startNode];
        const visited = new Set([startNode]);
        
        while (queue.length > 0) {
            const current = queue.shift();
            analysis.reachableNodes.add(current);
            
            const neighbors = this.getNeighbors(current);
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push(neighbor);
                }
            }
        }

        // Find all nodes that can reach end
        const reverseQueue = [endNode];
        const reverseVisited = new Set([endNode]);
        
        while (reverseQueue.length > 0) {
            const current = reverseQueue.shift();
            analysis.nodesReachingEnd.add(current);
            
            const predecessors = this.getPredecessors(current);
            for (const predecessor of predecessors) {
                if (!reverseVisited.has(predecessor)) {
                    reverseVisited.add(predecessor);
                    reverseQueue.push(predecessor);
                }
            }
        }

        // Find common nodes (nodes that are both reachable from start and can reach end)
        for (const node of analysis.reachableNodes) {
            if (analysis.nodesReachingEnd.has(node)) {
                analysis.commonNodes.add(node);
            }
        }

        // Find branching points (nodes with multiple outgoing edges in common area)
        for (const node of analysis.commonNodes) {
            const neighbors = this.getNeighbors(node);
            const commonNeighbors = Array.from(neighbors).filter(n => analysis.commonNodes.has(n));
            if (commonNeighbors.length > 1) {
                analysis.branchingPoints.push({
                    node,
                    branches: commonNeighbors.length
                });
            }
        }

        // Find convergence points (nodes with multiple incoming edges in common area)
        for (const node of analysis.commonNodes) {
            const predecessors = this.getPredecessors(node);
            const commonPredecessors = Array.from(predecessors).filter(p => analysis.commonNodes.has(p));
            if (commonPredecessors.length > 1) {
                analysis.convergencePoints.push({
                    node,
                    converging: commonPredecessors.length
                });
            }
        }

        // Calculate estimated path count directly here
        let estimatedPathCount = 1;
        for (const branchPoint of analysis.branchingPoints) {
            estimatedPathCount *= branchPoint.branches;
        }
        estimatedPathCount = Math.min(estimatedPathCount, 1000000); // Cap at reasonable number

        return {
            ...analysis,
            reachableCount: analysis.reachableNodes.size,
            reachingEndCount: analysis.nodesReachingEnd.size,
            commonCount: analysis.commonNodes.size,
            branchingCount: analysis.branchingPoints.length,
            convergenceCount: analysis.convergencePoints.length,
            estimatedPathCount: estimatedPathCount
        };
    }



    /**
     * Get assembly distribution across all paths
     * This requires integration with GenomicService to get assembly information
     * @param {Function} getAssemblyForNode - Function to get assembly for a node
     * @returns {Object} Assembly distribution analysis
     */
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
}

export default PangenomeGraph;
