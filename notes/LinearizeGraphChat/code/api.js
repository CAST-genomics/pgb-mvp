/**
 * Analyze a graph around a chosen spine walk and describe genomic features.
 *
 * @param {Object} graph   // from createGraph(json)
 * @param {Object} spine   // from createAssemblyWalk(graph, "GRCh38" | key, {mode:"auto"})
 *                          // use spine.paths[0] for the window’s chain
 * @param {Object} opts
 *   {
 *     locusStartBp?: number,     // bp at x=0 for this window (default 0)
 *     epsilonBp?: number,        // tolerance when comparing lengths (default 5)
 *     kPaths?: number            // # disjoint alt paths to sample per event (default 3)
 *   }
 *
 * @return {
 *   spine: {
 *     assemblyKey,
 *     nodes: [{ id, bpStart, bpEnd, lenBp }],
 *     edges: string[],                   // your edge keys, consecutive along the walk
 *     lengthBp: number
 *   },
 *   events: Array<{
 *     id: string,                        // `${L}~${R}`
 *     type: "pill"|"simple_bubble"|"parallel_bundle"|"braid",
 *     anchors: { leftId, rightId, spanStart, spanEnd, refLenBp },
 *     paths: Array<{ nodes:string[], edges:string[], altLenBp:number }>, // up to kPaths
 *     stats: { nPaths:number, minAltLenBp:number, maxAltLenBp:number },
 *     relations: {                       // filled after interval analysis
 *       parentId: string|null,
 *       childrenIds: string[],
 *       overlapGroup: number|null,       // siblings/overlaps (neither contains the other)
 *       sameAnchorGroup: number|null     // parallel detours with same L,R
 *     }
 *   }
 * }
 */
