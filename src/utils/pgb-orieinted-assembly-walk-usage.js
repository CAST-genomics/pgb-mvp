

// Orientation is taken directly from the oriented edge you traverse
// ("85854-" means reverse-complement that node’s bases when you stitch sequences).

// The “prefer indegree = 1” rule avoids “skip” edges that jump over an intermediate
// node the same assembly actually uses. When there’s still a tie, we pick the neighbor
// that’s closest in the global topological order for stability.

// If a triple appears in multiple disjoint chains inside the locus,
// you’ll get multiple walks (array of arrays).
// In your IL7 slice, most triples yield a single end-to-end walk.

// assuming your JSON is loaded into `graph`
import {buildAssemblyWalks} from "./pgb-orieinted-assembly-walk.js"

const walksByTriple = buildAssemblyWalks(graph);

// Example: get GRCh38’s walk
const grchKey = "GRCh38||0||chr8";
const grchWalks = walksByTriple.get(grchKey); // usually a single walk
// -> [ [{name:"85853+", id:"85853", orient:"+"}, ...] ]

// Build the end-to-end sequence for that walk:
function revComp(dna) {
  const comp = { A:'T', T:'A', C:'G', G:'C', a:'t', t:'a', c:'g', g:'c' };
  let out = "";
  for (let i = dna.length - 1; i >= 0; i--) out += comp[dna[i]] ?? dna[i];
  return out;
}

function concatSequence(walk, sequences) {
  let seq = "";
  for (const step of walk) {
    const sPlus = sequences[`${step.id}+`] ?? sequences[step.id];
    seq += (step.orient === "+") ? sPlus : revComp(sPlus);
  }
  return seq;
}

// e.g.
const grchSeq = concatSequence(grchWalks[0], graph.sequence);
