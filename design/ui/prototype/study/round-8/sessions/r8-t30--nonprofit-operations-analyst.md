# Session: add April's transfers to March's table -- Grace, nonprofit operations analyst

Task as given: "March's card transfers are open (example data if you do not work in banking).
April's transfers have arrived as a second file with the same columns. You want the one table of
transfers to hold both months from now on, keeping everything you have built."

All commands run from design/ui/prototype. Renders in
tmp/round-8-sessions/r8-t30--nonprofit-operations-analyst/. Prefix below is
`timeout 120 node app-b/study.mjs --try $D/NN.png task:r8-t30`.

## Think-aloud

**01 (start screen, shots/tasks/r8-t30/01.png).** "Okay, the March graph, colored by Louvain --
which is the communities thing, seven colors and a 'Links in (count)' sizing. That's what I've
built. Title says 'Transfers, March 2026'. I need to get the April file in. The data stuff is
probably under 'Data' on the left."

**02 `--click "Data"`.** "Good, Sources: accounts-2026-03.csv and transfers-2026-03.csv, 9,113
rows. There's a filter 'amount is at least 1,000' and the Louvain result under Results. There's a
'+' next to Sources, but that sounds like a brand-new source, a second table. I don't want two
tables, I want April IN the transfers one. Let me click the transfers file itself."

**03 `--click "Data" --click "transfers-2026-03.csv"`.** "This opened an 'Edit: transfers' page
with the columns and a match report. 9,113 rows, every row matched. Nice to see, but nowhere says
'add a file'. The file name at the top looks clickable."

**04 `... --click "transfers-2026-03.csv"` (again, in the editor).** "Nothing happened. Okay, not
here. Back out. There were little three-dot menus next to each file."

**05 `--click "Data" --click "More"`.** "Oops, that opened the graph's menu on the right -- select
all, re-run layout, clear graph data. Not what I wanted. I'm looking for the dots next to the
transfers file."

**06 `--click "Data" --click "actions"`** (feeling around for the dots). "That got me the
accounts file's dots by mistake."

**07 `--click "Data" --click "Actions for transfers-2026-03.csv"`.** "There. Rename, 'Replace with
file...', 'Add rows from file...', 'Edit source...'. 'Replace' would lose March, so NOT that. 'Add
rows from file' is exactly my words. Good."

**08 `... --click "Add rows from file..."`.** "It picked up transfers-2026-04.csv. Same columns,
dates are April. The report says 'transfers-2026-04.csv has the same 4 columns as transfers',
'Add these rows to transfers' is already chosen, '8,370 rows to add, 0 repeated rows, 132 new
accounts'. The top line says transfers 9,113 + 8,370 added. I'd check 8,370 against Excel's row
count -- that's the kind of number I want. And it warns me plainly that the other link would drop
March's rows. Really clear.
A couple of things nag me: the left list now shows 'transfers-202...' as a third entry under
Tables, which looks like it's becoming its own table even though I picked 'add to transfers'.
And '132 new accounts' -- those accounts aren't in my accounts file, so they'll have no country
or kind? It doesn't say. But fine, it's the button I'd press. 'Add'."

**09 `... --click "Add"`.** "Wait. What happened? My colors are gone. The Louvain layer and the
'Links in' sizing are gone from the list -- it just says 'Analyze to add results here'. The graph
is gray hexagons and a tag says 'Nothing is colored or sized by a row'. And the summary still
says 3,000 nodes and 9,113 transfers -- not 17,483. The title still says March 2026."

**10 `... --click "Add" --click "Data"`.** "Sources: still only transfers-2026-03.csv, 9,113 rows.
No April anywhere. And my filter, 'amount is at least 1,000', is gone -- 'No filters'. The
Louvain result is gone from Results. So I lost everything I built AND April isn't in."

**11 `... --click "Add" --hover "Undo"`.** "Undo, Ctrl+Z. Let me try it."

**12 `... --click "Add" --click "Undo"`.** "'Nothing to undo.' That's the worst thing it could
say. My work is gone and it doesn't even know it did something."

