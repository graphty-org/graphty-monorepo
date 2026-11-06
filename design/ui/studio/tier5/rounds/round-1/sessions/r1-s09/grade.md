# Grade: session r1-s09 (task T73A, Grace, returning)

Grade: P
False done: no
Wrong turns: 4
Steps: 32 (counted by `tool/steps.mjs` from `route.jsonl`; the answer key's path for T73 A is 12, so 20 over)
Overwhelm: 4 (least sure: the start page after Discard, screenshots 11 to 16 -- "Open a file", the demo graph, the Sample library, no Recent projects list, and the mouse wheel not scrolling the page; just after a "Discard unsaved changes?" box that disagreed with "Autosave: saved")
Participant model: opus (claude-opus-5-5 in both transcripts; not sonnet)
Leaks: none (`leaks.json`, 52 calls checked, 2 transcripts)
Build: 1e123d7d33 (`session.json`), setup ran clean (`setupOk: true`)
Tool refusal: none (step 11's exit code 1 is a blocked sample thumbnail request on the start page, `venice-transit.webp`, ERR_BLOCKED_BY_ORB; the step ran and its screenshot is right)

## The last screen and the records

Screenshot 24 and the end-state records hold the right set, made the way the answer key grades as
part of the task:

- Style layer "16 nodes", count 16. `styles.json`: selector `match: "ids"` with v01-v10, v13-v17
  and v21 -- exactly the key's 16 of 24 -- and `node.color` #FFA500 (orange). The Which nodes row
  reads "Picked by hand: 16 nodes", not a "Within 2 hops of v02" step.
- The canvas key reads "Color: 16 nodes, 16 of 24 nodes"; `key.json` counts 16 nodes drawn
  #ffa500 and 8 drawn #6366f1 (the defaults, since the start's PageRank layer is gone).
- Reported: "16 people are in orange: James Carter plus the 15 people within two steps of him".
  The count is right and the screen shows it, so the claim is not a false "done".
- Side effect: `work.json` and `styles.json` show the start's PageRank run and its layer gone. The
  participant discarded the project at step 10 and reopened the raw file at step 16; the task did
  not ask for that and her earlier coloring was lost.

Why P and not S: the answer key's "Not success" list names this route -- Neighborhood, Hops 2,
then New layer from selection -- as P ("a layer made from that selection is the same P"). The
layer is a fixed list of ids; it does not hold "within 2 hops of James Carter".

## Path and wrong turns

First pass (steps 1-5): find box "James Carter", click v02, Node actions, Neighborhood, Hops 2
("v02 and 15 connections", 16 selected). Detour (steps 6-15): Data, the source chip, Main menu,
Back to start, Discard, wheel, End, Home + PageDown, Open a file, Escape. Second pass (steps
16-23): Open a file + upload volunteers.graphml, find + Neighborhood (one batch), Hops 2, the
actions menu, New layer from selection, Fill +, click the color box, type "orange" + Enter.

Wrong turns, each left the path and was abandoned:

1. Data place and the source chip, looking for what a line means (steps 6-7).
2. Main menu > Back to start > Discard, leaving the project to look for a "newer copy" (steps 8-10);
   it threw away the first pass and the PageRank coloring.
3. Hunting the start page for Recent projects by wheel, End, Home and PageDown (steps 11-13).
4. Open a file, then Escape with nothing chosen (steps 14-15).

## Problems

1. Severity 3, behavior (study setup, not the build) -- the briefing tells Grace she saved the
   project and reopens it from Recent projects, and that a newer copy of the list counting shifts
   exists, but the T73 A setup (`session.json`: open file, run PageRank) saves nothing, so the
   start page has no Recent projects and the newer copy is nowhere. Steps 7-15, screenshots 07-16.
   This drove the whole 10-step detour, the discarded project, and the least-sure moment.
2. Severity 2, build-defect -- the start page does not scroll when the mouse wheel turns over the
   hero's left column below the Open-a-file card. Step 11, screenshots 11-12: wheel at 300,700,
   the page did not move. Reproduced on the frozen build:
   `../../repro/r1-s09/repro.sh` -- the wheel at 300,700 leaves the page at the top (02.png), the
   same wheel at 300,300 scrolls to the Sample library (03.png).
3. Severity 2, wording -- "Discard unsaved changes? volunteers has changes that are not saved"
   shows while the status bar reads "Autosave: saved". Step 9, screenshot 10. A person who "reads
   every word on a confirmation" cannot tell whether her work is safe; she pressed Discard and
   lost the PageRank coloring.
4. Severity 2, behavior -- the canvas route to "everyone within 2 hops" ends in a hand-picked id
   list, and nothing offers to keep it as a rule. Step 20, screenshot 21: toast "Made a layer for
   the 16 selected nodes" and "Picked by hand: 16 nodes". The Neighborhood panel (screenshot 19)
   knows the center and the hop count; the layer forgets both, and the person never learns that
   Which nodes has "Within hops of".
5. Severity 2, behavior -- the just-added Fill color box gives no cue of what it accepts. Step 22,
   screenshot 23: a click on "Node color, not set" shows only a text cursor, no swatches and no
   placeholder. She guessed "orange" (step 23).
6. Severity 1, wording -- the Neighborhood panel lists neighbors by id (v01, v03...), not by name,
   though the find box matched James by name (screenshots 05, 06, 19).
7. Severity 1, wording -- "Hops" read as jargon; she guessed it means steps away (screenshot 05).
8. Severity 1, behavior -- the start's PageRank colors run orange to brown, so "in orange" was
   ambiguous on the first screen (screenshot 01). Known in the answer key ("count from the key,
   not the picture").
