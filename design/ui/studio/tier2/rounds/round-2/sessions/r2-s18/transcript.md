# Session r2-s18 -- Ruth (returning reporter), T17 prompt B (Les Miserables)

Build: 8f0d5a6f7791 (frozen, /home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/).
Commands run from design/ui/studio/tool with REAL_DIST set to that build; S = this session folder.

Prompt: "You have used this program a few times. The ready-made network of characters from Les
Miserables is already open; each tie counts the chapters two characters share. For a short essay
you care only about pairs who share 5 or more chapters. Change the drawing so it has only those
pairs, tell us how many characters are still in it, and then bring every character back."

## Steps

### 01 -- start
`node real.mjs --start $S setup:lesmis-ranked.txt`
Ruth: The Les Miserables map is up, dots sized and colored by PageRank, which somebody ran
earlier. On the left: Selection, PageRank (77), Everything. 77 -- that is presumably every
character. Nothing here says "ties" or "chapters". I want only the strong ties. I'll try the
Data button on the left rail first; that's where the numbers should live.

### 02 -- click "Data"
`node real.mjs --step $S --click "Data"`
Ruth: Good. Les Miserables, 77 nodes, 254 edges -- noted. Under Edges there is a number column,
"shared_chapters"; that's my chapter count. And there's a "Filters" heading with a plus. I'd rather
it said something plainer, but that's the obvious place. Clicking the plus beside Filters.

### 03 -- click the plus beside Filters (tool: button "Add filter step")
`node real.mjs --step $S --click-at 276,285`
Ruth: A "New filter step" form on the right. Keep: "an attribute's value". Attribute: empty.
That reads right -- keep the ties by a value. Opening the Attribute list.

### 04 -- open the Attribute list
`node real.mjs --step $S --click-at 1320,170`
Ruth: The list has Nodes (id, name) and Edges (shared_chapters). Choosing shared_chapters.

### 05 -- choose shared_chapters
`node real.mjs --step $S --click "shared_chapters#2"`
Ruth: That took me to the shared_chapters entry on the left (my click went to the left-hand
list, not the open dropdown -- my aim, not the program's fault). The form is gone; the right side
now describes the column: Edges, Amount, from the file, 100% have a value, 17 distinct values,
range 1 to 31. Useful to know. Starting the step again: plus beside Filters.

### 06 -- plus beside Filters again, open the Attribute list
`node real.mjs --step $S --click "Add filter step" --click-at 1320,170`
Ruth: Same form, list open. This time I click shared_chapters in the dropdown itself.

### 07 -- pick shared_chapters in the dropdown
`node real.mjs --step $S --click-at 1270,319`
Ruth: Attribute shared_chapters, Is "at least", Value empty. Under it: "Keeps edges that pass and
the nodes at their ends." That's exactly my question in plain words -- and it tells me which
characters stay. "At least" 5 means 5 or more. Typing 5 in Value, then Add step.

### 08 -- click in Value, type 5, Add step
`node real.mjs --step $S --click-at 1320,266 --type "5" --click "Add step"`
Ruth: The drawing thinned out. Top bar: "26 of 77 nodes". Right side, Values: Nodes showing
26 of 77, Edges showing 51 of 254, and a line saying the counts below are for the whole graph.
In the left list the step reads "shared_chapters is at least 5 -- 77 to 26 nodes", with a
ticked box. Three places agree: 26 characters. The legend now says "PageRank on 77 nodes", so the
ranking colors were worked out over everyone, not this cut -- good, it tells me. I'd still like
to see the 26 names, but the count is what was asked. Answer: 26 characters.
Now bring everyone back. The tick box beside the step looks like an on/off switch; unticking it.

### 09 -- untick the step (tool: checkbox "Apply step: shared_chapters is at least 5")
`node real.mjs --step $S --click-at 274,326`
Ruth: Everyone is back: the "26 of 77" in the top bar is gone, Values says Nodes 77, Edges 254,
and the step stays in the list marked "off". So I can switch it back on later. Done with the
prompt: 26 characters share 5 or more chapters with someone; all 77 are back.

Follow-up given: "Now the same for pairs who share 8 or more chapters: how many characters are in the
drawing then? Bring every character back when you are done."

Ruth: I'd rather change the 5 to an 8 than make a second step. Clicking on the step's words to
see if it opens for editing.

### 10 -- click the step's words
`node real.mjs --step $S --click-at 180,320`
Ruth: The form opened with my step in it, marked Off, Value 5, and a button "Save and turn on".
That's what I want. Clearing the 5, typing 8, Save and turn on.

### 11 -- select the Value text, type 8, Save and turn on
`node real.mjs --step $S --dblclick-at 1320,266 --key Control+a --type "8" --click "Save and turn on"`
Ruth: "17 of 77 nodes" in the top bar; Values: Nodes showing 17 of 77, Edges showing 19 of 254;
the step now reads "shared_chapters is at least 8 -- 77 to 17 nodes", ticked. I counted the dots
myself and got 16 -- two near the middle-left look stacked, so I can't confirm 17 from the
picture alone, but three readouts say 17. Answer: 17 characters. The drawing is in two pieces
now while "Components 1" sits underneath -- the line above it does say those counts are for the
whole graph, so that's fair, but I read it twice.
Bringing everyone back: unticking the step.

### 12 -- untick the step (tool: checkbox "Apply step: shared_chapters is at least 8")
`node real.mjs --step $S --click-at 274,326`
Ruth: All 77 back: Nodes 77, Edges 254, no "of 77" in the top bar, the step kept and marked
"off". Done.

### end
`node real.mjs --end $S` (run twice: the first --end printed the follow-up prompt, already done in steps 10-12; the second closed the session)

## Debrief (in character)

- **Finished?** Yes, both parts. 5 or more shared chapters: 26 of the 77 characters (51 of 254
  ties). 8 or more: 17 of 77 (19 of 254 ties). Every character brought back both times, by
  unticking the step; the step itself stays in the list, switched off, which I liked.
- **Ease: 6 of 7.**
- **What helped:** the Data side listed my chapter column by its own name, and the step form
  said in plain words "Keeps edges that pass and the nodes at their ends" -- that's what told me
  the character count would be the people at the ends of strong ties. The count showed in three
  places that agreed (top bar, the step's "77 to 26 nodes", Nodes showing). The legend saying
  "PageRank on 77 nodes" told me the earlier ranking wasn't quietly redone on the cut.
  Editing the step and "Save and turn on" made the second question one change, not a new step.
- **What confused me / slowed me:**
  - The place is called "Filters" and lives under Data; I only found it because I went looking
    for where the numbers live. Nothing near the drawing or the toolbar points there.
  - The column name "shared_chapters" appears twice on screen (left list and the dropdown); my
    first pick went to the left one, which threw away the half-filled form with no warning. A
    slip on my part, but the form vanishing silently cost me two steps.
  - I can't see the names of the 26 or 17 characters anywhere without hunting; for an essay I'd
    want that list. Counting dots gave me 16, not 17 -- two dots sit on top of each other -- so
    I can't check the count against the picture.
  - With only the strong ties showing, the drawing split into two pieces but "Components 1" sat
    just below; the line saying those numbers are for the whole graph explains it, but I read
    it twice.
