# Session: two-line labels on the circle around the bishop -- Morgan Reyes (screen-reader analyst)

Task as given by the moderator: "Have each character in the circle around the bishop carry two
pieces of text in the drawing: what they are called on top, and underneath it how many remarks
have been written about them. The data on screen is a sample: characters of the novel Les
Miserables, linked when they appear in the same chapter."

Start screen: shots/tasks/t21/01.png. All commands run from design/ui/prototype; D is
tmp/round-7-sessions/t21--screen-reader-analyst (absolute path in the real commands).

## Think-aloud and steps

01. `--click "Find rows and notes"` -> 01.png
    "First question: which one is the bishop, and who is 'the circle'? I'll search. The search
    field takes focus. Fine. I can't type into it in this run, so I'll look for the bishop by name.
    I happen to know the bishop in the novel is Myriel."

02. `--click "Myriel"` -> 02.png
    "That didn't take me to Myriel. It took me to a row called 'Myriel to Javert', a path. So the
    only thing in the tree that answers to 'Myriel' is a path result, not the person. There is no
    node row for him I can get to from here."

03. `--click "Louvain"` -> 03.png
    "Maybe the circle is a community. Louvain opened a table: Community 1 to 6, size, density,
    edges inside, edges leaving, notes. Good, a real table with headers. But no column tells me
    who is IN each community. 'Community 3' means nothing to me. Which one has the bishop?"

04. `--click "Louvain" --click "Nodes"` -> 04.png
    "Nodes table: label, group, degree, PageRank, rank, betweenness. 77 nodes. Sorted by degree,
    so Myriel is far down. And 'group' here is the file's own group, not the Louvain community --
    there's a Louvain column somewhere off to the right maybe, I can't tell. No search in the
    table that I can find."

05. `--click "Expand Louvain"` and `--click "Expand"` -> nothing on screen is called that.
    "The little arrow in front of Louvain in the tree has no name I can find. Dead end one."

06. `--click "6 groups"` -> 06.png
    "That selected the Louvain row. Inspector says Louvain, Paints 77 nodes, Fill, Shape, Effects,
    Label, Tooltip. Label is here. But this would be all 77 nodes, not the circle."

07. `--click "6 groups" --click "Data"` -> 07.png
    "I wanted the Data tab of the inspector. Instead I went to the whole Data section on the left.
    Two things called 'Data', and the one I got was the wrong one. The graph summary is nice --
    77 nodes, 254 edges, undirected, 1 component -- but it's not what I asked for."

08. `--click "Louvain" --click "Community 3"` -> 08.png
    "Clicking the Louvain row a second time expanded it: Community 1 to 6 with sizes. Selecting
    Community 3: 'Paints 10 nodes'. Still no member list. So I worked it out from the numbers
    instead. The bishop's circle, the way the moderator put it, sounds like him and a ring of
    people only linked to him. Community 3 is 10 nodes, density 0.222, 10 edges inside, 3 leaving.
    A star of one centre and nine leaves has 9 inside edges and density 0.2; one extra edge gives
    10 and 0.222. Communities 4 and 5 are far too dense for a ring of hangers-on. So I'm betting on
    Community 3. That's me doing the tool's job with arithmetic, and I'm not sure."

09. `--click "Label"` (after selecting Community 3) -> 09.png -- nothing changed.
10. `--click "Add label"` -> nothing on screen is called that. `--hover "Label"` -> 10.png, no tooltip.
11. `--click "Add"`, `--click "+"`, `--click "Add Label"` -> "Add" opened a Shape menu (11.png);
    the other two: nothing called that.
    "So every plus button in this panel answers to 'Add', and the first one is Shape. With a
    screen reader that's four buttons I'd hear as 'Add button, Add button, Add button'."

12. `--hover "Add"` -> 12.png: tooltip "Add to Shape".
    "OK, the full name is 'Add to Shape'. Then the Label one should be 'Add to Label'."

13. `--click "Add to Label"` -> 13.png: menu "Label line", "Show labels".
14. `... --click "Label line"` -> 14.png: a row "Above" with "Pick a field", and a list: Typed
    text; nodes: label, group, degree, betweenness; Results: Louvain, PageRank; Notes: Latest
    note, Note count.
    "'Note count' -- that's my 'how many remarks'. And it put the first line 'Above'. Good."

15. `... --click "label" --click "Add to Label" --click "Label line"` -> 15.png
    "Clicking 'label' sorted the nodes table by its label column instead of picking from the list.
    Two things called 'label' on screen at once. The list stayed open, empty."

16. `... --click "Name, Label"` -> 16.png: Above = Abc label.
17. `... --click "Add to Label"` -> 17.png: a second row "Below" appeared with the list open.
    "Nice -- the second line went 'Below' on its own, without asking."
18. `... --click "Note count"` -> 18.png: Label: Above = label, Below = # Note count.

19. `--click "Louvain" --click "Community 3" --click "Data"` -> 19.png
    "I wanted to check who's in Community 3. 'Data' took me to the left Data section again. I
    can't get to the inspector's Data tab by name. I'm out of ways to confirm."

Final command (the full sequence that produced the end state):
`timeout 120 node app-b/study.mjs --try D/18.png task:t21 --click "Louvain" --click "Community 3"
--click "Add to Label" --click "Label line" --click "Name, Label" --click "Add to Label" --click
"Note count"`

## Outcome

Do I think I succeeded? Probably, about the label part: two lines, name above, note count below.
Whether it went on the right people I cannot say. I picked Community 3 by working out density
from the table, because nothing told me which community holds the bishop, and nothing would take
me from "Myriel" to his node. Nothing on screen confirmed the labels landed on his circle either;
the inspector still just says "Paints 10 nodes". I'd ask a sighted colleague, which is the thing
I'm trying to stop doing.

Single Ease Question: 3 of 7. The label editor itself was easy once found -- a list grouped by
where the field comes from, Above and Below filled in for me. Everything around it was hard:
finding the group, the unnamed expand arrow, four buttons all called "Add", two things called
"Data", two things called "label".

Would I use this instead of my current tool? Not for this. In NetworkX I'd take Myriel's
neighbours in one line and print them with a note count. Here I had to guess the group by
arithmetic. If a community row told me its members, or if searching a person's name took me to
the person, I'd reconsider for making figures I hand to colleagues.

## Problems noted

- No way to get from a person's name (Myriel) to that person; the only match was a path result
  named "Myriel to Javert".
- Communities are "Community 1..6" with no member list or naming member; I had to infer which
  one by density.
- The expand arrow in front of Louvain has no name.
- The plus buttons in the inspector are named "Add" first; the full name ("Add to Shape", "Add to
  Label") is only in the tooltip.
- "Data" names both the left rail section and the inspector tab; I could only ever reach the rail.
- "label" names both a table column header and an item in the field list; picking it sorted the
  table.
- After adding the label lines nothing said where they now show or which characters carry them.
