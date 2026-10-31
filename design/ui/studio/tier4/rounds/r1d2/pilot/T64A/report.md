# T64 A pilot, targeted re-walk -- build a53beb7179

Task: on pantries + deliveries (start `pantries-joined.txt`), make the site's name the label, make
trips the weight with "Higher means" closer, then report what the program calls P05.

Verdict: REACHED by pointer and by keyboard. Answer on screen: **Harbor Market**. The data stayed the
task's own the whole way (13 nodes, 18 edges, pantries.csv and deliveries.csv).

## What was walked

Every route the fix pass touched belongs to another task (T61, T65, T66, T67, T68). None of them is
on this task's path, so this re-walk ran this task's own three walks on the frozen build a53beb7179,
each in its own session, by replaying the routes the previous walk on this build took. All three
matched at every check point and ended (exit 0).

- **Success path by pointer** (21 steps, `c-success`). Data > Fields > pantries.csv "+" > Label >
  site; deliveries.csv "+" > Weight > trips; Higher means > closer. The Graph place's find box with
  "P05" lists Harbor Market; clicking it opens the inspector titled Harbor Market (site Harbor
  Market, id P05), with the P05 row highlighted in the table.
  tmp/design-studio/tier4/r1d2/pilot/T64A/c-success/14.png. Enter, Tab and Escape in the Higher
  means list each did what a person expects: tmp/design-studio/tier4/r1d2/pilot/T64A/c-success/17.png
  to tmp/design-studio/tier4/r1d2/pilot/T64A/c-success/20.png.
- **Detours** (31 steps, `c-detours`, the same set every earlier pass walked):
  - A Style layer's Text set to site in place of the label, then find "P05".
    tmp/design-studio/tier4/r1d2/pilot/T64A/c-detours/07.png
  - The Analyze list searched for "weight", then Betweenness.
    tmp/design-studio/tier4/r1d2/pilot/T64A/c-detours/11.png,
    tmp/design-studio/tier4/r1d2/pilot/T64A/c-detours/17.png
  - The table header's Role menu: site as Label, trips as Weight, with "Higher means" left empty.
    Shortest path lists "trips (loaded, not read)" and starts on None.
    tmp/design-studio/tier4/r1d2/pilot/T64A/c-detours/27.png
  - Quick actions searched for "name" and "weight".
    tmp/design-studio/tier4/r1d2/pilot/T64A/c-detours/29.png,
    tmp/design-studio/tier4/r1d2/pilot/T64A/c-detours/30.png
  - Higher means set to closer afterwards: Shortest path lists "trips (closer, loaded, not read)"
    and starts on None, which is right for a closer weight.
    tmp/design-studio/tier4/r1d2/pilot/T64A/c-detours/32.png
- **Keyboard only** (77 steps, `c-keys`). Reached the end: the inspector shows Harbor Market for
  P05. tmp/design-studio/tier4/r1d2/pilot/T64A/c-keys/78.png. No recorded step left focus on the
  page body.

## Answer key against the screen

No mismatch. The success screens match answers.md: label site, weight trips with closer, find and
the inspector name P05 Harbor Market, and Shortest path on None for a closer weight.

## Defects (crash, block, or wrong graded result)

None.

## Skipped

None of this task's routes. The routes in the re-walk list belong to other tasks and are walked in
their own pilots.
