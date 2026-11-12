# Session r5-s47b -- Grace, returning: two reminders (Farah, whole club)

Commands run from /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1 with
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ and
S=tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s47b

## 01 (session started for me)
friends is open, PageRank colored and sized. There is a "Notes" place on the left rail I have not
used before. That looks like where reminders go. Next: click Notes.

Command: `node design/ui/studio/tool/real.mjs --step $S --click "Notes"` -> 02.png

## 02
A Notes panel: "No notes." and a plus at the top. Good. I'll start with the club-wide one since
nothing is selected. Next: click the plus next to Notes.

Command: `--click-at 276,60` (button "Add note") -> 03.png

## 03
A box opened, but it says "About PageRank". I don't want the club note pinned to the ranking --
if I rerun the ranking next quarter, does the note go with it? It seems to attach to whatever the
right-hand panel shows. Next: Cancel, then pick "Everything" in Graph so the note is about the
whole club.

Command: `--click "Cancel" --click "Graph" --click "Everything"` -> 04.png

## 04
Right panel now says "Everything". Next: back to Notes and press Add note, see what it is "about".

Command: `--click "Notes" --click "Add note"` -> 05.png

## 05
Now it says "About Graph". That's the whole club -- good. Next: click in the box, type the club
note, Save note.

Command: `--click-at 180,131 --type "Spring list, checked against the sign-up sheet" --click "Save note"` -> 06.png

## 06
The club note is saved, tagged "Graph", with today's date. Now Farah. No names are on the dots, so
I'll look her up the way I did in my second session. Next: Graph, then type Farah in the find box.

Command: `--click "Graph" --click "Find nodes, edges, values" --type "Farah"` -> 07.png (did nothing:
"Graph" was ambiguous between the rail button and the note's "Graph" chip)

## 07
Nothing happened; the rail button and the note's tag share the name. Next: click the Graph button
on the rail by position, then find Farah.

Command: `--click-at 28,75 --click "Find nodes, edges, values" --type "Farah"` -> 08.png

## 08
Found her: Nodes 1, Farah, and her 4 ties. Next: click Farah so she is what's selected.

Command: `--click-at 112,153` (option "Farah") -> 09.png

## 09
Farah is selected: ringed on the map, right panel says "Farah, Node", PageRank #1 of 20. Next:
Notes, Add note, and check it says "About Farah" before I type.

Command: `--click "Notes" --click "Add note"` -> 10.png

## 10
"About Farah". Next: type her reminder and Save note.

Command: `--click-at 180,131 --type "Moving away in May; ask who takes over the Tuesday run" --click "Save note"` -> 11.png

## 11
Both notes listed, Farah's tagged "Farah", and the right panel under Farah now says "1 note". Nice.
Now: will they be there next time? The title just says "friends" and I see no "saved" mark. Last
time I saved from the menu. Next: open the main menu.

Command: `--click "Main menu"` -> 12.png

## 12
Menu: Save, Save as..., Save local copy... "Save" is what I want. Next: click Save.

Command: `--click "Save"` -> 13.png

## 13
So it had never been saved: it asks "Save friends as", Name "friends". That name is fine. Next:
click Save in the dialog.

Command: `--click "Save"` -> 14.png

## 14
"Saved friends in this browser." Good. I want to be sure, like last time: close it and come back.
Next: reopen the app.

Command: `--reopen` -> 15.png

## 15
Start screen. Recent projects: "friends, In this browser - 20 nodes - Oct 11, 10:42 AM". 20 nodes,
same as before. Underneath: "This browser can clear projects kept here. Save a local copy of any
project you need to keep." Hm -- noted; a reminder for May that could vanish is not much of a
reminder. First let me open it and see the notes. Next: click "friends".

Command: `--click-at 593,108` (Recent project "friends") -> 16.png

## 16
"Opened friends". Colors back, Farah still selected, "1 note" under her name. Next: Notes, to read
both reminders.

Command: `--click "Notes"` -> 17.png

## 17
Both reminders are there after closing and reopening, word for word, with their tags (Farah, Graph)
and times. This is where I'd read them. But the start screen warned the browser can clear projects;
May is months away, so I'll also keep a copy on the laptop. Next: Main menu, "Save local copy...".

Command: `--click "Main menu" --click "Save local copy..."` -> 18.png (the browser downloaded
friends.graphty.json, 8,423 bytes)

## 18
My browser downloaded friends.graphty.json. The app itself showed no message this time, unlike
"Saved friends in this browser" before; I only know because the download showed up. Done. Next: end.

Command: `node design/ui/studio/tool/real.mjs --end $S` -> session ended.

## In my own words, at the end

**Did I finish?** Yes. Two reminders: "Moving away in May; ask who takes over the Tuesday run" on
Farah, and "Spring list, checked against the sign-up sheet" on the whole map (tagged "Graph"). I
saved the project ("Saved friends in this browser"), closed it, opened it again from Recent
projects, and both were there in the Notes place on the left. I'd read them there next time; Farah's
also shows as "1 note" when I click her. I also saved a copy to the laptop.

**Ease: 6 of 7.**

**What confused me:**
- The first time I pressed Add note it said "About PageRank", because the ranking happened to be
  what the right side showed. I didn't want the club note tied to the ranking, so I cancelled and
  picked "Everything" first. Nothing told me up front that a note attaches to whatever is selected;
  I only caught it because I read the little "About ..." line.
- After picking Everything it said "About Graph", not "About Everything" -- close enough, but two
  words for the same thing.
- The project had never been saved even though it was open with my ranking on it; I only found out
  when Save asked for a name. Nothing on the title bar told me it was unsaved.
- The start screen says "This browser can clear projects kept here." For a reminder about May that
  is worrying; I saved a local copy, but "Save local copy..." gave no message in the app.
