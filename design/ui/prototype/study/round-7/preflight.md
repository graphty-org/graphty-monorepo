# Round 7 preflight: FAILED

Checked on 2026-09-29, from `design/ui/prototype/`, before any session, first click or tree-test
session ran. The round does not start until every item below passes on a fresh preflight.

## Result by check

| # | Check | Result |
|---:|---|---|
| 1 | Fresh round folder (no sessions/, tree-test/, first-click/, focus-groups/) | Pass. The folder holds gate.md, tree.md and tree-test.md only. |
| 2 | Every task screen exists and has a render in shots/tasks/<task>/ newer than the page | Pass. All 124 task-screen pairs of the 46 tasks exist under screens/ and each has a newer matching render. |
| 3 | tree.md matches the navigation and holds only the outline | **Fail.** See "Why it failed", item 1. |
| 4 | Every first-click screen exists | Pass. All 8 PNGs under shots/ exist. |
| 5 | The core task set is present | Pass. Top tasks 1 to 12 and the three bookends each have at least one task; the first-use moments (first launch and the usage-data question, a blank project, a first file, a file that will not read, a file too big for the tab, an empty result, a failed save, the Assistant, no WebGPU, a colleague's recipe) each have a task or a first-click prompt. |
| 6 | Decided changes not landed | Pass. The apply-a-recipe answer key now accepts File > Open... and Add a source (tree task 4, first-click prompt 5), and the page half is drawn. The team-colors-file task, which depends on it on another dataset, is flagged and left out of the ease bar. |
| 7 | Every persona has a file | Pass. All 16 exist in study/personas/. |
| 8 | No task scenario names the answer | **Fail.** See "Why it failed", item 2. |
| 9 | Kit commands | **Fail.** `node kit/check.mjs --all` exits 1 on 30 stale shots. See item 3. |

## Why it failed

1. **The tree hands task 1 its answer.** Tree task 1 asks "Where do you see how Valjean scored and
   where he places?". The only place the word Valjean appears in tree.md is a correct answer for
   that task: `The selected node's line ("Valjean: #3 of 77, show in table")` under Results > An
   opened run. A participant can match the name without understanding the tree, so the new key for
   task 1 would be inflated, and it is the key that decides the pass. The drawn screen
   (screens/results-panel.html) says "Valjean: #1 of 77", so the example also disagrees with the
   screen. Fix: give the line a neutral example that no task names, for instance
   `("<the selected node>: #N of 77, show in table")`.
   The tree otherwise matches the navigation as drawn plus the round-6 decisions; its known
   differences from screens/navigation.html (Preferences union, Usage data, the frame-at-rest right
   panel) are listed in tree-test.md and are accepted. The other shared words (task 7's "hidden
   where they overlap", task 3's "bigger") repeat round 6's tree and wording and keep the rounds
   comparable.
2. **First-click prompt 13 names its targets.** "You want the characters who are among Valjean's
   friends and were also at the barricade" matches the two row labels it is scored on, "Friends of
   Valjean" and "The barricade", word for word. That is the task-words-match-screen-words pattern
   the decision log of 2026-09-29 says task wording must never use. Fix: describe the two lists
   without their names (for example "the two lists of characters you kept earlier; you want only
   the ones on both").
   Also to correct before the round, though it names no answer: the money-in-and-out facilitator
   note calls the 2026-09-29 direction an "Owner direction". owner-feedback.md records the owner's
   question and marks the direction as Claude's and reversible, so it is a studio decision and must
   be called one.
3. **The gate is not clean.** `node kit/check.mjs --all` reports 30 shots older than their page,
   all recorded renders of screens/recipe-apply.html cited by earlier rounds' sessions
   (r4-elena-teamcolors-*). `node kit/shoot.mjs --stale` renders them again; then re-run the gate
   and paste it into gate.md.
   Note on the "0 pages" rule: both `--tasks` runs print "0 problems on 0 pages and N task
   screens". In --tasks mode no whole pages are checked by design, and the run did check 189 and
   166 task screens (the kit's own proof "--tasks that checks 0 task screens fails" holds), so this
   is not read as an empty gate.

Every other check passed; the scenarios of all 46 think-aloud tasks, the 16 tree tasks and the
other 13 first-click prompts were read and none names its answer.

## Commands and full output

### 1. `node kit/check.mjs --all`

Exit code: 1

```
30 shots are older than its page or the kit (node kit/shoot.mjs --stale renders them again): r4-elena-teamcolors-recipe-applied.png, r4-elena-teamcolors-recipe-apply.png, r4-elena-teamcolors-recipe-binding.png, r4-elena-teamcolors-recipe-confirmed.png, r4-elena-teamcolors-recipe-start.png, ...
1 problem on 70 pages; 584 fixture values bound
```

### 2. `node kit/check.mjs --tasks`

Exit code: 0

```
checked 189 task screens of 54 tasks
0 problems on 0 pages and 189 task screens; 0 fixture values bound
```

### 3. `node kit/check.mjs --tasks --task=who-matters,groups-differ,quiet-weight-trap,weight-end-to-end,dated-trace,flagged-account,figure-for-reviewer,gray-figure-signed,restyle-two-groups,use-colleagues-file,weekly-update,top-200-past-limit,get-back,fix-wrong-middle-step,keyboard-walk-shift-arrow,remember-why,notes-with-names,data-stays-here,worth-an-afternoon,top-50-to-excel,share-without-data,did-anything-leave,money-in-and-out,team-colors-file,two-runs-compared,calculation-stopped,narrow-or-paint,how-connected,too-big-to-draw,costly-measure,rankings-agree,this-weeks-export,read-the-numbers,load-a-messy-export,real-change-or-noise,first-launch,file-will-not-read,empty-project-start,nothing-matches,save-failed,turn-on-assistant,no-webgpu,untangle-layout,combine-two-sets,what-is-left,hunt-from-a-rule`

Exit code: 0

```
checked 166 task screens of 54 tasks
0 problems on 0 pages and 166 task screens; 0 fixture values bound
```

### 4. `node kit/prove-gate.mjs`

Exit code: 0

```
ok   control: the resting frame passes
ok   retired string
ok   retired string inside a Before frame is skipped
ok   retired string: 'result' used to mean a value
ok   retired string: the invented tie rule's 'within 1%'
ok   retired string: 'near #8' in a rank cell
ok   retired string: 'not used yet'
ok   retired string: 'Change...' on a data source
ok   the note editor's 'Saving as: Marcus. Change...' is not a data source
ok   required string: the note editor as drawn passes
ok   required string removed from one state fails that state alone
ok   required string removed everywhere fails every state
ok   count that differs from the page's dataset (76 of Les Miserables' 77 nodes)
ok   typed count no fixture holds
ok   bound number that differs from its fixture
ok   count the formatter did not write (the right number, typed)
ok   the same count written by the formatter passes
ok   formatter: 'N of M' typed without its noun fails as a typed mismatch
ok   a mismatched number inside a framed screen (a page that shows itself in frames)
ok   two homes: a Results section in the empty-selection inspector
ok   two homes: Previous selection
ok   two homes: a second Apply dialog
ok   frame: an avatar
ok   frame: an avatar letter in a page's own class
ok   frame: a rail without Results
ok   frame: a Note tool on the toolbar
ok   frame: no privacy line under the project name
ok   degree on a directed graph without in, out or total (the April transfers' size legend)
ok   a count that names its set without its message key
ok   two columns of one table with one display name (degree on the filtered and the full graph)
ok   --tasks that checks 0 task screens fails
ok   Esc rule: the undo page as drawn passes
ok   Esc rule: an Esc that closes the steps list without marking the key (kit.js's net off too) fails
ok   Esc rule: a handler that uses Esc with nothing open fails (the view can never be left)
ok   Esc: open the steps list, press Esc, the list closes and the page is still in the participant view; Esc with nothing open leaves
     chip clicked: steps list open
     Esc: steps list closed, still in the participant view
     Esc again with the list closed: left the participant view
all 35 proofs hold
```

