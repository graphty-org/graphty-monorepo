# Design hypotheses: the order of filter steps

For the design team and session runners only. Do NOT include this file in the prompt that plays a
participant: a simulated user who knows the intended answer will find it, and the session proves
nothing. The task below never names a filter, a step, the chip, a component or a warning.

The screen is `screens/filter-chip.html`. Load it for a participant ONLY with `&bare` in the
address, so the page bar (whose state names describe the setup) and the notes below the screen
are hidden, and never with `&notes`:

- the planted case: `screens/filter-chip.html#after-removal&bare&closed`
- the comparison arm, the same without the warning glyph:
  `screens/filter-chip.html#after-removal&bare&closed&noglyph`

## The planted case, for the team

Les Miserables, 77 characters. Three filter steps, in this order: Filter out Valjean; Filter to the
largest component; Filter out Javert. The analyst meant the largest-component step to drop only
OldMan, the one isolated character. But it runs after Valjean is gone, and Valjean is what holds
the bishop's household and five minor characters (Labarre, Mme.deR, Isabeau, Gervais,
Scaufflaire) to the rest of the book. Without him, Myriel's household of 9 becomes a second piece
and the five become isolated, so "largest component" drops 15 (those 14 and OldMan). The chip
reads 60 of 77 where the analyst expected 74 (77, less Valjean, Javert and OldMan).

What the screen offers to find it, weakest first: the chip's total; the per-step count left after
each step (76, 61, 60); the row tooltip that names who a step took out ("Took out 15: Myriel,
Mlle.Baptistine, ..."); and a warning glyph on the largest-component row, whose tooltip says it
reads the graph step 1 left and would take out only 1 on the full graph. The glyph is a proposal
(framework-changes.md, "a step whose place changes its result carries a warning glyph").

## H1. A reader finds a step that is in the wrong place, unprompted

- **Belief:** with the per-step counts and the warning glyph, an analyst who is told only that the
  total looks wrong names the largest-component step as the cause, without turning steps off one
  by one.
- **Participants:** the Gephi holdout first (`study/personas/gephi-holdout.md`): she filters to
  the giant component as a routine step and expects chained filters to read their parent's output,
  so she is the most likely to know the mechanism and the most likely to call the cue noise. Then
  one participant who has never used a filter chain (`study/personas/explorer-elena.md`).
- **Task (say exactly this):** "Your boss expected about 75 characters in this picture. Find out
  why there are 60." Nothing else. Do not point at the left panel.
- **Time box:** 3 minutes from the task being read.
- **Passes if:** within the time box, the participant names the largest-component step (in any
  words: "the component one", "step 2") as the cause, and says why (it ran after Valjean was taken
  out), without first turning every step off in turn. Turning one step off to confirm a named
  suspect is allowed.
- **Fails if:** the participant does not open the steps, blames Valjean's or Javert's step, reaches
  the answer only by turning each step off and watching the total, or says the glyph means
  something is broken rather than that the step's place matters.
- **Record:** the first place they looked; whether they opened the steps; whether they hovered the
  glyph or a row, and what they read aloud; the words they used for the cause; the time to naming
  it; whether they then moved the step or turned it off, and what the chip said after.
- **Comparison arm (only if H1 fails):** the same task on the comparison-arm address above, to learn
  whether the counts alone carry it. If both fail, the next iteration tests a row that says in
  words what it reads ("reads the graph after step 1"), see the open question in
  `study/insights/open-design-questions.md`.

## H2. The two numbers people want are "left" and "taken out"

- **Belief:** one number per row, the count left after the step, is enough; what the step took out
  belongs in the row's tooltip.
- **Task (after H1, with the planted case still open):** "What does the 61 on the second row mean?" Then:
  "How many did that step remove?"
- **Holds if:** at least four in five answer the first ("61 left after that step") without
  hovering, and answer the second by subtracting or by the tooltip. If most read 61 as the number
  removed, the row gains a quiet column label above the list ("left") before anything else is
  tried.
