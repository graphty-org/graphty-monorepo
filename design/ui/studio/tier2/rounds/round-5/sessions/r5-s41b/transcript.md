# Session r5-s41b -- transcript

Participant: Tom, returning user. Task: replace friends.csv with friends-v2.csv without losing the work, redo the ranking, and say who was first before and who is first now.

Commands run from /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1 with
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ and S=tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s41b

## 01.png (session already started)
Tom: "Right, that's last month's. friends.csv, the PageRank thing is there, orange balls. No names on them though. First I need to know who was on top before I touch anything. There's a 'Values' tab on the right, I'll try that."

## Step 1
Command: `real.mjs --step $S --click "Values"` -> 02.png
Sees: a "Top 10" list. Farah 0.06394 at the top, then Hana 0.05941, Milo 0.05648. "20 of 20 have a value."
Tom: "Good. Farah was first before. I'll write that down. Now the new list. I don't see a File menu as such; the three lines top left is probably the menu. I'll try that."

## Step 2
Command: `real.mjs --step $S --click "Main menu"` -> 03.png
Sees: New project, Open project or file..., Open sample, Save, Save as..., Export..., Rename, Settings, Help. Nothing that says "new version" or "update".
Tom: "'Open project or file' is how I always open things, but last time that gave me a fresh picture. If I open the new list that way I think I lose the ranking. I'm not doing that yet. There's a 'Data' button on the left, I'll look there first."

## Step 3
Command: `real.mjs --step $S --key Escape --click "Data"` -> 04.png
Sees: "Sources: friends.csv, 20 nodes, 41 edges". Filters, Attributes.
Tom: "There's the old file listed under Sources. Maybe if I click on it, it lets me swap it."

## Step 4
Command: `real.mjs --step $S --click-at 160,141` (treeitem "friends.csv") -> 05.png
Sees: right side now says "friends.csv, Source, Loaded: Nodes 20, Edges 41" and a table opened at the bottom with the rows. There are three little dots at the top right of that panel.
Tom: "It shows me the old file. No button saying 'new version'. The three dots are the only thing left, I'll look in there."

## Step 5
Command: `real.mjs --step $S --click-at 1420,73` (button "Source actions") -> 06.png
Sees: a small menu: "Edit source..." and "Replace with file...".
Tom: "'Replace' makes me nervous, normally I'd never press that. But it's the running club list, not lab data, and replacing the old list is literally what I've been asked. If it asks me anything I'll read it before I press. Picking friends-v2.csv from Downloads."

## Step 6
Command: `real.mjs --step $S --click "Replace with file..." --upload friends-v2.csv` -> 07.png
Sees: a full page "Replace: friends-v2.csv. Was 20 nodes, 41 edges; now 20, 41." The table shows the new numbers (Ava-Chloe is 1 now, it was 5). There's a "Higher means: Not set / Closer / Farther / Capacity" question, and Cancel / Replace at the bottom right.
Tom: "Same twenty people, same 41 links, just new numbers. Good, that matches what she said. 'Higher means' -- I don't know, and I didn't pick that last time either, so I leave it alone. It says nothing about losing the ranking, which I'd have liked to see, but nothing scary either. Pressing Replace."

## Step 7
Command: `real.mjs --step $S --click "Replace"` -> 08.png
Sees: header now says "Graph friends-v2.csv". The PageRank row is still there with a little clock-like icon, and the legend top left says "Size: PageRank, out of date" and "Color: PageRank, out of date". Table shows Ava-Chloe 1.
Tom: "OK, the ranking is still there, it didn't throw it away. It tells me it's out of date, which is fair. Now how do I redo it? I'll click on the PageRank row and see if it offers to run it again."

## Step 8
Command: `real.mjs --step $S --click-at 160,156` (treeitem "PageRank, out of date") -> 09.png
Sees: right panel says "Data changed since this run" with a blue "Rerun" button. The Top 10 still shows the old list, Farah first, ran 10:36:49 AM.
Tom: "There it is: 'Data changed since this run', Rerun. Plain enough. The top ten below is still the old one, so I'll press Rerun and check the time changes."

## Step 9
Command: `real.mjs --step $S --click "Rerun"` -> 10.png
Sees: "ran Oct 11, 10:38:26 AM", the out-of-date marks are gone from the legend, and the Top 10 is new: Ava 0.08012, Farah 0.06556, Hana 0.06428, Ivan 0.06141 ... The big ball moved to the middle of the picture.
Tom: "Time changed, numbers changed, legend doesn't say out of date any more. Ava is first now, Farah dropped to second. Before I go I'll save it, like I did with the lab map, so it's still like this next time."

## Step 10
Command: `real.mjs --step $S --click "Main menu" --click "Save"` -> 11.png
Sees: a box "Save friends as", Name: friends, Cancel / Save.
Tom: "Hm, I pressed Save, not Save as, and it asks for a name anyway. I thought this was already saved last month. It's called 'friends', that's what it was, so I keep the name and press Save."

## Step 11
Command: `real.mjs --step $S --click "Save"` -> 12.png
Sees: a notice "Saved friends in this browser." The new top 10 is still there, Ava first.
Tom: "'Saved in this browser.' Fine, it's the running club. That's me done. Ending."

## End
Command: `real.mjs --end $S` -> "session ended", nothing further asked.

## In Tom's words, at the end
- **Finished:** yes. Before (friends.csv): Farah was first, 0.06394. Now (friends-v2.csv, rerun 10:38:26 AM): Ava is first, 0.08012, and Farah is second, 0.06556.
- **Ease:** 5 out of 7.
- **What confused me:**
  - The main menu had no way to bring in a newer list. "Open project or file" looked like it would start over and lose the ranking, so I didn't use it. I only found "Replace with file..." by going to Data, clicking the old file, then the three little dots. I'd not have looked there if I were in a hurry.
  - "Replace" is a word I normally won't press. Nothing on that screen said whether my ranking would survive; it turned out it did, but I only knew afterwards.
  - "Higher means: Not set / Closer / Farther / Capacity" -- I can't answer that, so I left it. The ranking panel later said it "assumed a higher weight means closer", which I suppose is fine.
  - I pressed Save and it asked me to name the file, like Save as. I thought it had been saved before.
- **What was good:** after replacing, it told me plainly the ranking was "out of date", and clicking it gave me "Data changed since this run" with a Rerun button. The new time and new top ten were easy to read.
