# Tier 5 round 1 scores

Build 1e123d7d33 (`.study-builds/tier5-r1d1-1e123d7d33`, the first line of `../../criteria.md`).
Scored 2026-11-03 from the 60 session grades (30 sessions and their 30 re-runs) and the four expert
walks in `expert/` (accessibility, Figma product designer, visual designer, screenshot audit).

## Result in one paragraph

**No session reached the app.** All 60 sessions are VOID for one cause: `real.mjs --start` refuses
every session of a round whose `plan.md` has no "Gate evidence" section, and `real.mjs --gate` was
never run on this round, so the section was never written. The re-runs were launched with the cause
still in place and failed the same way. Every bar that reads sessions (1, 2, 3, 8, Sam's part of 5,
the follow-up part of 9) is **not measured**, and none of them may be reported as held. What the
round did measure comes from the expert walks: bar 4 has **two severity 3 findings confirmed by an
expert plus a scripted repro** (not yet through the two skeptics), and bar 9 is **over its severity
2 allowance on confirmed findings** while its main check (the calm-first check on this build) did
not run. No bar holds on this round's evidence.

## Sessions

| | Count |
| --- | --- |
| Sessions graded | 60 (r1-s01 to r1-s30, r1-s01b to r1-s30b) |
| VOID | 60 |
| Valid pointer sessions | 0 |
| Valid keyboard sessions (Sam) | 0 |
| Run on Sonnet | 0 (every grade records Opus, claude-opus-5-5; Sonnet counted apart: none) |
| False "done" | 0 of 0 valid sessions (not a measurement) |
| Steps to grade | 0 (two sessions logged one step, the refused start) |
| Usable follow-up answers | 0 (every participant declined to rate a program it never saw) |

Grade files: 59 under `sessions/`; r1-s08's grade exists only as the grader's returned record (the
folder `sessions/r1-s08/` was not written). r1-s14's `grade.md` puts its grade on a bold line
(`**Grade: VOID**`), which `score.mjs` may not parse.

### Why every session is void

1. **The round gate never ran.** `plan.md` holds no "Gate evidence" section (grep: 0 matches), and
   `tool-dry-run-2.md` (items 5 and "What stands between the round and its first session") had
   already said `--start` would refuse every session until `real.mjs --gate` passes. Every
   participant's first `--start` exited 1 with `FAIL: ... plan.md holds no "Gate evidence" section`;
   later `--step` calls answered "No live session".
2. **The re-run rule did not look at the cause.** The plan re-runs a session with no `01.png` as
   `<id>b`. A cause shared by all 30 sessions should have stopped the round after the first refusal.
   The criteria allow one re-run per session; both runs are spent on a failure outside the
   participants and the build.

Graders' kind labels: three grades (r1-s22, r1-s23, r1-s16b) mark the refused start or the leak
check as `build-defect`. Neither is a defect of build 1e123d7d33; both are the study tool's.

## Bars

| # | Bar | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Task success | **Not measured** | 0 valid pointer sessions on every task half (T70, T71, T73, T74, T78: 0 of 4; T72, T75, T77, T79: 0 of 2) |
| 2 | False "done" | **Not measured** | 0 in 0 valid sessions is not a holding bar |
| 3 | Wrong turns | **Not measured** | no steps |
| 4 | Severity 3 and 4 open | **Failing, pending skeptics** | Two severity 3s confirmed by expert plus scripted repro (below); one more disputed between 2 and 3 |
| 5 | Keyboard | **Not measured** (two of three parts hold) | Sam's 2 sessions void. The accessibility walk found no keyboard block (every path finished by keys). The scripted walk on this build: 0 serious or critical axe findings on 36 screens at 1440 x 900 and 900 x 700, both themes (`tool-dry-run-2.md` section 6) |
| 6 | The owner's data rules | **Not measured** | No confirmed violation. Two of its feeds did not run this round: the content designer's word count and the interaction designer's walk. One candidate (below) |
| 7 | Figma and graphty consistency | **Not measured** | 0 confirmed severity 3 or 4; 2 confirmed severity 2 against an allowance of 5, but 8 unconfirmed severity 2 candidates from the Figma walk, and the interaction designer's walk did not run |
| 8 | Cost on core tasks | **Not measured** | no step logs |
| 9 | Calm-first (bar 9) | **Failing on confirmed findings; main check not run** | 4 confirmed severity 2 against an allowance of 3 (below). The calm-first check last ran on d3fda9f2b6 and skipped the reference picker and the 50,000-node screens; it has not run on 1e123d7d33. No follow-up answers |

