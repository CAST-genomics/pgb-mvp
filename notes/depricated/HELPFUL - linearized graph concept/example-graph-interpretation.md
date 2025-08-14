You’re right—thanks for the catch. In your sketch, **B’s arrows match the spine’s direction**, so it is **not** inversion-like. And you’re also right that a sketch alone doesn’t provide evidence that **A** or **C** are longer/shorter than the reference span; those judgments must come from the data (`altLenBp` vs `refLenBp`), not the picture.

Here’s a corrected write-up you can drop in as a markdown doc.

---

# Interpreting A, B, and C in a Linearized Pangenome Graph (Corrected)

*This note explains the three labeled detours in your sketch and maps each to fields returned by `linearizePangenome(...)`. It avoids inferring lengths from the drawing; all length-based labels come from data.*

## Core terms (as used by the function)

* **Spine (reference ribbon):** your chosen reference path (pink), laid out length-true at `y = 0`.
* **Detour / Bubble / Loop:** an alternative path that leaves the spine at a **left anchor** `L` and rejoins at a **right anchor** `R`. Each detour appears once in `loops[]`.
* **Key fields per detour**

  * `spanStart`, `spanEnd` – bp coordinates on the spine for the replaced interval (`spanStart = bpEnd(L)`, `spanEnd = bpStart(R)`).
  * `refLenBp = spanEnd − spanStart` – length of the replaced reference span.
  * `altLenBp` – total base-pair length along the detour.
  * `apex`, `lane` – screen/layout values for vertical placement (no genomic meaning).
  * *(optional)* `orientation` – whether the detour’s direction matches the spine over `L→R` (see below).

### Length-based classification (data-driven)

Do **not** infer from the sketch—compute from the graph:

* `lengthDeltaBp = altLenBp − refLenBp`
* With a small tolerance `ε` (absolute or relative), define

  * `insertion-like` if `lengthDeltaBp > +ε`
  * `deletion-like` if `lengthDeltaBp < −ε`
  * `neutral` if `|lengthDeltaBp| ≤ ε`

Typical choices: `ε = max(5 bp, 0.02 * refLenBp)`.

### Orientation classification (topology-driven)

If your IDs or edges encode orientation, set:

* `orientation: 'same' | 'reversed' | 'mixed'`

by comparing the detour’s net direction from `L` to `R` with the spine’s direction over the same anchors.

---

## A — Simple detour, **same orientation** (length: compute from data)

* **Description:** Leaves the spine at `L`, rejoins at `R`; arrows match the spine.
* **Fields:**
  `leftId=L`, `rightId=R`, `spanStart`, `spanEnd`, `refLenBp`, `altLenBp`, `orientation: 'same'`.
* **Class:** determine via `altLenBp` vs `refLenBp`:

  * `insertion-like` / `deletion-like` / `neutral` depending on `lengthDeltaBp` and `ε`.
* **Placement:** above/below can follow your convention (e.g., above for insertion-like, below for deletion-like).

## B — Simple detour, **same orientation** (not an inversion)

* **Description:** Detour between `L` and `R` whose arrows **match** the spine.
  *Earlier I misread this as inverted; correction: it is not.*
* **Fields:**
  `leftId=L`, `rightId=R`, `spanStart`, `spanEnd`, `refLenBp`, `altLenBp`, `orientation: 'same'`.
* **Class:** use the computed `lengthDeltaBp` to label as insertion-like, deletion-like, or neutral.

## C — Simple detour, **same orientation** (length: compute from data)

* **Description:** Another same-orientation detour from `L` to `R`.
* **Fields:**
  `leftId=L`, `rightId=R`, `spanStart`, `spanEnd`, `refLenBp`, `altLenBp`, `orientation: 'same'`.
* **Class:** again determined by `lengthDeltaBp` with tolerance `ε`.

---

## Quick reference table

| Label | Anchors | Orientation vs. spine | Length class (from data)                       | Function fields to inspect                                    |
| ----- | ------- | --------------------- | ---------------------------------------------- | ------------------------------------------------------------- |
| A     | `L→R`   | `same`                | `insertion-like` / `deletion-like` / `neutral` | `spanStart`, `spanEnd`, `refLenBp`, `altLenBp`, `orientation` |
| B     | `L→R`   | `same`                | `insertion-like` / `deletion-like` / `neutral` | same as above                                                 |
| C     | `L→R`   | `same`                | `insertion-like` / `deletion-like` / `neutral` | same as above                                                 |

---

## Practical notes

* **Don’t trust sketches for length.** Always compute `altLenBp` by summing `lengthBp` over the detour nodes, and compare to `refLenBp`.
* **Use a tolerance.** Small differences (and window clipping) can make `altLenBp` and `refLenBp` nearly equal; treat those as `neutral`.
* **Style separately from classification.** You can color by orientation (e.g., dashed if `reversed`) and place above/below by length class—two orthogonal signals.

If you want, I can add `orientation` and `lengthDeltaBp` (with an `epsilon` option) directly to the function output so your renderer can label and style these cases without extra bookkeeping.