**13 `... --click "Add rows from file..." --click "Add these rows to transfers" --click "Add"`.**
"Maybe I did it wrong -- I'll click the 'Add these rows to transfers' option myself before Add.
Same result: everything wiped, still 9,113 rows, no April, no undo.
I'm stopping here. If this were my donor map I'd be closing the tab and checking whether I had a
saved copy."

## Outcome

- **Succeeded?** No. Finding the action was fine ("Add rows from file..." on the file's menu,
  with a preview that said exactly what would happen). But after pressing Add, April's rows were
  not in the table (still 9,113 transfers, 3,000 nodes, only the March file listed), and the
  Louvain coloring, the "Links in (count)" sizing and the amount filter had all disappeared.
  Undo said "Nothing to undo". The opposite of "keeping everything you have built".
- **Single Ease Question:** 2 of 7. Getting to the right screen was maybe a 5 (the three-dot menu
  is small and I hit two wrong menus first); what happened after Add makes the whole task a 2.
- **Would I use this instead of my current tool (Excel plus re-pasting)?** Not after this. The
  preview screen is better than anything I have -- counts, "0 repeated rows", "132 new accounts",
  and a plain warning that Replace drops March. That's the quarterly refresh I need. But a tool
  that throws away my analysis and filter on the refresh, with no undo, is exactly the tool I
  "won't use twice". If Add had kept my layers and shown 17,483 transfers, I'd switch.

## Problems noted (in Grace's words)

1. After Add: April not added (still 9,113 rows, 3,000 nodes, only the March file listed) and the
   Louvain layer, "Links in (count)" layer and amount filter vanished. Severity: blocking.
2. Undo after that says "Nothing to undo". Severity: blocking -- no way back.
3. The way in is a small unlabeled three-dot menu per file; I first tried clicking the file name
   (opened the editor, no add option there) and opened two wrong menus. Severity: minor.
4. In the add preview the left list shows "transfers-202..." as its own entry under Tables, which
   reads as a separate table even with "Add these rows to transfers" chosen. Severity: minor.
5. "132 new accounts" -- the preview doesn't say what those accounts will have (no country, kind)
   or whether they'll show up in my communities. Severity: minor.
6. The title still says "Transfers, March 2026"; once it holds April it should not, or should
   let me rename. Severity: cosmetic (couldn't check, since April never arrived).

## Commands run

```
D=tmp/round-8-sessions/r8-t30--nonprofit-operations-analyst
P="timeout 120 node app-b/study.mjs --try"
$P $D/02.png task:r8-t30 --click "Data"
$P $D/03.png task:r8-t30 --click "Data" --click "transfers-2026-03.csv"
$P $D/04.png task:r8-t30 --click "Data" --click "transfers-2026-03.csv" --click "transfers-2026-03.csv"
$P $D/05.png task:r8-t30 --click "Data" --click "More"
$P $D/06.png task:r8-t30 --click "Data" --click "actions"
$P $D/07.png task:r8-t30 --click "Data" --click "Actions for transfers-2026-03.csv"
$P $D/08.png task:r8-t30 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Add rows from file..."
$P $D/09.png task:r8-t30 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Add rows from file..." --click "Add"
$P $D/10.png task:r8-t30 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Add rows from file..." --click "Add" --click "Data"
$P $D/11.png task:r8-t30 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Add rows from file..." --click "Add" --hover "Undo"
$P $D/12.png task:r8-t30 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Add rows from file..." --click "Add" --click "Undo"
$P $D/13.png task:r8-t30 --click "Data" --click "Actions for transfers-2026-03.csv" --click "Add rows from file..." --click "Add these rows to transfers" --click "Add"
```

Tool notes (not Grace): every "Data" click reported ambiguity (rail button, panel tab, tabpanel)
and clicked the rail button, as intended. The result after "Add" looks like the skeleton falling
back to a bare starting state rather than a designed outcome; designers should check whether the
Add step is wired to a "rows added, layers kept" state.
