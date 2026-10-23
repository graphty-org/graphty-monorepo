# Session r4-s56 -- Jordan, returning user

Task: leave two reminders (one on the Medici, one on the whole network), make sure they persist, show where to read them.

Command prefix: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ node design/ui/studio/tool/real.mjs` (run from the studio worktree), session folder `$S` = this folder.

## Step 01 -- start
Command: `--start $S setup:florentine-ranked.txt`
Florentine families open, PageRank run applied, sized and colored. Header says "Local only" -- good, nothing leaves my laptop. Left rail has a "Notes" icon. That's where I'd go first.

## Step 02 -- Notes
Command: `--step $S --click "Notes"`
Notes panel: "No notes." and a plus. No labels on the plus. I'll start with the whole-network note, then figure out how to pin one to the Medici. Clicking the plus.

## Step 03 -- Add note
Command: `--step $S --click-at 276,60` (button "Add note")
A note box opened, labeled "About PageRank". Huh -- it attached itself to the PageRank run because that's what's selected on the right. My marriages note isn't about PageRank, it's about the whole network. Cancel, go to Graph, pick "Everything", then add.

## Step 04 -- select Everything
Command: `--step $S --click "Cancel" --click "Graph" --click "Everything"`
"Everything" is highlighted, right panel says Everything. Now back to Notes and add -- hoping it says "About Everything" or about the network.

## Step 05 -- Add note again
Command: `--step $S --click "Notes" --click "Add note"`
Now it says "About Graph". Good, that's the whole network. Typing the note and saving.

## Step 06 -- network note saved
Command: `--step $S --click-at 180,131 --type "Marriages only; business ties are a separate list" --click "Save note"`
Note saved, tagged "Graph", timestamped. Fine. Now the Medici one. No labels on the canvas, so I'll use the find box like I always do: Graph tab, type Medici.

## Step 07 -- missed
Command: `--step $S --click "Graph" --click "Find nodes, edges, values" --type "Medici"`
My "Graph" click was ambiguous (the note's "Graph" chip has the same name as the rail button), so nothing happened. Clicking the rail icon by position instead.

## Step 08 -- found Medici
Command: `--step $S --click-at 28,75 --click "Find nodes, edges, values" --type "Medici"`
Medici shows under Nodes 1, plus its six marriages. Clicking the Medici node row to select it.

## Step 09 -- Medici selected
Command: `--step $S --click-at 160,153` (option "Medici")
Medici highlighted on the canvas, right panel shows Medici, PageRank #1 of 15 -- that's what I'd expect, so I trust it. Now Notes > Add note, hoping it says "About Medici".

## Step 10 -- "About Medici"
Command: `--step $S --click "Notes" --click "Add note"`
"About Medici", my Graph note sits below. Typing and saving.

## Step 11 -- both notes there
Command: `--step $S --click-at 180,131 --type "Check the 1434 return from exile" --click "Save note"`
Both notes listed, tagged Medici and Graph. The Medici panel now says "1 note" next to "Node" -- nice touch. Now: will these survive? Header says "Local only", which I read as "stays on my laptop", but does it save itself? I never saw a "saved" sign. Checking the main menu for Save.

## Step 12 -- main menu
Command: `--step $S --click "Main menu"`
Save (Ctrl+S), Save as..., Save local copy..., Export. "Local only" plus a Save means it probably isn't saved yet. Clicking Save.

## Step 13 -- Save dialog
Command: `--step $S --click "Save"`
"Save Florentine families as", name prefilled. So it wasn't saved before -- glad I checked. It doesn't say where it saves (browser? a file?). Keeping the name, Save.

## Step 14 -- saved
Command: `--step $S --click "Save"`
Toast: "Saved Florentine families in this browser." OK -- so "Local only" meant it's in my browser, not a file. Header still says "Local only", no "saved" mark, so I can't tell at a glance later. I don't trust it until I see it come back: closing and reopening the app.

## Step 15 -- reopened
Command: `--step $S --reopen`
Start screen. Recent projects: "Florentine families -- In this browser - 15 nodes - Oct 11, 3:47 AM". Under it: "This browser can clear projects kept here. Save a local copy of any project you need to keep." Hm, that's a warning I'll take seriously -- our IT wipes browser data. First, open it and check the notes came back.

## Step 16 -- project reopened
Command: `--step $S --click-at 688,115`
"Opened Florentine families". It even kept Medici selected, and the panel still says "1 note". Opening the Notes panel to see both.

## Step 17 -- both notes back
Command: `--step $S --click "Notes"`
Both notes, same text, same tags, same timestamps. That's where I'd read them: the Notes tab on the left rail, and the "1 note" link on Medici's panel. Because the start screen warned the browser can clear projects, I'll also save a local copy as a backup.

## Step 18 -- local copy
Command: `--step $S --click "Main menu" --click "Save local copy..."`
The browser downloaded "Florentine families.graphty.json" (7.5 KB). The app itself showed nothing -- no toast, no "backed up" mark; I only know because my downloads bar would show it. Fine. I'm done.

## End
Command: `--end $S`

**Did I finish?** Yes. Two notes: "Check the 1434 return from exile" tagged Medici, and "Marriages only; business ties are a separate list" tagged Graph. Saved in the browser, closed and reopened -- both came back. I read them in the Notes tab on the left rail; the Medici one is also flagged as "1 note" on Medici's own panel. I also saved a local copy file as a backup.

**Ease: 5 of 7.**

**What confused me:**
- "Add note" silently attaches to whatever is selected on the right. My first try said "About PageRank" because the PageRank run happened to be selected. I had to cancel, go to Graph, pick "Everything" and come back to get a whole-network note ("About Graph"). There's no way to change what a note is about from inside the note box.
- The note's "Graph" tag has the same name as the "Graph" button in the left rail -- I clicked "Graph" and got the wrong one / nothing.
- I couldn't tell whether my work was saved. The header said "Local only" before and after saving; only the Save dialog told me it hadn't been saved yet, and only a toast told me it went "in this browser". No saved/unsaved mark anywhere.
- The start screen says the browser can clear saved projects -- good to know, but it means "saved" isn't really safe. "Save local copy..." gave no confirmation inside the app.
- Off topic: this is the same problem as our listening suite, where "saved views" vanished after the SSO migration and nobody told us. I keep a notes doc outside every tool for exactly that reason.
