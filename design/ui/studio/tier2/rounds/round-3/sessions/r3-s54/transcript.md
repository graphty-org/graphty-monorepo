# Session r3-s54 -- Jordan, returning user

Task: leave two reminders (one on Farah, one on the whole club), make sure they persist, show where to read them.

Note: `--brief` wrote the briefing into the tool's session folder under tmp/studio-sessions (it exited 2 although the briefing was written); the session runs there.

All commands use `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/ node design/ui/studio/tool/real.mjs` (abbreviated `real.mjs`) with folder `$S` = this session folder.

## Step 1 -- start
`real.mjs --start $S setup:friends-ranked.txt` -> 01.png
Jordan: "OK, the club list is up, PageRank run sitting there. Left rail says Graph, Data, Notes. Notes -- that's obviously where reminders go. I'll click it."

## Step 2
`real.mjs --step $S --click "Notes"` -> 02.png
Jordan: "Notes panel, 'No notes.' and a plus at the top. I'll hover the plus first to see what it adds -- a note on the whole thing, or on a person?"

## Step 3
`real.mjs --step $S --hover-at 276,60` -> 03.png. Tooltip "Add note N".
Jordan: "Just 'Add note'. Nothing's selected, so I'll start with the club-wide one and see what it attaches to."

## Step 4
`real.mjs --step $S --click "Add note"` -> 04.png. A box opened labeled "About PageRank".
Jordan: "Hm, 'About PageRank'. I don't want the note on the PageRank run, I want it on the club. It picked up whatever's open on the right. Cancel, and get the right side to show the whole graph first."

## Step 5
`real.mjs --step $S --click "Cancel" --click "Graph"` -> 05.png
Jordan: "Back on the Graph list. I'll click the 'Graph friends.csv' line at the top -- that should be the club as a whole."

## Step 6
`real.mjs --step $S --click-at 140,61` -> 06.png. Right side now says "Graph, From friends.csv" with the overview (20 nodes, 41 edges).
Jordan: "Good, that's the club. Back to Notes and Add note -- hopefully it says 'About Graph' now."

## Step 7
`real.mjs --step $S --click "Notes" --click "Add note"` -> 07.png. Box says "About Graph".
Jordan: "'About Graph'. That's the one. Typing the club note and saving."

## Step 8
`real.mjs --step $S --click-at 180,131 --type "Spring list, checked against the sign-up sheet" --click "Save note"` -> 08.png. Note saved, tagged "Graph", dated Oct 10 6:31 PM; the right side now says "1 note" next to "From friends.csv".
Jordan: "Fine, club note's in. Now Farah. No names on the map -- typical hairball-lite -- so I'll do what I always do: find box on the Graph panel, type Farah."

