# Adding Two New Views to Your Pangenome Browser

Below you’ll find two self-contained “modes” you can add to your app. All of the steps are written without specialist biology terms—just straightforward data steps, visuals, and UI changes.

---

## 1. Frequency-of-Occurrence Mode

### 1.1 Data Preparation
1. **Walk the graph**  
   - For each segment (node), look at every genome’s path.  
   - Count how many genomes actually go through that segment.  
2. **Store the count**  
   - Save an integer on each node:  
     ```js
     node.frequency = numberOfGenomesVisitingThisNode
     ```
3. **(Optional) Convert to percentage**  
   -  
     ```js
     node.frequencyPct = node.frequency / totalGenomes * 100
     ```

### 1.2 Visual Design
- **Color intensity**  
  - Light color = rare (few genomes use it)  
  - Strong color = common (most genomes use it)  
- **Thickness**  
  - Thin bar = rare  
  - Thick bar = common  
- **Hover tooltip**  
  - Show “Used by X of Y genomes” when you mouse-over a node.

### 1.3 User Interface
1. **Mode switch**  
   - Add a checkbox or button: “Show frequency heatmap.”  
2. **Legend or slider**  
   - Show a small histogram or gradient bar explaining light→dark or thin→thick.  
3. **Filtering**  
   - (Optional) Let the user hide nodes used by less than K genomes via a slider.

---

## 2. “Who’s Related to Whom?” Mode

> **Goal:** Give users a simple way to see which genomes are most similar to each other, and highlight those groups on the graph.

### 2.1 Data Preparation (Finding Similarity)
1. **Measure pairwise similarity**  
   - For every pair of genomes, compare their paths through the graph.  
   - Count how many nodes they share, or how many nodes differ.  
2. **Build groups**  
   - Sort the genomes so that the most-alike ones end up next to each other.  
   - You can use a simple “greedy” approach:  
     1. Pick any genome as your starting point.  
     2. Find the genome that shares the most nodes with it → that’s your next neighbor.  
     3. From that neighbor, find the next most similar genome not yet in the list → and so on.  

### 2.2 Visual Design
- **Side panel “family list”**  
  - Show genomes in order, top to bottom, from most similar to least.  
- **Color bands by group**  
  - Give each contiguous block of similar genomes a lightly tinted background in the side panel.  
  - On the graph itself, tint each genome’s path with that same group color (e.g. all members of “Group A” get a pale green overlay).
- **Interactive highlighting**  
  - Hover over a genome in the side panel → emphasize that path in the graph (bold outline or full-opacity tint).  
  - Hover over a path in the graph → scroll the side panel to its entry and highlight it there.

### 2.3 User Interface
1. **Mode switch**  
   - Add a toggle: “Show similarity groups.”  
2. **Resizable side panel**  
   - Let users drag to widen or shrink the panel that lists genomes.  
3. **Collapse/expand groups** (optional)  
   - If you detect a tight cluster of 5–10 very similar genomes, allow the user to collapse them under a single header like “Group A (5 samples).”  

---

## 3. Putting It All Together

1. **Modularize rendering**  
   - Have your graph component accept a prop or state flag:  
     ```js
     <GraphView mode="frequency" /> 
     // or 
     <GraphView mode="similarity" />
     ```
2. **Precompute metrics**  
   - Whenever you load or change the set of genomes, recompute each node’s `frequency` and the genome-ordering list for similarity.  
3. **Extend settings panel**  
   - Add two new controls:  
     - [ ] Show frequency heatmap  
     - [ ] Show similarity groups  
4. **Lazy computation**  
   - Compute the similarity ordering only when the user first enables “similarity” to keep initial load fast.

With these steps in place, your users will be able to switch between:
- **Frequency view** to see which segments are “core” (in almost every sample) vs. “rare.”  
- **Similarity view** to explore which genomes are closest to one another and to highlight their paths in the graph.  

Let me know if you’d like concrete code snippets or example screenshots next!
