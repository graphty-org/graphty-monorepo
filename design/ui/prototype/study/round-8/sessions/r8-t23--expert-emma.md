# Session: notes on a whole community and a whole path -- Expert Emma

Task given: "The Les Miserables network is open with the program's circles of characters shown
(example data, not your own). Leave one reminder on the whole circle around the bishop Myriel,
and one on the chain the program already traced between Valjean and Javert as a whole, not on
any one character. Then locate both reminders again."

All commands run from design/ui/prototype. D = tmp/round-8-sessions/r8-t23--expert-emma.
S (the replayed setup for steps 10-13) = the two note-creation steps from render 10.

## Think-aloud

**01 (start screen).** Les Mis, the usual 77 nodes. Left: a tree of everything computed.
"Louvain 6 groups" expanded with Community 1-6, and another "Louvain 2, 7 groups" above it --
two Louvain runs, fine, I want the one painted. "Shortest paths" with "Valjean t... 2 nodes" and
"Myriel to... 3 nodes". Two nodes for Valjean-Javert means they are adjacent; the "chain" is one
edge. Which community is Myriel in? The labels are truncated, no way to tell from here. "Local
only" in the top bar -- I will take that at face value for now.

**02.** `--click "Myriel"` -- I wanted the node. It picked the path row "Myriel to Javert"
instead. Not what I meant, but harmless. Inspector shows the path, with Style/Data tabs.

**03.** `--click "Valjean to Javert"` -- path selected, Data tab: from Valjean, to Javert, 2 nodes,
1 edge, edge value 17 shared chapters, "Made with: all at their defaults" (I would like the
defaults spelled out, but there is an "All options" link). Notes section says "Note on: Path
Valjean to Javert. No notes. Add note (N)". That is exactly what I want -- note on the path
object, not on Valjean or Javert.

**04.** `Add note` -- jumps to a Notes panel with a composer pre-scoped "Note on: Valjean to
Javert". Mild surprise that the whole left panel switched, but it keeps the target chip. Says it
saves without a name unless I set one in Settings. Fine, nobody else is reading this.

**05.** Typed the note, Ctrl+Enter. Saved, top of the list, chip "Valjean to Javert". 8 notes in
this graph. Path inspector now "1 note -- Open in Notes". Good.

**06.** (fresh start) `--click "Community 3"` -- an existing note said "Myriel's household...
Community 3", but I do not trust someone else's note, I want to check. Inspector: Community 3,
Group from Louvain, 10 nodes, "Hub: Myriel, 9 links inside", members list Myriel, Mlle.Baptistine,
Mme.Magloire, Napoleon, OldMan... That is the Digne circle. Confirmed. Degree-within-community
histogram, nice touch.

**07.** Chained: path note, then `Graph`, `Community 3`, `Add note`. "Nothing on screen is called
Community 3". Coming back to Graph the tree is different: the Louvain 2 row has vanished, Louvain
is collapsed, and PageRank is selected. I did not touch any of that. Annoying -- the tree
re-arranged itself while I was away.

**08.** Clicked "Louvain" to get at it. It opened a Louvain tab in the bottom table instead: 6
communities with size, density, edges inside/leaving, and a Notes column (Community 3 shows 2).
Honestly that table is the thing I would have wanted first. But the tree row stayed collapsed.

**09.** Then `Community 3` -- it selected the tree row (tree expanded now) and the inspector shows
Community 3 again. The table switched back to Nodes, though. Side note: the node table's "group"
column says Valjean 2, Javert 4 -- a different numbering than Community 1-6, and an old note
says Valjean and Javert are in the same community. Which partition is "group"? Louvain 2? That
is the kind of thing I would stop and ask about in a real dataset.

**10.** `Add note` (in the Community 3 inspector, below the fold) -> typed -> Ctrl+Enter. Saved:
"Myriel's circle..." with chip "Community 3". Both my notes at the top of the list, 9 notes.
Community inspector says "3 notes -- Open in Notes".