## Step 9
`real.mjs --step $S --click "Graph" --click "Find nodes, edges, values" --type "Farah"` -> 09.png. Refused as ambiguous ("Graph" is the rail button, the note's tag and a heading); nothing happened.
Jordan: "Misclick on my part. I'll hit the Graph icon on the far left rail."

## Step 10
`real.mjs --step $S --click-at 28,75 --click "Find nodes, edges, values" --type "Farah"` -> 10.png. Find shows Nodes 1: Farah, and 4 edges.
Jordan: "There she is. Click Farah so the right side is about her, then add the note."

## Step 11
`real.mjs --step $S --click-at 112,153` -> 11.png. Farah selected (yellow halo, bottom middle), right side shows "Farah, Node", PageRank 0.06394, #1 of 20.
Jordan: "Farah's top of PageRank -- makes sense, she runs the Tuesday thing, so losing her matters. Right side is about her now. Notes, Add note."

## Step 12
`real.mjs --step $S --click-at 28,187 --click "Add note"` -> 12.png. Box says "About Farah"; the club note sits underneath.
Jordan: "'About Farah'. Typing it in."

## Step 13
`real.mjs --step $S --click-at 180,131 --type "Moving away in May; ask who takes over the Tuesday run" --click "Save note"` -> 13.png. Two notes listed: Farah's (tag "Farah", 6:32 PM) and the club one (tag "Graph"). Farah's panel on the right says "Node, 1 note".
Jordan: "Both in. But 'Save note' just means saved into this screen -- does the project itself save? Top bar says 'Local only', no 'saved' anywhere. Main menu, look for Save."

## Step 14
`real.mjs --step $S --click "Main menu"` -> 14.png. Menu: Back to start, New project, Open project or file, Open sample, Save (Ctrl+S), Save as..., Save local copy..., Export..., Rename, Settings, Keyboard shortcuts, Help.
Jordan: "Save, Save as, Save local copy -- three saves, slightly annoying. Plain 'Save' is what I want."

## Step 15
`real.mjs --step $S --click "Save"` -> 15.png. Dialog "Save friends as", Name field "friends", Cancel / Save.
Jordan: "So it was never saved before -- I'd assumed it was. It asks for a name but not WHERE it goes. Top bar said 'Local only', so presumably this browser, not a server. It's a running club list, not customer emails, so I'll let it go. Keep 'friends', Save."

## Step 16
`real.mjs --step $S --click-at 922,500` -> 16.png. Toast: "Saved friends in this browser."
Jordan: "'In this browser' -- OK, that answers the where, at least after the fact. I don't trust a save until I've seen it come back, so: close the tab and open the app again."

## Step 17
`real.mjs --step $S --reopen` -> 17.png. Start screen. Recent projects: "friends -- In this browser - 20 nodes - Oct 10, 6:32 PM", with the line "This browser can clear projects kept here. Save a local copy of any project you need to keep." Under Start: "Files are read on this computer and never uploaded."
Jordan: "OK, 'never uploaded' -- that's the sentence legal wants, good, though I only see it on the start screen. And a warning that the browser can wipe it. Noted. First let me open friends and check the notes are actually in it."

## Step 18
`real.mjs --step $S --click-at 593,108` -> 18.png. "Opened friends"; it even reopened with Farah selected, right side "Node, 1 note".
Jordan: "Came back where I left it, Farah still selected, '1 note' by her name. Let me look in Notes to see both."

## Step 19
`real.mjs --step $S --click-at 28,187` -> 19.png. Notes panel after reopening: both notes, Farah's (tag Farah) and the club one (tag Graph), with their times.
Jordan: "Both survived. But the start screen literally told me the browser can clear these. IT wipes our Chrome profiles whenever they feel like it, so I'm also taking a local copy. Main menu, Save local copy."

## Step 20
`real.mjs --step $S --click "Main menu" --click "Save local copy..."` -> 20.png. A file downloaded: friends.graphty.json (8,423 bytes). The app itself showed no message this time; only the browser's download told me.
Jordan: "Downloaded, fine -- Chrome told me, the app didn't say anything. I'm done: two notes, saved in the browser, checked after reopening, and a file copy as backup. Where I'd read them: the Notes button on the left rail; Farah's also shows as '1 note' next to her name on the right when she's selected, and the club's as '1 note' on the Graph panel."

## End
`real.mjs --end $S` -- session ended (copied to the design sessions folder).

## Debrief (Jordan, in character)

**Did I finish?** Yes. Farah's note ("Moving away in May; ask who takes over the Tuesday run") is attached to Farah; the club note ("Spring list, checked against the sign-up sheet") is attached to the graph. I saved, closed the tab, reopened from Recent projects and both were there. I also took a local file copy because the start screen warns the browser can clear projects.

**Where I'd read them:** the Notes button on the left rail lists both, each tagged with what it is about. Farah's shows as "1 note" next to her name in the right panel when she's selected; the club's shows as "1 note" next to "From friends.csv" when the graph overview is open.

**Ease: 5 / 7.**

**What confused me:**
- The first "Add note" silently attached itself to "About PageRank" -- whatever happened to be open on the right. Nothing on the Notes panel tells you that, or lets you change the target in the box; I had to cancel, go to the Graph panel, click the graph name, and come back. If I'd typed fast and hit Save, the club note would have been filed under a PageRank run.
- I assumed the project was already saved; Save opened a "Save friends as" naming dialog, so it never had been. Notes are "saved" with "Save note" but the project isn't -- two different meanings of saved, and the top bar ("Local only") gives no unsaved signal I could see.
- The save dialog didn't say where it saves; only the toast after ("Saved friends in this browser") did. Three save items in the menu (Save, Save as, Save local copy) -- I had to guess which one survives a browser wipe, and only the start screen's small print answered it.
- "Save local copy..." downloaded the file with no message from the app at all.
- Minor: the canvas has no names on it, so finding Farah meant the find box, as usual.

**Off-topic grumble:** if this were the customer list rather than the running club, the "never uploaded" line is exactly what I'd need -- but it only shows on the start screen, not when I'm saving.