With 0 sessions, "strong evidence when a bar fails, weak when it holds" does not apply: nothing in
this round is evidence about first use of the editor.

## Confirmed problems

"Confirmed" follows `../../criteria.md`: two sessions on different halves; a session or an expert
plus a scripted `real.mjs` repro; or an expert's screenshot-visible finding the screenshot audit also
shows. None has been through the two skeptics yet, so each is "confirmed, before skeptics".

### Severity 3 (bar 4)

1. **The screen reader hears a second count over another base.** While a workspace is open with a
   style layer selected in the inspector, every count change is spoken twice: the header's count,
   then the covered inspector row's count, which is often over a different base ("11 of 19 nodes"
   then "11 of 24 nodes" under a filter; in the filter host "15 of 24" then "4 of 24", a count no
   visible control shows). Expert: accessibility walk finding 1 (`expert/a11y/k1`); scripted repro:
   `expert/a11y/k2/28.png`; 38 earlier backlog rows say the same. Severity 3 is "a count over a base
   nobody can tell". Owner: graphty app (`WhichPicker.tsx` announces the inspector row's count while
   the workspace is open). Fix is one line: pass no announcement while a workspace is open.
2. **Clear then Escape throws away a new filter card with its steps, and Undo does not bring it
   back.** Clear puts focus in the reopened value picker; the next Escape says "Filter not added" and
   removes the card. Breaks two decided rules (Escape never discards work; Clear has an undo).
   Expert: accessibility walk finding 2 (`k1/75-78.png`, three steps lost); scripted repro
   `k2/07-09.png`. Owner: graphty app.

### Disputed severity (3 or 2)

3. **At 900 x 700 the workspace preview is a sliver.** The outline, step pane and properties column
   keep fixed widths, so the preview is 44 to 84 px wide and the matches strip shows one column with
   its search cut to "Se". Screenshot audit (rated 3: `engineer/style-900x700/03.png` to `12.png`,
   `filter-900x700/`, `big-900x700/`) and accessibility walk finding 7 (rated 2: `a11y/k3/06.png`).
   Confirmed as a defect; the severity goes to the skeptics. No session ran at 900 x 700 and
   `decided.md` settles only down to 1280 x 800. If 3, it is a third bar 4 failure.

### Severity 2 counted in bar 9 (allowance 3)

4. **The sidebar outline at rest breaks its column on Except.** "Except" starts at the title's edge
   and pushes its value 36 px right of the group's other rows; the workspace outline lines the same
   rows up. Visual walk 3 (`visual/v1/15.png`), Figma walk 7 (`figma/w1/50.png`), screenshot audit
   (`engineer/style-1200x900/13.png`, `filter-1200x900/13.png`), and the dry run's calm-first finding
   6. Bar 9 (smaller allowance than bar 7).
