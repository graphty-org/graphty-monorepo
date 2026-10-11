# Grade: session r4-s14 -- Ruth (tier 1 graduate), Florentine families (T18 B), the fewest families in between

**Grade: S** (success). The main prompt's answer, Strozzi, Ridolfi, Medici, Salviati, Pazzi (4
marriages, 3 families in between), is the key's chain, read off the path run's Values tab:
"Path 5 nodes, 4 edges" and "Nodes in order" Strozzi 1, Ridolfi 2, Medici 3, Salviati 4, Pazzi 5,
with Made with From "Strozzi", To "Pazzi", Weight "None", "Each edge counts as 1." (`11.png`,
still on screen in `12.png`). No detour: Ruth went from the Analyze list straight to Shortest path
and ran it once. The follow-up's answer, Peruzzi, Bischeri, Guadagni, Albizzi, Ginori, also
matches the key, read off the same tab after the second run (`17.png`, and the last screenshot
`18.png`: "Path 5 nodes, 4 edges", Peruzzi 1 to Ginori 5, From "Peruzzi", To "Ginori", Ran "Oct 11,
3:10:18 AM").

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `florentine-ranked.txt` (PageRank run, nodes colored and
sized by PageRank, no names drawn, the run's Style tab open). Tool commit `435e878a1d4c`, no
uncommitted changes. `setup.log` and `session.log` are empty: no script, console or request errors.

## The answer against the key

- **Main chain (right).** `11.png` as above. The drawing shows five black nodes and four black
  ties on the orange drawing; Ruth read the chain from the panel, not the drawing (no names are
  drawn).
- **Count (right).** "Three families in between ... 4 marriages", which the key accepts.
- **Follow-up chain (right).** `17.png`, `18.png` as above. The first chain is gone from the
  drawing and the left list still holds one "Shortest path 4 hops" row, as the key describes.
- **Traps not taken.** The Peruzzi-Bischeri tie drawn through Castellani (about 713,604 in the key;
  in `17.png` the black tie from about 697,715 up to 720,557 passes the orange node at 713,604):
  Ruth did not name Castellani. She did not read a black path node as off the PageRank gradient.
- **Checks Ruth made, all true on screen.** Pazzi's only tie is Salviati -- Pazzi (`12.png`);
  Ridolfi's ties include Medici -- Ridolfi and Strozzi -- Ridolfi (`13.png`); Albizzi's ties
  include Albizzi -- Ginori and Albizzi -- Guadagni (`18.png`).
- **Work kept.** `work.json`: the start's PageRank run and its three layers are still there at the
  end, with the path run and its two layers added; `gone` is empty.

## Measures

- **Route:** find box (Strozzi's ties, to see whether Strozzi and Pazzi were married), a hover on
  the toolbar's flask ("Analyze Shift+A"), Analyze, typed "path" in its filter, Shortest path,
  From Strozzi with Enter, To Pazzi with Enter, Find path. The `p` shortcut and the node menu's
  "Path between..." were not used.
- **Steps (main prompt):** 10 `real.mjs` steps after the start to the answer (`02.png` to
  `11.png`), then 2 checking steps (`12.png`, `13.png`). The success path counts 4; 10 is 2.5x
  (bar 11 is judged on the median of successful sessions, not on one session). The extra cost is
  typing and picking as separate steps (the key's own pilot needed 5 screenshots for 4 counted
  steps), the hover, the filter typing and the opening find-box look.
- **Steps (follow-up):** 4 to the answer (`14.png` to `17.png`: Analyze, Shortest path from
  Recent, Peruzzi Enter Ginori, Enter and Find path), 5 with the Albizzi check (`18.png`). Within
  the follow-up target (success path + 1). 0 wrong turns.
- **Wrong turns:** 0. The opening find-box search for Strozzi was a deliberate look at Strozzi's
  ties ("None of them is Pazzi, so the message needs at least one stop in between"), and that
  place does lead on (the node's menu holds "Path between..."), so it is not a broken habit. The
  flask hover changed nothing and is exploration.
- **False "done":** none. "Ending" after step 13 and "Done" after step 19 both follow a right,
  on-screen answer. truth-on-screen holds: every tie Ruth said she checked is listed on the screen
  she cites. Her remark that she "can't confirm from the screen whether the first run is kept" is
  accurate: nothing on screen shows the first chain after the second run.
- **Silent commit:** none. Find path changed the drawing (black path), the left list (new
  "Shortest path 4 hops" row), the legend ("Shortest path") and the inspector (`10.png` to
  `11.png`); the second run redrew the path and changed the inspector's values and Ran time
  (`16.png` to `17.png`).
- **Numbers that disagree:** none. "5 nodes, 4 edges" and "4 hops" agree with the five black nodes
  and four black ties on both runs.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, the tool named what
  each pointer action hit, and `leaks.json` shows no leaks over 43 calls.
- **Scripted exit:** not applicable; Ruth finished both prompts.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                         | Evidence                                                                                                                                         |
| --- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 2        | lost work       | A second shortest-path run replaces the first: the first chain disappears from the drawing and the inspector, and the left list keeps a single "Shortest path 4 hops" row that now means a different chain. Nothing says the first was replaced. Ruth had written the first chain down, so it cost nothing today, but she wanted both kept side by side, each named by its ends. | `11.png` against `17.png` (one "Shortest path 4 hops" row in both, different chains); transcript step 18 and verdict ("one row that silently changes meaning") |
| 2   | 1        | missing fact    | The run does not say whether the chain is the only one of that length or one of several. Ruth worked it out by hand from Pazzi's and Ginori's single ties and said an editor will ask "is that the only route?". (On this data both chains are the only ones, per the key.) | `11.png`, `17.png` (no such fact in Summary or Made with); transcript verdict                                                                    |
| 3   | 1        | discoverability | The Analyze list opens on ranking analyses; Shortest path sits under a later heading, and Ruth had to type "path" in the filter to reach it. It cost one step and no wrong turn.                                                                                     | `04.png` (Rank nodes and edges first), `05.png` (after filtering "path")                                                                         |
| 4   | 1        | visual          | No names are drawn, so the black path on the drawing can only be read through the panel; a tie of the follow-up chain passes straight through Castellani, a node not on the path. Ruth was not misled.                                                          | `11.png`, `17.png`, `18.png` (Peruzzi-Bischeri tie through the node at about 713,604); transcript verdict ("no names on the dots")               |

Every problem here rests on this one participant and is not confirmed by this session alone;
problem 1 and the Castellani overlap are both already described in the answer key as known on this
build.
