# Placement study: sidebar outline vs bottom drawer vs workspace (2026-11-01)

9 simulated participants (Analyst Alex, Explorer Elena, a marketing analyst) x 3 placements, 5 tasks
each, one placement per participant, no presets. Grading from each session's reported final counts
against the correct answers (11, 12, 51, 42 with weak links dropped, any one category at 50k).

| Placement       | T1-T3, T5 | T4 (weak links dropped, core >= 3 = 42)              | Overwhelm (1 calm - 7) | Ease (1-7) |
| --------------- | --------- | ---------------------------------------------------- | ---------------------- | ---------- |
| Sidebar outline | 9/9       | 1/3 (two stopped at 48: never found the link filter) | 2, 3, 3                | 5, 5, 5    |
| Bottom drawer   | 9/9       | 3/3 (all found it on the Data tab)                   | 3, 3, 3                | 5, 5, 5    |
| Workspace       | 9/9       | 2/3 (one stopped at 48)                              | 3, 3, 3                | 5, 5, 5    |

Placement made no measurable difference to overwhelm or ease; T4's spread comes from whether a
participant wandered into the Data tab, not from the placement. Every session hit the same editor
problems, independent of placement:

1. Ignoring weak links (an edge condition that scopes an algorithm) is not reachable from the
   selection editor; 9/9 looked for it there; 3 never found the graph-wide Data filter; those who did
   could tell it applied only because a histogram's range changed.
2. A ticked checklist value jumps to the top and the list re-sorts under the cursor: 6/9 ticked the
   wrong value at least once.
3. No way to start over: clearing takes one "..." Delete per step; deleting group A re-shapes B and the
   next delete hits the wrong row (4/9).
4. Escape closes the whole editor, sometimes losing the reader's place (5/9).
5. Words guessed at: "Degree" for links, "Core number", "While ... has nodes" (3/9).
6. Smaller: an accidental click on "By position" silently switched a step to "top 10"; the "+" for a
   new style layer did nothing in the mock (a mock bug).

Designer panel (tmp/selection-redesign/study/panel.md): hybrid -- the sidebar keeps a calm read-only
outline at rest; Edit or a click on a row opens a NON-modal workspace over the canvas column (right
sidebar stays visible, no scrim, the graph never re-framed, Esc = Done, Cancel restores); one
workspace edits every rule (style selectors and Data filters, owner named in the title); drop the
drawer; size the workspace's columns to content.

Decision (main session, two-way door): adopt the panel's hybrid; the owner prefers the workspace and the
data shows a tie, so his preference and the panel's reasons decide; non-modal per the panel and NN/g.