5. to 7. **Three screens over the words-at-rest budget** (50 app words): the style host's read-only
   outline at rest (57), the filter host's (66) and the 50,000-node outline (67), at both sizes and
   in both themes. Counted by the scripted walk on this build (`bars.mjs --tier 5`,
   `tool-dry-run-2.md` section 6). The criteria count "a screen over the budget" as one severity 2
   each. Read by mechanism (the outline rows' words) they are one or two findings, and bar 9 is then
   at its limit rather than over it, with two strong candidates still open (the blank band and the
   50,000-node waits, below).

### Severity 2 counted in bar 7 (allowance 5)

8. **One count in several number formats.** "37.5k of 50k" on the outline's title row beside
   "37,512" in the sidebar and "37,512 of 50,000" in the header; at rest "1,076 of 50,000" in the key
   and "1,076 of 50k" in the inspector. Screenshot audit (`engineer/big-1200x900/10.png` to `12.png`)
   and visual walk 16 (`visual/v3/12.png`, rated 1).
9. **The matches strip cuts its last column with no sign of more.** Screenshot audit (rated 2:
   `engineer/style-1200x900/03.png`, `big-1200x900/07.png`), visual walk 13 and Figma walk 13 (both
   rated 1; spec 3.0 says columns are "sized to their content").

### Severity 2, confirmed, gating nothing

10. **The chosen reference shows only its id.** A person who chose "v02 name James Carter" sees
    "v02" in the field and the outline row; the preview draws the reference like every other member.
    Screenshot audit (`engineer/style-1200x900/09.png`, `10.png`) and visual walk 6
    (`visual/v1/28.png`, `29.png`). Rises to 3 if a T73 session picks the wrong person unnoticed.
11. **At 900 x 700 the workspace title drops the rule's name** ("Which nodes -- L..."). Screenshot
    audit (`engineer/big-900x700/03.png`) and accessibility walk 7.

### Severity 1, confirmed

12. The value picker's list is cut mid-row under "Results" with no scrollbar (audit, visual 5 at 2,
    Figma 14).
13. The reference picker's group headers sit right of their items, unlike the attribute picker
    (audit, Figma 19).

### Study tool (must be fixed before the round restarts)

14. **The leak check voids clean sessions.** `real.mjs --leaks` reported a facilitator-file leak in
    every one of the 60 sessions; no participant opened any file outside its own folder. Mechanism:
    `leaksIn` (`tool/real.mjs` line 518) matches `FACILITATOR_FILE` and studio paths against every
    string in a tool call's input, including the body of a Write and of a heredoc. A participant who
    quotes the tool's own FAIL line ("plan.md holds no ...") into its transcript is voided. Seen in
    sessions on every task half. Fix: test only the paths a call opens (Read's `file_path`, a Bash
    command's file arguments outside its heredoc body, Write's target), never written content.
15. **Not a defect: files under `tmp/studio-sessions/`.** Many graders reported the session folder
    missing from the round's `sessions/`. `real.mjs` runs each participant in a scratch copy under
    `tmp/studio-sessions/` on purpose and `--end` copies it back; `--end` never ran because no
    session started. Grader instructions should say so.

## Candidates (not confirmed)

| Candidate | Severity | Source | What confirms it |
| --- | --- | --- | --- |
| A picker, once typed in, jumps up over its field and the header (Done, Cancel, Clear) | 2 (bar 7) | Figma 1 (both hosts, both pickers), visual 4; backlog from pilots | A replay of `figma/w1` to step 16, or the audit on a typed picker |
| A yes-or-no test drawn as a "Value..." dropdown, not a Yes \| No segment with counts | 2 (bar 7) | Figma 2 | The audit on `figma/w1/32.png` |
| The filter host's picker has no Results section; picking PageRank there starts a second run | 2 (bar 7) | Figma 3 | A scripted repro; needs the element to name which run a step reads |
| A colleague's two-step card rests as one row with no caret | 2 (bar 7) | Figma 4 | The audit; T77 sessions |
| An untouched range drawn filled end to end while it counts 0 | 2 (bar 7) | Figma 5 | The audit on `figma/w1/38.png` |
| By position has no "# / %" and no top / bottom | 2 (bar 7) | Figma 6 | A scripted repro |
| Clear renames a filter card "a selection" | 2 (bar 7) | Figma 8; backlog T77A.10 | The audit on `figma/w3/07.png` |
| A new card named by an instruction, "trained pick yes or no" | 2 (bar 6: a sentence at rest) | Figma 9; visual saw it (`visual/v1/20.png`) | The audit |
| The No match chit drawn as an unticked checkbox | 2 | visual 2, Figma 15 (rated 1) | The audit |
| A 210 to 240 px blank band where the hidden data table was | 2 (bar 9) | visual 1, Figma 10; four task halves start with the table open | The audit on a start with the table open (it walked none) |
| Waits over 10 s on the 50,000-node path: 6 of 74 scripted steps, longest 16.1 s opening the dept checklist; 10.6 s in a T79 A pilot | 2 each (bar 9) if the screen shows work but no progress | `tool-dry-run-2.md` section 6, `waits.mjs` | A reader of `big-1440x900/03.png` and the pilot screenshot |
| Tab past the workspace's last control goes to the status bar; Tab order not the drawn order | 2 | accessibility 3, 35 backlog rows | gates nothing (no block) |
| Reference picker: Tab leaves the list open and moves to Main menu; its search speaks no result count | 2 | accessibility 4, 5 | gates nothing (no block) |
| Edges where's radio moves focus on arrow | 2 | accessibility 6 | gates nothing (no block) |
| Control+A on 50,000 nodes selects 5,000 and says nothing | 2 | audit alone (cannot confirm by itself) | A scripted repro and a reading of the element's limit |
| A filtered project's drawing is cropped at the start | 2 | audit alone | A scripted repro; mechanism not traced (camera frame before or after the filter) |

