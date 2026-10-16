# Session r2-s33 -- Dev (returning student), task T21 prompt A (running club)

Build: the frozen build named in tier2/criteria.md (REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7). Setup: friends-ranked.txt.

Commands are run from `design/ui/studio/tier2` as `REAL_DIST=... node ../tool/real.mjs <args> $S`, where $S is this session folder.

## Steps

### 01 -- start
`--start $S setup:friends-ranked.txt` -> 01.png

Dev: "Okay, this is my running club map from last month. friends.csv, the PageRank ranking, dots sized and colored by it. Before I swap the file I want to write down who was first. There's a Values tab next to Style on the right -- that sounds like the numbers."

### 02 -- Values tab
`--step $S --click "Values"` -> 02.png

Dev: "Oh nice, a Top 10. Farah is first, 0.06394, then Hana, then Milo. Writing that down: before = Farah. It also says under Made with: weight (read as closer), 'its meaning was not set'. Hm, okay. Now the new file. Last time I opened the spreadsheet from the menu in the top left, so I'll start there."

### 03 -- hover the menu icon
`--step $S --hover-icon 1` -> 03.png. Tooltip: "Main menu: open, save, export, settings".

Dev: "Yep, 'open' is in there. Clicking it."

### 04 -- main menu open
`--step $S --click-at 24,20` -> 04.png

Dev: "Menu: New project, Open project or file, Open sample, Save... There's nothing that says 'swap the file' or anything. Wait, is 'Open project or file' going to throw away my map and start over? That's what I'm scared of. But it's the only door I know, so I'll try it with friends-v2.csv and see if it asks me what to do with it."

### 05 -- the file opens as "Add to friends"
`--step $S --click "Open project or file..." --upload friends-v2.csv` -> 05.png

Dev: "Okay, it didn't wipe my map, it says 'Add to friends'. Good. But wait -- 'friends-v2 adds 0 nodes, 41 edges' and at the bottom 'the load makes 20 nodes and 82 edges'. 82 is double! I don't want the old ties AND the new ties, I want the new ones instead of the old ones. There's no button that says that, only Cancel and Load. There's also a 'Higher means' thing for weight, Not set / Closer / Farther. The task didn't say anything changed about what the number means, so I'll leave that. I'm not loading 82 edges. Cancel, and I'll look in the Data tab on the left instead -- that's where the file should live."

### 06 -- cancelled, back on the map
`--step $S --click "Cancel"` -> 06.png

Dev: "Phew, map is the same, Farah still first. Now the Data button on the left, under Graph."

### 07 -- Data panel
`--step $S --click "Data"` -> 07.png

Dev: "There it is: Sources, friends.csv, 20 nodes, 41 edges. That's the file I want to swap. There's no button next to it though. I'll click on it and see what it offers."

### 08 -- friends.csv selected
`--step $S --click "friends.csv"` -> 08.png

Dev: "It opened a table of the old ties at the bottom and a friends.csv panel on the right: Loaded, 20 nodes, 41 edges. There's a little three-dots menu at the top right of that panel. Last time menus like that had the hidden stuff. Trying it."

### 09 -- source actions menu
`--step $S --click-at 1419,73` -> 09.png

Dev: "'Edit source...' and 'Replace with file...'. Replace with file! That's literally what I want. Took me a while -- I'd never have guessed it was behind the dots on the right side of the Data tab. Clicking it and picking friends-v2.csv."

### 10 -- Replace dialog
`--step $S --click "Replace with file..." --upload friends-v2.csv` -> 10.png

Dev: "'Replace: friends-v2.csv. Was 20 nodes, 41 edges; now 20, 41.' Okay that's what I expected, same people, same ties, new numbers. Bottom says the load makes 20 nodes and 41 edges, not 82. The weight 'Higher means' is Not set again, same as last time, and the note says PageRank reads higher as closer, which is what my old ranking used, so it's the same rules. Clicking Replace."

### 11 -- replaced
`--step $S --click "Replace"` -> 11.png

Dev: "It switched me back to Graph and the header says friends-v2.csv now. The table at the bottom shows the new weights (Ava-Chloe is 1 now, it was 5). And the key on the map says 'PageRank, out of date' -- oh that's helpful, it knows my ranking is from the old numbers. My colors and sizes are still there. The PageRank row on the left has a little clock-arrow icon now. I'll click PageRank to redo it."

### 12 -- PageRank, "Data changed since this run"
`--step $S --click "PageRank"` -> 12.png

Dev: "Big blue 'Rerun' with 'Data changed since this run'. Easy. The Top 10 still shows the old numbers (Farah first), which makes sense because it hasn't redone it yet. Clicking Rerun."

### 13 -- reran
`--step $S --click "Rerun"` -> 13.png

Dev: "Done! Ran Oct 9, 8:26:06 PM now, the 'out of date' is gone from the key, and the sizes and colors moved -- there's a big dark dot in the middle now. Top 10: Ava 0.08012 first, then Farah 0.06556, Hana 0.06428. So Farah dropped to second and Ava went from not even in the top 10 to first. Made with still says weight read as closer, same as the first run, so it's apples to apples. Let me save so I don't lose it -- Control+S like last time."

### 14 -- save dialog
`--step $S --key Control+s` -> 14.png

Dev: "'Save friends as', name friends. Fine, keep the name. Save."

### 15 -- saved
`--step $S --click "Save"` -> 15.png. Notice: "Saved friends in this browser."

Dev: "Saved. I'm done."

`--end $S`

## End of session (in character)

**Finished?** Yes. The old list is swapped for friends-v2.csv (20 people, 41 ties, nothing doubled), the ranking is redone on the new numbers, my colors and sizes and the key kept working, and I saved.

**Answer:** "Before, Farah was first (PageRank 0.06394). Now, on this month's numbers, Ava is first (0.08012) and Farah is second (0.06556)."

**Ease:** 5 out of 7.

**What confused me:**
- The first place I looked was the main menu, because that's how I opened the spreadsheet last time. "Open project or file" opened the new file as "Add to friends" and said the load would make 82 edges -- that's both lists on top of each other. There was no choice there to use it instead of the old one, just Cancel and Load. If I hadn't read the 82 I would have pressed Load and had doubled ties without knowing.
- "Replace with file..." is exactly the right thing, but it's hidden behind a three-dots button on the right side of the Data tab, only after clicking the file name. I found it on my second try, and only because I poke at "..." menus. A classmate who doesn't might give up or load the doubled version.
- After the swap, it was really clear: the key said "PageRank, out of date" and the PageRank panel said "Data changed since this run" with a blue Rerun button. That part was easy.
- Small thing: after the swap, the Top 10 kept showing the old values until I pressed Rerun. I understood why because of the "out of date" words, but I had to look twice to make sure the table wasn't the new result.
- I liked that "Made with" still said weight read as closer, so I could tell myself the old run and the new run used the same rule.
