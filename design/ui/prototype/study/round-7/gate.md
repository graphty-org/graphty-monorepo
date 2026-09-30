# Round 7: the gate, before the first session

Every task screen passed the gate before any session or first click. The three commands were run
from `design/ui/prototype/` on 2026-09-29, after the last change to the kit and the task screens;
their output is pasted below as printed. Any failure would have stopped the round.

## What changed in the kit and the task screens before this run

- **Every task shows one dataset, first screen to last.** Six tasks had borrowed a screen drawn on
  another graph. Each now has a screen on its own data:
  - A long calculation that stopped (the patent citations): the lost-GPU notice and its later
    state are redrawn on the patents (`screens/notices-errors.html#device-lost`, `#device-lost-later`).
  - The ten accounts that take in far more than they send (the March transfers): the measure
    catalog opened on the transfers, unfiltered (`screens/run-and-read.html#catalog-transfers`).
  - Notes a colleague can tell apart (the March transfers): the Notes panel with notes by two
    people, each row naming its author (`screens/take-a-note.html#s10`), and Preferences read at
    its "Your name on notes and recipes" state.
  - Two rankings of Les Miserables compared: Compare with another run... on the two Betweenness
    runs (`screens/results-panel.html#compare-with-lesmis`), the comparison itself
    (`screens/comparison.html#runs-lesmis`, numbers from `screens/two-runs-lesmis-numbers.mjs`),
    and the Les Miserables ranked table (`screens/table-dock.html#small`).
  - The cheapest route and the most central accounts (the March transfers): the finished run
    that says what it used is the money-in run on the transfers (`screens/run-and-read.html#money-read`),
    not a finished run on the proteins.
  - A messy transfer export: the import report on the March transfers
    (`screens/load-step.html#report-transfers`), not the protein evidence file's.
  - Five transfers tasks now read the comparison page's transfers states by name, since that page
    also holds the Les Miserables comparison.
- **Numbers.** A count that names its set passes the set on its message key
  (`data-fx-msg="graphty.<area>.<message>"`); the current set is the frame's own (`data-set`).
  Degree on a directed graph always says in, out or total. Two columns of one table never share a
  display name. The gate fails each of these, and each has a proof.
- **The frame.** Every left panel header, in every state it switches to, carries the privacy line
  under the project name; the gate fails a header without it.
- **The proofs.** They had been failing because they planted text the resting frame no longer
  contains. A stale plant now stops the check and says so, instead of reading as "does not load
  kit/kit.js".

## `node kit/check.mjs --all`

```
0 problems on 70 pages; 507 fixture values bound
exit code 0
```

## `node kit/check.mjs --tasks`

```
checked 158 task screens of 43 tasks
0 problems on 0 pages and 158 task screens; 0 fixture values bound
exit code 0
```

And a run that checks nothing fails:

```
$ node kit/check.mjs --tasks --task=no-such-task
--tasks checked 0 task screens: kit/fixtures.json lists no task pages, or none could be read
1 problem on 0 pages and 0 task screens; 0 fixture values bound
checked nothing: exit 1
```

## `node kit/prove-gate.mjs`

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
exit code 0
```
