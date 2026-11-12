# Session r2-s46 -- Jordan (returning marketing analyst), task T19 prompt B (Florentine families)

Build: 8f0d5a6f7791 (`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/`)

```
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/ node tool/real.mjs --start tier2/rounds/round-2/sessions/r2-s46 setup:florentine-ranked.txt
```

## Step 01 (start)

01.png: The Florentine families network is open with a PageRank run on the left list, sizing and coloring the dots. The right side shows the run's Style. On the far left rail I see Graph, Data and -- something I don't remember -- "Notes". A reminder is basically a note, so I'll try that first.

`node tool/real.mjs --step $S --click "Notes"` -> 02.png

## Step 02

02.png: A Notes panel, "No notes.", with a plus at the top right of it. That plus is probably how I make one. I'll click it and see whether it asks what the note is about.

`node tool/real.mjs --step $S --click-at 276,60` -> "button Add note", 03.png

## Step 03

03.png: A box opened that says "About PageRank". So the note goes onto whatever is open on the right -- right now that's my PageRank run, not the Medici. I'll cancel, then pick the Medici first (the find box is how I usually get to one family) and try again.

`node tool/real.mjs --step $S --click "Cancel"` -> 04.png (the note box closed)
`node tool/real.mjs --step $S --click "Graph"` -> 05.png

## Step 05

05.png: Back on the Graph list. I'll type Medici into the find box, the way I always look up one customer.

`node tool/real.mjs --step $S --click "Find nodes, edges, values" --type "Medici"` -> 06.png

## Step 06

06.png: The find list shows one node, Medici, and six of its ties. I'll click the Medici node row so the right panel is about the Medici.

`node tool/real.mjs --step $S --click-at 116,153` -> option "Medici", 07.png

## Step 07

07.png: The Medici is highlighted with a yellow glow and the right panel now says "Medici, Node" with its values (PageRank #1 of 15). Nothing here to write in, so back to Notes and its plus -- hopefully it now says "About Medici".

`node tool/real.mjs --step $S --click "Notes"` -> 08.png

## Step 08

08.png: Notes panel again, Medici still selected on the right. Clicking the plus.

`node tool/real.mjs --step $S --click "Add note"` -> 09.png

## Step 09

09.png: Now it says "About Medici" -- good, it follows what I picked. The box has a blue outline so I think I can just type. Typing the reminder.

`node tool/real.mjs --step $S --type "Check the 1434 return from exile"` -> 10.png

## Step 10

10.png: The text is in the box under "About Medici". Clicking "Save note".

`node tool/real.mjs --step $S --click "Save note"` -> 11.png

## Step 11

11.png: The note is listed with a "Medici" tag and a date, and the right panel under Medici now says "1 note". Nice. Now the one about the whole network. When the PageRank run was open, the box said "About PageRank", so I need the whole network to be what's picked. I'll click empty canvas to let go of the Medici and see what the right side shows.

`node tool/real.mjs --step $S --click-at 1050,700` -> empty canvas, 12.png

## Step 12

12.png: The right panel now says "Graph -- From Florentine families" with the overview (15 nodes, 20 edges). That's the whole network. Plus button again.

`node tool/real.mjs --step $S --click "Add note"` -> 13.png

## Step 13

13.png: "About Graph". That's the network as a whole. Typing the second reminder and saving it in one go.

`node tool/real.mjs --step $S --type "Marriages only; business ties are a separate list" --click "Save note"` -> 14.png

## Step 14

14.png: Both reminders are listed: the network one tagged "Graph", the Medici one tagged "Medici". But "saved" here just means it's in the list -- the top bar still says "Local only", and I've lost work before by trusting that. To be sure they're there next time I'll save the project like I always do, Control+S.

`node tool/real.mjs --step $S --key Control+s` -> 15.png

## Step 15

15.png: "Save Florentine families as", name filled in. The name is fine. Save.

`node tool/real.mjs --step $S --click "Save"` -> 16.png

## Step 16

16.png: "Saved Florentine families in this browser." The top bar still says "Local only", which I guess means the same thing (in this browser, not in the cloud). I don't believe a save until I've reopened it, so I'll close and come back.

`node tool/real.mjs --step $S --reopen` -> 17.png

## Step 17

17.png: Start screen. Under Recent projects: "Florentine families -- In this browser - 15 nodes - Oct 9, 8:59 PM". There's a warning that the browser can clear projects kept here and to save a local copy -- noted, but first I'll check the reminders survived. Clicking the recent project (not the sample of the same name on the right).

`node tool/real.mjs --step $S --click-at 624,108` -> gridcell "Florentine families In this browser...", 18.png

## Step 18

18.png: "Opened Florentine families", PageRank run still there, and the Graph panel on the right says "1 note" next to "From Florentine families". Good sign. Opening Notes to read both.

`node tool/real.mjs --step $S --click "Notes"` -> 19.png

## Step 19

19.png: Both reminders came back after closing and reopening: "Marriages only; business ties are a separate list" (Graph) and "Check the 1434 return from exile" (Medici). This Notes list is where I'd read them. One last check: does the Medici tag take me to the family, so I could also find the reminder from the Medici side?

`node tool/real.mjs --step $S --click-at 114,218` -> button "Medici, in note: Check the 1434 return from exile", 20.png

## Step 20

20.png: Clicking the Medici tag picked the Medici on the map (yellow glow) and the right panel says "Medici, Node, 1 note". So I can read the reminders in the Notes list, and the family itself shows it has a note. I'm done.

`node tool/real.mjs --end $S`

## Wrap-up (Jordan, in character)

- **Finished?** Yes. Two reminders: "Check the 1434 return from exile" on the Medici, and "Marriages only; business ties are a separate list" on the network as a whole. I saved the project (Control+S, "Saved Florentine families in this browser"), closed it, reopened it from Recent projects, and both were there in the Notes list on the left rail. The Medici's panel and the network's panel each also say "1 note".
- **Ease:** 6 of 7.
- **What confused me:**
  - The first time I pressed the plus, the box said "About PageRank", because my PageRank run happened to be open on the right. I didn't expect the reminder to latch onto whatever is open over there; I had to back out, pick the Medici in the find box, and try again. For the whole-network reminder I had to guess that clicking empty canvas would make it "Graph". It worked, but nothing in the Notes panel told me how to choose what a note is about.
  - The top bar says "Local only" before and after I saved, so it never told me whether there was unsaved work. The toast "Saved ... in this browser" and the warning on the start screen that the browser can clear projects make me want a real file copy too for anything I'd keep for months.
  - "Save note" only puts it in the list; it doesn't keep it past closing until you save the project. I knew to save because I always do, but someone else might assume "Save note" was enough.
