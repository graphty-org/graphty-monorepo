# T61 B pilot, targeted re-walk on build a53beb7179: not walked

Build a53beb7179 (frozen, served from .study-builds/tier4-r1d3-a53beb7179). No walk of this task ran
on this build: every replay waited for a browser slot (all eight machine-wide slots were held by
other sessions) and was stopped before it started, so there are no screenshots and no findings for
this pass.

Queued, and still to walk, each by --replay of the newest earlier walk under
tmp/design-studio/tier4/r1d2/pilot/T61B/ into tmp/design-studio/tier4/r1d3/pilot/T61B/:

- g1-success (success path by pointer, on to Edges > With issues)
- p1-success, s1-success, w1-success (the same success path; diverged on the flows.csv row hover)
- d1-menu-open (main menu, Replace, Cancel and Undo; diverged on the second "Undo")
- w2-menu-open (the reverse order; diverged on the ambiguous "Undo")
- p2-menu (Quick actions > Add data...; diverged when it opened the file chooser at once)
- g6-keys (keyboard only, screen-reader mode)

Already matched to the end on this build, so the earlier findings stand: d2-drop, k1-keys, p3-drop,
p4-keys, w3-drop, w4-keys, w5-keys-sr (see rounds/r1d2/pilot/T61B/report.md).

None of the routes the fix pass touched (T64, T65, T66 and T68 routes) belongs to this task.
