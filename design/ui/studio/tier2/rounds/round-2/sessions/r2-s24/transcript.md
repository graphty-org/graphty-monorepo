# Session r2-s24 -- Nadia (returning), T17 prompt B (Les Miserables)

Build: frozen build named on the first line of tier2/criteria.md (8f0d5a6f7791).
Start: `REAL_DIST=<that build> node tool/real.mjs --start rounds/round-2/sessions/r2-s24 setup:lesmis-ranked.txt` -> 01.png

## Steps

**01.png** -- Les Miserables is open, colored and sized by PageRank, which I recognize from ranking people before. Left rail has Graph, Data, Notes. I need only the ties with 5 or more shared chapters. I have never made it show part of a network, so first I want to see what the tie numbers are called -- I'll open Data.

Command: `node tool/real.mjs --step <session> --click "Data"` -> 02.png

**02.png** -- Data shows 77 nodes, 254 edges. The edge column is shared_chapters, that's my number. There's a "Filters" heading with a plus. I've never used it, but "filter" sounds like what QA would call "showing only some". I'll press its plus.

Command: `--click-at 276,285` (the tool reported: button "Add filter step") -> 03.png

**03.png** -- A "New filter step" panel on the right: Keep "an attribute's value", then an empty Attribute box, and a greyed "Add step". Fine, I pick the attribute -- I'll open the Attribute list.

Command: `--click "Attribute"` -> 04.png

**04.png** -- The list shows Nodes (id, name) and Edges (shared_chapters). I want shared_chapters.

Command: `--click "shared_chapters"` -> 05.png (tool: ambiguous, the list option and the left tree item share the name; nothing happened). A tool limit, not something I saw -- I click the option in the open list.

Command: `--click "shared_chapters#1"`

**06.png** -- Now: Is "at least", Value empty, and a line "Keeps edges that pass and the nodes at their ends." That's what I want. I type 5 in Value.

Command: `--click "Value" --type "5"`

**07.png** -- Value shows 5, "Add step" is now blue. Nothing in the drawing changed yet, so it waits for the button. Pressing Add step.

Command: `--click "Add step"`

**08.png** -- The drawing shrank. Top bar says "26 of 77 nodes", the left list has "shared_chapters is at least 5 -- 77 to 26 nodes" with a ticked box, and the right panel says Nodes showing 26 of 77, Edges showing 51 of 254, and that the counts below are for the whole graph (77). Good, so the data itself is still all there -- that was my worry. Answer: 26 characters. Now bring them all back: I'll untick the box next to the step rather than delete it, in case I need it again.

Command: `--click-at 274,327` (the checkbox beside the step)

**09.png** -- Everything is back: no "26 of 77" in the top bar, Nodes 77, Edges 254, and the step stays in the list marked "off". Done with the prompt: 26 characters share 5 or more chapters with someone; every character is back.

(Moderator follow-up, given word for word: "Now the same for pairs who share 8 or more chapters: how many characters are in the drawing then? Bring every character back when you are done.")

I'd rather change the step I already have than make a new one. I'll click on the step's name to see if it opens for editing.

Command: `--click "shared_chapters is at least 5"`

**10.png** -- It opened the step on the right with Value 5 and a button "Save and turn on". Nice, it tells me it will switch it back on. I change 5 to 8.

Command: `--click "Value" --key Control+a --type "8"`

**11.png** -- Value now reads 8. Press "Save and turn on".

Command: `--click "Save and turn on"`

**12.png** -- Top bar "17 of 77 nodes", step reads "shared_chapters is at least 8 -- 77 to 17 nodes", Nodes showing 17 of 77, Edges 19 of 254. Answer: 17 characters. Now untick it again to bring everyone back.

Command: `--click-at 274,327`

**13.png** -- All 77 back, 254 edges, step "off". Done with the follow-up too.

Command: `node tool/real.mjs --end <session>`

## End of session (in character)

**Finished?** Yes, both parts. 5 or more shared chapters: 26 characters (51 ties). 8 or more: 17 characters (19 ties). Both times every character was brought back by unticking the step (77 nodes, 254 edges).

**Ease:** 6 of 7. Thirteen screenshots, about as long as a quick alert.

**What confused me / notes:**
- I had to guess where this lived. I went to Data only to read the column name and happened to see "Filters" with a plus; from the Graph view I would not have known to look there. The toolbar I usually use gave no hint.
- The step's panel was clear: picking shared_chapters gave "at least" already, and the line "Keeps edges that pass and the nodes at their ends" answered my question about what happens to the characters.
- My usual worry -- did I change the data or only the picture -- was answered by the right panel ("Nodes showing 26 of 77" and "The counts below are for the whole graph"). That is the line I would copy into a case note.
- Bringing everyone back: I guessed that unticking the box was "off, not deleted", and the "off" label confirmed it. Without trying it I would not have been sure the box wasn't "select".
- Editing the step to 8 was easy; "Save and turn on" told me exactly what would happen.
- The key in the corner still says "PageRank on 77 nodes" while only 26 are showing; I wasn't sure whether the ranking had been redone for the smaller picture. It says 77, so I guess not, but QA would ask.
- No implementation problems hit: nothing failed, nothing froze. The only snag was the testing tool refusing "shared_chapters" because the open list and the left-hand tree share the name; a person clicking would not have hit that.

Session note: the first `--end` printed the follow-up request and kept the session open; the follow-up had already been done in steps 10-13 (it is in the task text), so `--end` was run a second time and the session closed. work.json shows nothing from the start was lost; the one filter step is left in the list, turned off.
