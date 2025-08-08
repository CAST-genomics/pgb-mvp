# Extending the Pangenome Browser: Frequency & Ancestry Modes

This document outlines a step-by-step plan to implement two new visualization modes in the PGB MVP:

1. **Frequency of Occurrence**: show how often each node appears across all loaded genomes.
2. **Ancestry (Phylogeny) View**: display evolutionary relationships between genomes and link them to graph paths.

---

## 1. Frequency of Occurrence Mode

### 1.1 Data Preparation

1. **Count per-node occurrences**

   - Traverse each genome’s path through the pangenome graph.
   - For each node, increment a counter whenever the node is visited by a genome.
   - Store an array or map: `nodeFrequency[nodeId] = count`.

2. **Normalize (optional)**

   - If desired, compute `frequencyFraction[nodeId] = count / totalGenomes` for percentage-based encoding.

3. **Aggregate summary**

   - Build a histogram of frequencies (e.g., how many nodes appear in 1 genome, 2 genomes, … N genomes) for a mini-chart.

### 1.2 Visual Encoding

1. **Heatmap Coloring**

   - Choose a single-color gradient (e.g., blue→red) or reuse your pink reference color, fading to white.
   - Map `frequencyFraction` to that gradient: low → pale, high → saturated.

2. **Node Thickness/Size**

   - Scale the pill‐shape thickness by `count` or `frequencyFraction`.
   - Define min/max thickness and interpolate linearly (or via a power scale).

3. **Tooltips & Labels**

   - On hover/tap: show exact `X / N genomes` and percentage.
   - (Optional) Add a static legend showing the color ramp and thickness scale.

4. **Filtering Controls**

   - Slider or input to hide nodes below a frequency threshold (e.g., hide singletons).
   - Update the graph in real time as the threshold changes.

### 1.3 UI Integration

1. **Mode Toggle**

   - Add a switch in the settings panel: `Show frequency mode`.
   - When toggled on, override per-genome path coloring with the frequency encoding and disable genome‐list highlights.

2. **Histogram Chart**

   - In the Genome Widget footer (or a new sidebar), display the histogram of node frequencies.
   - Use a simple `<canvas>` or SVG bar chart.

3. **State Management**

   - In your React/Redux (or equivalent), store `mode: 'reference' | 'frequency' | 'ancestry'`.
   - Recompute or reuse precomputed `nodeFrequency` on mount; only re-render visuals on mode change.

---

## 2. Ancestry (Phylogeny) View

### 2.1 Data Preparation

1. **Load or infer a phylogenetic tree**

   - **Option A**: Accept a Newick‐formatted tree file from the user.
   - **Option B**: Compute distances (e.g., Mash distances, ANI) between assemblies, then run UPGMA or Neighbor-Joining.

2. **Map genomes to tree leaves**

   - Parse the tree into a JavaScript structure:
     ```js
     interface TreeNode {
       name?: string;         // leaf name = genome ID
       children?: TreeNode[]; // internal branch
       length?: number;       // optional branch length
     }
     ```

3. **Assign clade IDs**

   - For grouping, annotate each leaf with a `cladeId` (e.g., major population or subfamily).

### 2.2 Visual Encoding

1. **Dendrogram Panel**

   - Render a vertical phylogeny on the side (SVG or Canvas).
   - Leaves line up with genome‐list entries; branch lengths reflect evolutionary distance (optional).

2. **Linked Highlighting**

   - Hovering a leaf → highlight the corresponding genome path in the graph.
   - Hovering a path → highlight the leaf on the dendrogram (e.g., bold text or colored dot).

3. **Clade Coloring**

   - Assign each clade a base tint; all genomes in that clade share the tint but with different saturations.
   - Provides visual grouping when many genomes are loaded.

4. **Collapse/Expand**

   - Allow collapsing subtrees to reduce clutter.
   - Clicking an internal node toggles its children’s visibility in the graph.

### 2.3 UI Integration

1. **Split Layout**

   - Add a resizable side panel for the phylogeny next to the main graph canvas.
   - Default width: \~25% of viewport; user can drag to resize.

2. **Mode Toggle**

   - In settings: `Show ancestry tree`.
   - When enabled, show the dendrogram panel and switch genome‐list to a flat mode or hide it.

3. **Lazy Loading & Performance**

   - Load tree JSON or compute distances only when ancestry mode is first activated.
   - Cache parsed tree in memory to avoid re-parsing on every toggle.

4. **Interactive Controls**

   - Buttons to expand/collapse all.
   - Search box to find a genome by name and auto‐scroll the tree.

---

## 3. Implementation Tips & Architecture

- **Renderer Abstraction**

  - Refactor your graph-rendering component to accept props:
    ```ts
    type Mode = 'reference' | 'frequency' | 'ancestry';
    <PangenomeGraph
      mode={mode}
      nodeFrequency={nodeFrequency}
      treeData={mode === 'ancestry' ? treeData : undefined}
      /* existing props... */
    />
    ```

- **State & Data Flow**

  - On genome load: compute `nodeFrequency` once and store in app state.
  - When user switches mode: re-render with new encoding rules, not re-fetch data.

- **Performance Considerations**

  - Use instanced rendering (three.js `InstancedMesh`) for large graphs.
  - Debounce UI inputs like sliders to avoid excessive re-renders.

- **Testing**

  - Create unit tests for `computeNodeFrequency(graph, walks)` and `parseNewickToTree(newick)` functions.
  - Add storybook stories (or equivalent) showcasing each mode on a fixed test graph.

---

By following this plan, you’ll add two powerful, orthogonal views—quantitative core‑vs‑variable profiling and evolutionary context—that greatly enhance the interpretability of your pangenome browser.

