# Extending PGB-MVP: Frequency & Ancestry Views

This document outlines a step-by-step implementation plan for adding two new visualization modes to your Pangenome Browser (PGB-MVP):

1. **Frequency of Occurrence** — color/size nodes by how many genomes traverse them  
2. **Ancestry View** — display a phylogenetic tree alongside the graph and link genome paths to their clades

---

## 1. Frequency of Occurrence Mode

### 1.1 Data Preparation

1. **Graph Traversal**  
   - After loading all genomes, walk each genome’s path through the pangenome graph.  
   - Maintain a per-node counter:  
     ```js
     // pseudocode
     const freqMap = new Map<NodeID, number>();
     genomes.forEach(genome => {
       genome.path.forEach(nodeID => {
         freqMap.set(nodeID, (freqMap.get(nodeID) || 0) + 1);
       });
     });
     ```
2. **Normalization (optional)**  
   - Compute `maxFreq = genomes.length`.  
   - For each node, store a normalized value in `[0,1]`:  
     ```js
     const normFreqMap = new Map();
     freqMap.forEach((count, nodeID) => {
       normFreqMap.set(nodeID, count / maxFreq);
     });
     ```

### 1.2 Visual Encoding

1. **Color Heatmap**  
   - Map normalized frequency to a color scale (e.g. light → dark).  
   - Example using d3-scale:  
     ```js
     const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
                          .domain([0, 1]);  // 0 = rare, 1 = core
     ```
2. **Node Thickness**  
   - Scale pill-shape width by `minWidth + normFreq * extraWidth`.  
   - E.g.:  
     ```js
     const width = BASE_WIDTH + normFreqMap.get(nodeID) * WIDTH_DELTA;
     ```
3. **Tooltip Details**  
   - On hover, display:  
     ```
     Node: 0xABC123  
     Present in: 45 / 100 genomes (45%)
     ```

### 1.3 UI Integration

1. **Mode Toggle**  
   - Add a “Show frequency” checkbox or radio button in your settings panel.  
2. **Render Logic**  
   - In your graph-drawing routine, conditionally:  
     - If `freqMode` is active → use `colorScale(normFreq)` & scaled width.  
     - Else → use per-genome colors as before.  
3. **Distribution Histogram (optional)**  
   - Compute histogram of `freqMap.values()` and render a small bar chart beneath the list of genomes.  
   - Helps users pick cutoff thresholds.

---

## 2. Ancestry (Phylogeny) Mode

### 2.1 Data Preparation

1. **Obtain or Infer Phylogeny**  
   - **External Newick/JSON**: allow user to upload a Newick tree or JSON representation.  
   - **On-the-fly**: compute pairwise distances (e.g. via mash sketches or ANI), then run Neighbor-Joining or UPGMA in a web worker.  
2. **Assign Clade Labels**  
   - Traverse the tree structure to tag each leaf (genome) with its clade/path in the tree.  
   - Example leaf object:  
     ```js
     {
       id: "HG02027",
       cladePath: ["PopulationA", "SubcladeB", "HG02027"]
     }
     ```

### 2.2 Visual Encoding

1. **Dendrogram Panel**  
   - Use a lightweight tree library (e.g. [d3-hierarchy](https://github.com/d3/d3-hierarchy)) to render a vertical collapsible tree.  
   - Branch lengths correspond to evolutionary distance.
2. **Clade-based Coloring**  
   - Choose a distinct color for each major clade; all genomes in that clade share a tint.  
   - Use a categorical palette (e.g. d3.schemeCategory10).
3. **Linking & Brushing**  
   - **Hover Leaf → Highlight Path**: when hovering a leaf in the tree, increase the opacity or stroke width of that genome’s traversal in the graph.  
   - **Hover Path → Highlight Leaf**: likewise, hovering the colored graph path highlights the corresponding leaf node in the tree.

### 2.3 UI Integration

1. **Layout Adjustment**  
   - Switch from single-canvas view to split view:  
     ```
     ┌─────────────┐┌─────────────────────────┐
     │ Phylogeny   ││ Pangenome Graph Canvas │
     └─────────────┘└─────────────────────────┘
     ```
   - Make the phylogeny panel resizable/collapsible.
2. **Mode Toggle**  
   - Add “Show ancestry tree” option in settings.  
   - Lazy-load the phylogeny data or compute distances only once on activation.
3. **Controls**  
   - Tree controls: collapse/expand all, search leaves by sample ID.  
   - Coloring controls: assign or adjust clade tinctures.

---

## 3. General Integration Strategy

1. **Modular Renderer**  
   - Refactor your graph component to accept a `viewMode` prop:  
     ```ts
     type ViewMode = "reference" | "frequency" | "ancestry";
     ```
2. **Precompute Metrics**  
   - On genome load/update, compute `freqMap` and (optionally) distance matrix/tree.  
3. **Central Settings State**  
   - Extend your global settings store with two new flags:  
     ```ts
     interface Settings {
       viewMode: ViewMode;
       frequencyMode: boolean;
       ancestryMode: boolean;
       …
     }
     ```
4. **Performance Considerations**  
   - For large genome sets, offload distance computation to a Web Worker.  
   - Use React’s `useMemo` or equivalent to cache frequency and tree computations.  
5. **User Feedback**  
   - Display spinners or progress bars when computing phylogeny.  
   - Provide brief tooltips explaining each mode.

---

## 4. Next Steps & Milestones

1. **Milestone 1**: Implement frequency counting, coloring, and UI toggle.  
2. **Milestone 2**: Build histogram preview and node-size scaling.  
3. **Milestone 3**: Integrate external Newick input and render tree panel.  
4. **Milestone 4**: Implement brushing between tree and graph.  
5. **Milestone 5**: Polish UI: add collapse/resize, legends, and performance optimizations.

With this roadmap in place, you can incrementally introduce powerful new perspectives—quantitative (frequency) and evolutionary (ancestry)—without disrupting your existing codebase. Good luck! 🚀  
