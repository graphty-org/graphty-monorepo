# Session r3-s52 -- Grace, returning

Screenshots 01.png to 17.png are in this folder.
Every command ran from the studio worktree with REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/ and session folder S=tmp/studio-sessions/tier2/rounds/round-3/sessions/r3-s52.

Task: leave two reminders, one about Farah and one about the whole club. Make sure both are still there next time, and show where to read them.

## Step 1 -- start
`node design/ui/studio/tool/real.mjs --start $S setup:friends-ranked.txt` -> 01.png.
friends is open, colored by the PageRank ranking, with "Local only" at the top. The left rail has Graph, Data, and a "Notes" place I never used. That looks like where reminders go. Next: click Notes.

## Step 2
`--step $S --click "Notes"` -> 02.png.
A Notes panel says "No notes." and has a + at the top right. Good, plain words. But the Farah reminder should sit on Farah, and I can't see names on the dots. Next: hover the + to see what it adds.

## Step 3
`--step $S --hover-at 276,60` -> 03.png.
The tooltip says "Add note N" (N must be a shortcut). Next: click Add note and see what it asks.

## Step 4
`--step $S --click "Add note"` -> 04.png.
A box opened, labeled "About PageRank". So the note attaches to whatever is picked on the right, and right now that's my ranking. That's not what I want for Farah. Next: Cancel, then find Farah first.

## Step 5
`--step $S --click "Cancel" --click "Graph"` -> 05.png.
Back on Graph, with the find box. Next: type Farah in the find box.

## Step 6
`--step $S --click "Find nodes, edges, values" --type "Farah"` -> 06.png.
It shows "Nodes 1: Farah" and her 4 ties. Next: click Farah so she's the thing picked on the right.

## Step 7
`--step $S --click-at 112,153` (option "Farah") -> 07.png.
Farah is picked: the right panel says "Farah, Node" and PageRank #1 of 20, and her dot has a yellow ring. Next: Notes, then Add note, hoping it now says "About Farah".

## Step 8
`--step $S --click "Notes" --click "Add note"` -> 08.png.
This time it says "About Farah". Next: type the reminder and press Save note.

## Step 9
`--step $S --type "Moving away in May; ask who takes over the Tuesday run" --click "Save note"` -> 09.png.
Saved. The note shows with a "Farah" tag and a date, and the right panel now says "Node 1 note" under Farah. Nice. The club reminder shouldn't be about Farah or about PageRank. Next: click empty space to let go of Farah, then Add note.

## Step 10
`--step $S --click-at 1100,820 --click "Add note"` (empty canvas) -> 10.png.
It says "About Graph", and the right panel shows the whole graph: 20 nodes and 41 edges. That matches my 20 people and 41 rows. Next: type the club reminder and save it.

## Step 11
`--step $S --type "Spring list, checked against the sign-up sheet" --click "Save note"` -> 11.png.
Both reminders are listed in Notes: "Spring list..." tagged Graph and "Moving away in May..." tagged Farah. But will they be there next time? The top says "friends" and "Local only", and nothing says it's saved. Last time I saved the project from the menu. Next: open the main menu and look for Save.

## Step 12
`--step $S --click "Main menu"` -> 12.png.
The menu has Save (Ctrl+S), Save as..., Save local copy... and Export.... I'll press Save, like last time.

## Step 13
`--step $S --click "Save"` -> 13.png.
A dialog: "Save friends as", with the name "friends" highlighted. So this was never saved. Good thing I checked. Next: name it "running club" and save.

## Step 14
`--step $S --type "running club" --click "Save"` -> 14.png.
The title is now "running club", and a notice says "Saved running club in this browser." Both notes are still listed. I trust it, but I want to see it for myself. Next: close the tab and come back, as if it were tomorrow morning.

## Step 15
`--step $S --reopen` -> 15.png.
The start screen's Recent projects shows "running club, In this browser - 20 nodes - Oct 10, 6:29 PM". The small print says "This browser can clear projects kept here. Save a local copy of any project you need to keep." Noted. Next: open running club.

## Step 16
`--step $S --click "running club"` -> 16.png.
"Opened running club." It has 20 nodes and 41 edges, my PageRank colors are back, and the right panel says "From friends.csv  1 note" for the graph. Next: open Notes and read both.

## Step 17
`--step $S --click "Notes"` -> 17.png.
Both reminders survived closing and reopening: "Spring list, checked against the sign-up sheet" (Graph) and "Moving away in May; ask who takes over the Tuesday run" (Farah), both dated Oct 10, 6:28 PM. This is where I'd read them: the Notes place on the left rail. Farah's reminder also shows as "1 note" when she's picked. Done, so I'm ending.

## End
`node design/ui/studio/tool/real.mjs --end $S` -> the session ended with no further request.

## In my own words (Grace)
- **Did I finish?** Yes. Both reminders are saved, one on Farah and one on the whole club. They were still there after I closed the tab and opened "running club" from Recent projects.
- **Ease: 6 of 7.**
- **What confused me:**
  - The first time I pressed Add note, it said "About PageRank" because my ranking was the thing picked. I didn't expect a note to belong to a ranking. I had to back out, find Farah, pick her, and then add the note. Once I understood that "About" means whatever is picked on the right, it was easy. For the club note I clicked empty space and it said "About Graph". I'd have called that "the whole map" or used the project's name.
  - Nothing told me the project wasn't saved yet; the title just said "friends". I only found out when Save asked me for a name. If I hadn't checked the menu, I'd have walked away thinking the notes were kept. I'd like a "not saved" hint near the title.
  - The start screen says "This browser can clear projects kept here. Save a local copy of any project you need to keep." That makes me a bit nervous about something I need next quarter. I'd probably also use "Save local copy...".
