# Session r5-s16b -- transcript

Participant: Tom, lab manager, returning user. Task: keep only pairs who share 5 or more chapters, say how many characters remain, then bring every character back.

Every command uses `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/` and `node design/ui/studio/tool/real.mjs` with session folder `tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s16b` (started for me).

## 01.png (start)
Les Miserables is open, orange dots sized by PageRank. Left panel: Selection, PageRank (77), Everything. A toolbar at the bottom with icons, one looks like a filter (lines narrowing). I want to drop the weak ties, so I'll try that filter-looking icon.

## Step 1 -> 02.png
Command: `--step ... --click-at 833,863` (printed: button "Filters")
A "New filter step" panel opened on the right: Keep "an attribute's value", then an empty Attribute box, and a grey "Add step". On the left I see "shared_chapters" under Edges -- that's the chapter count. I'll open the Attribute box.

## Step 2 -> 03.png
Command: `--step ... --click "Attribute"`
A list opened: Nodes (id, name), Edges (shared_chapters). Picking shared_chapters.

## Step 3 -> 04.png
Command: `--step ... --click "role=option:shared_chapters"`
Now it reads: shared_chapters, Is "at least", Value empty, and a small line "Keeps edges that pass and the nodes at their ends." "At least" is what I want. I'll put 5 in Value.

## Step 4 -> 05.png
Command: `--step ... --click "Value" --type "5"`
Value shows 5 and "Add step" turned blue. The picture hasn't changed yet. I'll press Add step.

## Step 5 -> 06.png
Command: `--step ... --click "Add step"`
The drawing thinned out right away. Top bar: "26 of 77 nodes, 51 of 254 edges"; the right panel says "Nodes showing 26 of 77". Under Filters on the left: "shared_chapters is at least 5 -- 77 to 26 nodes, 254 to 51 edges" with a ticked box. So the answer is 26 characters. Three places say the same number, which I like. Now to bring everyone back I'll untick that box rather than delete anything -- I don't want to lose the step.

## Step 6 -> 07.png
Command: `--step ... --click-at 273,335` (printed: input "Apply step: shared_chapters is at least 5")
Everything is back: the full drawing, right panel says Nodes 77, Edges 254, and the "26 of 77" in the top bar is gone. The filter is still listed, marked "off", so I could turn it back on for the essay. Done.

## --end (first)
Command: `--end ...` answered with a further request: "Now the same for pairs who share 8 or more chapters: how many characters are in the drawing then? Bring every character back when you are done."
Fine. My old step says "at least 5"; I'd rather change that one to 8 than build a new one. I'll click on the step's wording to see if it opens.

## Step 7 -> 08.png
Command: `--step ... --click-at 180,320` (printed: treeitem "shared_chapters is at least 5")
The step opened on the right with its settings, Value 5, and a blue "Save and turn on" button. Good -- I'll change 5 to 8 (select what's there and type over it).

## Step 8 -> 09.png
Command: `--step ... --click "Value" --key Control+a --type "8"`
Value now reads 8. The heading still says "at least 5" until I save, which makes sense. Pressing "Save and turn on".

## Step 9 -> 10.png
Command: `--step ... --click "Save and turn on"`
Top bar: "17 of 77 nodes, 19 of 254 edges"; right panel "Nodes showing 17 of 77"; the step now reads "shared_chapters is at least 8 -- 77 to 17 nodes, 254 to 19 edges". So 17 characters at 8 or more. Untick the box again to bring everyone back.

## Step 10 -> 11.png
Command: `--step ... --click-at 273,335` (printed: input "Apply step: shared_chapters is at least 8")
All 77 characters and 254 ties are back; the step is listed as "off". Done with both.

## --end (second)
Command: `--end ...` -- session ended.

## In my own words, at the end

- Did I finish? Yes. At 5 or more shared chapters, 26 of the 77 characters are left (51 of 254 ties). At 8 or more, 17 characters (19 ties). Both times I brought everyone back by unticking the step, and the panel went back to 77 and 254.
- Ease: 6 out of 7.
- What went well: once I clicked the funnel button at the bottom, the form read like a sentence -- shared_chapters, at least, 5 -- and "at least" was already picked. The count showed up in three places at once (top bar, the step itself, the right-hand panel), so I didn't have to count anything. Unticking a box to bring everyone back felt safe; nothing said Delete, and the step stayed there marked "off".
- What confused me: the bottom toolbar is all small icons with no words, so finding "Filters" was a guess based on the funnel shape. The attribute is called "shared_chapters" with an underscore -- I could work out it meant chapters shared, but that's the file's word, not mine. When I reopened the step, typing into Value would have added to the 5 instead of replacing it if I hadn't selected it first. And with the step off, the top bar's "26 of 77" simply disappears -- I'd have liked something that says plainly "showing everyone", though the 77 on the right told me.
