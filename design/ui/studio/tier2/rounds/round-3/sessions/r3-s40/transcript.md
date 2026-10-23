# Session r3-s40 transcript

Participant: Tom, lab manager, returning user. Task: keep only pairs sharing 5 or more chapters in the Les Miserables network, say how many characters remain, then bring every character back.

Every command ran from the studio worktree as `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/ node design/ui/studio/tool/real.mjs ...`, with S = tmp/studio-sessions/tier2/rounds/round-3/sessions/r3-s40 (the session folder; `--end` copied its screenshots here).

## Step 1 -- start
`--start S setup:lesmis-ranked.txt` -> 01.png
The Les Miserables network is open, colored by PageRank (my old ranking). Left panel lists Selection, PageRank (77), Everything. I need some way to drop the weak ties. "Everything" sounds like where the whole set lives; I will look there first.

## Step 2
`--step S --click "Everything"` -> 02.png
That only opened colors and shapes for every node. Not what I want. The bottom toolbar has a flask (the analysis button I used before), a chart icon, 3D and a magnifier. I will point at the chart icon.

## Step 3
`--step S --hover-at 728,864` -> 03.png (tooltip "Layout")
That one is Layout. The chapter counts are data on the ties, so the Data button on the far left seems the natural place.

## Step 4
`--step S --click "Data"` -> 04.png
I see 77 nodes, 254 edges, a "Filters" row with a plus, and an edge attribute "shared_chapters" -- my chapter count. I press the plus next to Filters.

## Step 5
`--step S --click-at 276,285` (button "Add filter step") -> 05.png
A "New filter step" form opened on the right: Keep "an attribute's value", Attribute (empty), Add step (grayed). I open the Attribute list.

## Step 6
`--step S --click "Attribute"` -> 06.png
The list shows Nodes: id, name; Edges: shared_chapters. I pick shared_chapters.

## Step 7
`--step S --click "role=option:shared_chapters"` -> 07.png
Now Is "at least", a Value box, and the note "Keeps edges that pass and the nodes at their ends." I click in Value and type 5.

## Step 8
`--step S --click "Value" --type "5"` -> 08.png
Value shows 5 and "Add step" turned blue. I read it once more: shared_chapters, at least, 5. Press Add step.

## Step 9
`--step S --click "Add step"` -> 09.png
The drawing shrank. Top bar "26 of 77 nodes"; right panel Nodes showing 26 of 77, Edges showing 51 of 254; filter row "shared_chapters is at least 5, 77 to 26 nodes". Three places agree: 26 characters remain. To bring everyone back I will untick the filter's checkbox rather than delete it.

## Step 10
`--step S --click-at 274,327` (checkbox "Apply step: shared_chapters is at least 5") -> 10.png
Everyone is back: full drawing, Nodes 77, Edges 254, the "26 of 77" note in the top bar gone. The filter stays listed as "off". PageRank colors unchanged.

## Step 11 -- end, and a further request
`--end S` answered with a new request: "Now the same for pairs who share 8 or more chapters: how many characters are in the drawing then? Bring every character back when you are done."
I would rather change my existing filter than add a second one. I click the filter's name.

## Step 12
`--step S --click-at 180,319` (tree item "shared_chapters is at least 5") -> 11.png
My filter opened on the right with Value 5 and a "Save and turn on" button. I replace the 5 with 8.

## Step 13
`--step S --click "Value" --key Control+a --type "8"` -> 12.png
Value reads 8; the title still says "at least 5" until I save. Press "Save and turn on".

## Step 14
`--step S --click "Save and turn on"` -> 13.png
Top bar "17 of 77 nodes"; Nodes showing 17 of 77, Edges showing 19 of 254; filter "shared_chapters is at least 8, 77 to 17 nodes". So 17 characters. The "Full graph" box still says Components 1 although I see two separate clumps -- I take it that box is the whole network, but it made me look twice. Untick the filter again.

## Step 15
`--step S --click-at 274,327` (checkbox "Apply step: shared_chapters is at least 8") -> 14.png
All 77 characters and 254 ties are back; the filter is listed as off.

## Step 16 -- end
`--end S` -> session ended.

## In my own words (Tom)
- Did I finish? Yes. At 5 or more shared chapters, 26 of the 77 characters are left (51 of 254 ties). At 8 or more, 17 characters are left (19 ties). Both times I brought all 77 back by unticking the filter, which stays in the list marked "off".
- Ease: 6 out of 7.
- What confused me: I first went to "Everything" and the toolbar looking for a way to drop ties; filtering lives under Data, which I had never opened, so it took a couple of tries to find. Once there, the form read like a sentence ("shared_chapters at least 5") and the note under it told me what it would keep, which I liked. The "Full graph" box saying Components 1 while two separate clumps were on screen made me look twice until I worked out it describes the whole network, not what is showing. The column name "shared_chapters" is computer-ish but clear enough.
