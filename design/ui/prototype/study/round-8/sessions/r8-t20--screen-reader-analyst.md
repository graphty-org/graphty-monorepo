# Session: set aside minor characters -- screen-reader analyst (Morgan Reyes)

Task as given: "The Les Miserables network is open (example data, not your own). For every count
and every drawing from now on, you want to set aside the minor characters -- anyone who shares
chapters with fewer than five others. Set that up, then say how many characters are left."

Start screen: shots/tasks/r8-t20/01.png. Renders: tmp/round-8-sessions/r8-t20--screen-reader-analyst/.
All commands run from design/ui/prototype.

## Think-aloud

**01 (start).** Title says Les Miserables. Top bar: a menu, the dataset name, undo, redo,
"Local only" (good -- that's my first question answered), and a control that says "Full graph".
"Every count from now on" sounds like a scope over the whole graph, and "Full graph" is the only
thing that sounds like scope. Trying it.

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t20 --click "Full graph"

**02.** It took me to the Data section. Under a "Filters" heading: "No filters. Filters change
what is computed; the eye in the Graph tree only hides." That sentence is the distinction I
actually care about -- hiding is not filtering -- and it is stated in words. Good. Next to it,
"Add filter step".

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t20 --click "Full graph" --click "Add filter step"

(The tool told me two buttons are both called "Add filter step". I took the first.)

**03.** A step called "New step" appeared in the Filters list, already checked on. On the right, a
"Keep" menu opened: by an attribute or computed value, top of a computed value, largest
component, k-core, neighbors of the selection (unavailable: "Select one or more nodes first" --
nice that it says why). "Shares chapters with fewer than five others" is degree. k-core is NOT
the same thing -- it peels repeatedly -- so I am not choosing that. Some items have a small icon
after them; I have no idea what it means and nothing said it.

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t20 --click "Full graph" --click "Add filter step" --click "By an attribute or computed value"

**04.** An attribute list: nodes (label, group, betweenness, degree), edges (value), results
(Louvain, PageRank), notes (note count). "degree" is filed under "Other attributes" -- so it's a
column that came in with the file, not something this tool worked out from the edges. I'll take
it, but I'm noting that.

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t20 --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --click "degree"

**05.** I heard two things called degree: "degree, Nodes" and "degree, nodes". Same words, a
capital letter apart -- at my speech rate those are identical. I took the first. The right-hand
pane now describes the degree attribute itself (imported, range 1 to 36, median 6, "Nothing uses
it"), not my filter. Wrong one. The list on the left and the open menu both had a "degree", and
I could not tell which was which. Starting over and taking the other.

    timeout 120 node app-b/study.mjs --try .../06.png task:r8-t20 --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --click "degree, nodes"

**06.** Now the step is called "degree is at least", condition "degree" / "is at least", and an
empty edit box. "Keep degree at least 5" drops anyone under five -- that's the right logic. The
box has no name I can see; I'd hear "edit, blank" and have to guess from what came before.

    timeout 120 node app-b/study.mjs --try .../07.png task:r8-t20 --click "Full graph" --click "Add filter step" --click "By an attribute or computed value" --click "degree, nodes" --key 5 --key Enter

**07.** The step reads "degree is at least 5" and, under it, "41 of 77 nodes (the full graph)".
The control at the top that said "Full graph" now says "41 of 77 nodes", so it seems to apply
everywhere, which is what I asked for. "This step: 41 of 77 nodes" on the right too. The count
is in words, in three places I can come back to. Good.

What I can't check: whether the drawing changed. Nothing told me it did. I'd have to ask a
sighted colleague whether the 36 minor characters are gone from the picture. And the 41 rests on
the file's own degree column -- if that column is stale or counts something else, the tool would
never know. Before I put 41 in a report I'd run NetworkX on the same edges.

**Answer: 41 characters are left (of 77).**

## Verdict

- **Succeeded?** I think so. 41 of 77, filter on, shown at the top as the scope. One wrong turn
  on the way (the two "degree" items).
- **Single Ease Question:** 5 of 7. The path was short and the words were mostly right. Two
  things that sound the same, one unnamed edit box, and no word about the drawing cost it.
- **Would I use this instead of my current tool?** Not for this. In NetworkX this is one line,
  `G.subgraph(n for n, d in G.degree() if d >= 5)`, and its degree comes from the edges, not from
  a column someone typed. What I liked: the tool says in plain words that a filter changes the
  counts and hiding does not, and the scope stays at the top where I can find it again. If the
  filter could use a degree the tool works out itself, and told me the drawing changed, I'd
  consider it for handing a filtered view to a sighted colleague.

## Problems heard

1. Two buttons are both named "Add filter step" (severity 2).
2. Two options read "degree, Nodes" and "degree, nodes" -- indistinguishable by ear; the first
   opened the attribute's own page instead of filling the condition. Cost me a restart
   (severity 3).
3. The number box in the condition has no name (severity 3).
4. The only degree on offer is the one imported with the file; nothing offers one worked out
   from the edges, and nothing says whether the imported one matches them (severity 3).
5. Nothing says the drawing changed after the filter; the picture looked the same to the
   colleague I'd have asked (severity 2).
6. Small icons after some "Keep" options with no spoken meaning (severity 1).
