# Open design questions

Questions the mocks raised that the design does not yet answer, each with how bad it would be to
ship as is and what the study should try next. A question leaves this file when a session result
or an owner's decision settles it; the settling line says which.

## A step's result depends on where it sits, and the design signals that only with numbers

- **Seen in:** `screens/filter-chip.html`, state "Component step after a removal".
- **Severity:** major. The failure is silent and changes every number on screen: a largest
  component step placed after "Filter out Valjean" drops 15 characters instead of 1, and the chip
  still reads like a sensible total (60 of 77). A reader who does not suspect the order has no
  reason to open the steps.
- **What the design gives today:** the chip's total; the count left after each step (76, 61, 60);
  a row tooltip naming who each step took out. The mock adds a proposed warning glyph on a step
  whose result differs from what it would take out of the full graph.
- **Why numbers alone are weak:** a drop from 76 to 61 is only a clue to a reader who already
  expected a different number, and the tooltip needs a hover the reader has no reason to make.
- **To try next, in order:** (1) the glyph as proposed, tested by H1 in
  `study/hypotheses/filter-step-order.md`; (2) if it fails, a row whose text says what it reads
  ("Largest component, after step 1"), always, not only when the result differs; (3) if that
  fails, a note in the chip itself ("1 step reads another's result").
- **Not settled by:** the mock. Nothing here is evidence until a session that was not told what to
  look for passes H1.
