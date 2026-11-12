# Session r5-s46b -- Elena, returning user

Task: leave two reminders (one on the Medici, one on the whole network), make sure they survive the next visit, show where to read them.

All commands: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ node design/ui/studio/tool/real.mjs --step tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s46b <step>` (run from the worktree).

## 01 (start)
"OK, the Florentine one is open, ranked, orange dots. There's a Notes button on the left -- that's new to me. But first, the Medici are probably the big one in the middle. Let me click it."

## Step 1
Command: `--click-at 707,395`
Result (02.png): Medici selected, right side shows Medici, degree 6, PageRank #1 of 15. "Yep, the Medici. Biggest one, number one. Now where do I write on it? No note box here. Maybe the three dots menu at the top right."

## Step 2
Command: `--click-at 1419,74`
Result (03.png): a menu: Neighborhood, Path between..., Frame selection, Add note. "Add note! There it is."

## Step 3
Command: `--click "Add note"`
Result (04.png): the left side switched to Notes with a box "About Medici", Cancel and Save note. "Nice, it already knows it's about the Medici. The box looks ready, I'll just type."

## Step 4
Command: `--type "Check the 1434 return from exile"`
Result (05.png): text is in the box. "Good. Save."

## Step 5
Command: `--click "Save note"`
Result (06.png): the note is listed with a "Medici" tag and a date; the right side says "1 note". "Done, one down. Now one for the whole thing. There's a plus next to Notes. But Medici's still picked -- will it stick to Medici again? Let me try the plus and see what it says."

## Step 6
Command: `--click-at 276,60`
Result (07.png): a new box, but it says "About Medici" again. "Yeah, I thought so. That's not what I want. Cancel, then unpick the Medici by clicking on the empty background."

## Step 7
Command: `--click "Cancel"`
Result (08.png): nothing picked now; right side shows "Graph", 15 nodes, 20 edges. "OK, now it's the whole graph. Plus again."

## Step 8
Command: `--click-at 276,60`
Result (09.png): "About Graph" this time. "That's the whole thing. Type and save."

## Step 9
Command: `--type "Marriages only; business ties are a separate list" --click "Save note"`
Result (10.png): both notes in the list, one tagged "Graph", one "Medici". "Both there. Now -- will they still be there next time? Up top it says 'Local only', not sure what that means. Last time I never saved anything. I'll look in the menu for a Save."

## Step 10
Command: `--click "Main menu"`
Result (11.png): menu with Save, Save as..., Save local copy..., Export... "Save. Simple. Click it."

## Step 11
Command: `--click "Save"`
Result (12.png): a small "Save Florentine families as" box with the name filled in. "Name's fine. Save."

## Step 12
Command: `--click "Save"`
Result (13.png): message "Saved Florentine families in this browser." Top still says "Local only". "Saved in this browser -- that's my work laptop, fine. But I don't trust it till I see it. Let me close it and open it again like I'm coming back."

## Step 13
Command: `--reopen`
Result (14.png): start screen. Under "Recent projects": "Florentine families, In this browser - 15 nodes - Oct 11, 10:41 AM". Also a sample with the same name on the right. "There's mine, under Recent, with today's time. Not the sample one -- the recent one."

## Step 14
Command: `--click-at 624,108`
Result (15.png): "Opened Florentine families". Graph panel on the left; right side still says "1 note" next to the graph's name. Picture moved a bit. "It's back. The right side says 1 note, good sign. Let me open Notes to see both."

## Step 15
Command: `--click "Notes"`
Result (16.png): Notes panel lists both reminders after reopening: "Marriages only; business ties are a separate list" (tag Graph) and "Check the 1434 return from exile" (tag Medici), with times. "Both still there. This is where I'd read them: the Notes button on the left. The Medici one also shows as '1 note' when I click the Medici."

## End
Command: `--end`
Session ended normally.

## Afterwards, in character

- **Did I finish?** Yes. Both reminders are in, I saved, closed it, came back through Recent projects, and both were still in the Notes list.
- **Where I'd read them:** the Notes button on the left rail. The Medici one also shows up as "1 note" under the name when the Medici is picked, and the graph one as "1 note" when nothing is picked.
- **Ease:** 6 out of 7.
- **What confused me:**
  - The plus next to Notes made another note "About Medici" because the Medici was still picked. I only caught it because the box said "About Medici". I had to cancel and click the background first. I'd have liked to just pick "whole graph" right there.
  - "Local only" at the top, and the save message says "in this browser". I'm not sure what that means for next week. On the start screen there was a small line about the browser clearing projects and saving a local copy. I skimmed past it. Does "Save" keep it or not? It came back this time, so I'm going with yes.
  - The dots shifted a little when I opened it again. Not a big deal.