**11.** Locate again from Graph: Shortest paths > "Valjean ... 2 nodes 1 note" -- found. Louvain
row says "1 note" with a circled 3 next to it. So 1 note on the run itself and 3 on its
communities? I am guessing. The "Notes 4 items" row in the tree still says 4 after I added two;
the Notes panel says 9. Those counts do not agree and I do not know what "Notes" in the tree is.

**12.** Notes panel, search "Leiden" -- filters to my community note. Works. Header still says
"9 notes in this graph" while showing one; should say 1 of 9.

**13.** Graph tree search "Find rows and notes", typed "weighted" (a word in my path note) --
nothing filtered, the tree is unchanged. Either it does not search note text despite the
placeholder, or there is no feedback. Either way it did not find my note.

I found both notes, via the Notes panel and via the "1 note" counts in the tree. Done.

## Verdict

- Succeeded: yes. Both notes are attached to the whole object (the Community 3 group and the
  Valjean-to-Javert path), not to a character, and I found both again.
- Single Ease Question: 5 of 7. Attaching to the path was immediate. The community was harder
  only because the tree re-arranged itself after the Notes panel took over the left side.
- Would I use this instead of my current tool: for annotations, yes -- Gephi has nothing like a
  note pinned to a partition class or a path, and I currently keep these in notebook markdown
  cells that drift from the data. The Louvain community table with a Notes column is what sold
  it. I would still want the notes exportable with the run parameters, and I want to know which
  partition the "group" column is.

## Problems noticed

1. Returning to Graph after saving a note, the tree had changed: Louvain collapsed, the Louvain 2
   row gone, PageRank selected. My Community 3 row was no longer reachable by name. (render 07)
2. Tree "Notes 4 items" never changes after adding two notes; Notes panel says 8 then 9. (11)
3. Louvain tree row shows "1 note" plus a circled 3 -- unclear what each count means. (11)
4. "Find rows and notes" in the Graph panel did not find a note by its text. (13)
5. Notes search result still headed "9 notes in this graph" when showing 1. (12)
6. Node table "group" column numbering (Valjean 2, Javert 4) does not match Community 1-6, and
   an existing note claims they share a community. Which partition is it? (09)
7. Clicking the "Louvain" tree row opened a table tab rather than expanding the row. (08)
8. "Add note" lives below the fold in the community inspector. (09-10)

## Commands run

```
timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t23 --click "Myriel"
timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t23 --click "Valjean to Javert"
timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t23 --click "Valjean to Javert" --click "Add note"
timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t23 --click "Valjean to Javert" --click "Add note" --type "Chain Valjean-Javert: check whether this direct tie holds in weighted run" --key Control+Enter
timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t23 --click "Community 3"
timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t23 --click "Valjean to Javert" --click "Add note" --type "Chain Valjean-Javert: check whether this direct tie holds in weighted run" --key Control+Enter --click "Graph" --click "Community 3" --click "Add note"
  -> nothing on screen is called "Community 3"; nothing on screen is called "Add note"
timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t23 [path note steps] --click "Graph" --click "Louvain"
  -> ambiguous: "Louvain" matches tab and treeitem; clicked the first
timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t23 [path note steps] --click "Graph" --click "Louvain" --click "Community 3"
timeout 120 node app-b/study.mjs --try $D/10.png task:r8-t23 [path note steps] --click "Graph" --click "Louvain" --click "Community 3" --click "Add note" --type "Myriel's circle: Louvain, default resolution. Rerun with Leiden and compare membership." --key Control+Enter
timeout 120 node app-b/study.mjs --try $D/11.png task:r8-t23 $S --click Graph
timeout 120 node app-b/study.mjs --try $D/12.png task:r8-t23 $S --click Notes --click "Find in notes" --type Leiden
timeout 120 node app-b/study.mjs --try $D/13.png task:r8-t23 $S --click Graph --click "Find rows and notes" --type weighted
```