The Figma walk's 8 bar 7 candidates exceed the allowance of 5 by themselves: if four of them confirm,
bar 7 fails.

## Candidate insights

Each is drawn from expert walks only; no participant has used the editor in this round.

1. **The editor draws one result as many counts.** Spoken twice over two bases (accessibility 1),
   printed in two number formats (audit, visual 16), the count the lightest thing in the header
   (visual 9), Edit replacing the count right after Done (Figma 12), and the dry run's two
   calm-first "two counts of one result". Evidence: the files above. The confirmed severity 3 is one
   instance; the pattern says count placement and format need one rule, not per-screen fixes.
2. **The reference picker is a second build of the picker.** It differs from the value picker in Tab
   behavior, spoken state, width, group headers and what Enter will pick (accessibility 4 and 5,
   visual 11, Figma 19, audit). One shared searchable combobox would close five findings. T73
   depends on it.
3. **A chosen reference cannot be checked.** The field shows a bare id and the preview does not mark
   the center (audit, visual 6). T73 is the task that would show whether people pick the wrong node.
4. **A filter card's name stops describing it.** Named after its first step and never refreshed
   (audit), renamed by Clear (Figma 8), named by an instruction before a value (Figma 9), resting as
   one row over two steps (Figma 4). T77 (changing a colleague's card) is where this would cost.
5. **The workspace has no layout below 1280 px wide.** Fixed side columns leave the preview a sliver
   at 900 x 700 (audit, accessibility 7). Its rationale is the preview, so the width rule belongs in
   `decided.md`.

## Measures

None of the round's measures (steps per half, first door, the T70 and T71 follow-up questions,
overwhelm, the weak-links door, finding Edit, the two "+", 50,000-node waits in sessions, algorithms
in the editor, fix coverage, one-domain evidence) has a single reading. Every placement-study fix is
"not re-tested".

## What the round needs before it runs again

1. Run `real.mjs --gate` on this round folder until it exits 0 and writes "Gate evidence" into
   `plan.md`. Item 8 of "Before the first session" (no half blocked, no known severity 3 open) is
   the studio's judgment and now includes findings 1 and 2 above, and the disputed finding 3.
2. Fix the leak check (finding 14), or every clean session that quotes a tool message is voided.
3. Make the runner check the gate before launching, and stop the round when the first refused start
   names a cause every session shares, instead of re-running each session into the same refusal.
4. Run the calm-first check on 1e123d7d33 over every screen it lists (the reference picker on 11 and
   50,000 nodes and the 50,000-node checklist included), and the content designer's and interaction
   designer's walks, so bars 6, 7 and 9 have their feeds.
5. Restart round 1 in full. The criteria allow one re-run per session, and both runs failed before
   the app was shown; a round in which nothing was measured should not count toward the cap of
   three rounds or toward "a round with no progress". That is the director's call, recorded with
   its reason.
