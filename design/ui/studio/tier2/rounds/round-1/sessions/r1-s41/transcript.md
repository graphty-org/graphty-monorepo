# Session r1-s41 -- Jordan (returning marketing analyst), task T19, dataset A (running club, friends.csv)

Build: 946256efb876, served from /home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/

All commands run from design/ui/studio with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/` and `S=tier2/rounds/round-1/sessions/r1-s41`.

## Start

`node tool/real.mjs --start $S setup:friends-ranked.txt` -> 01.png

01.png: friends.csv is open, colored and sized by PageRank. Left rail: Graph, Data, and a "Notes" icon I don't remember from before. Top bar says "Local only" -- good, that answers my laptop question.

## Steps

### Step 1
Jordan: "OK, two reminders. There's a 'Notes' thing in the left rail now -- that's new to me, but it's literally what I want. Click it."
Command: `node tool/real.mjs --step $S --click "Notes"` -> 02.png

02.png: A Notes panel, "No notes.", and a + at the top right of it. No names on the dots, so I can't see Farah on the map.

### Step 2
Jordan: "There's a plus. Let me hover it before I click, I want to know if it's about a person or the whole thing."
Command: `node tool/real.mjs --step $S --hover-at 276,60` -> 03.png; tool printed: button "Add note", tooltip "Add note N".

### Step 3
Jordan: "'Add note.' Fine. I'll start with the club-wide one since nothing is picked. Click it."
Command: `node tool/real.mjs --step $S --click "Add note"` -> 04.png

04.png: A text box appears, labeled "About PageRank". Hm. I don't want a note about PageRank, I want one about the club. It picked up whatever was open on the right. No way in this box to change what it's about.

### Step 4
Jordan: "Nope, wrong target. Cancel. Maybe if I click on blank map first, nothing's 'picked' and it'll be about the whole thing."
Command: `node tool/real.mjs --step $S --click "Cancel" --click-at 1100,800` -> 05.png (empty canvas)

05.png: Note cancelled. The right side still shows PageRank, so clicking blank map didn't change what's "current".

### Step 5
Jordan: "The right side is stuck on PageRank. In the Graph list there's 'Everything' -- that's the whole graph. Pick that, then come back to Notes."
Command: `node tool/real.mjs --step $S --click "Graph" --click "Everything"` -> 06.png

06.png: Right side now says "Everything" with its colors. OK, now try the note again.

### Step 6
Jordan: "Back to Notes, plus."
Command: `node tool/real.mjs --step $S --click "Notes" --click "Add note"` -> 07.png

07.png: Now it says "About Graph". That's the club as a whole. Good -- though I only got there by guessing that the right-hand panel decides what the note is about.

### Step 7
Jordan: "Type the club reminder and hit Save note."
Command: `node tool/real.mjs --step $S --type "Spring list, checked against the sign-up sheet" --click "Save note"` -> 08.png

08.png: The note is listed with a "Graph" tag, a timestamp and a trash can. Fine.

### Step 8
Jordan: "Now Farah. No names on the map, so do what I always do -- find box, type her name."
Command: `node tool/real.mjs --step $S --click "Graph" --click "Find nodes, edges, values" --type "Farah"` -> 09.png (tool: "Graph" was ambiguous, took the first -- the rail button)

09.png: Find box shows Nodes 1: Farah, and her four ties. Same as last time.

### Step 9
Jordan: "Click Farah -- that should make her the 'current' thing like Everything was."
Command: `node tool/real.mjs --step $S --click-at 112,153` -> 10.png (option "Farah")

10.png: Farah is ringed in yellow on the map, and the right side says "Farah, Node" -- PageRank 0.06394, #1 of 20. Ha, she's the top one. Losing her matters.

### Step 10
Jordan: "Right side is on Farah now. Same trick as before: Notes, plus. It should say 'About Farah'."
Command: `node tool/real.mjs --step $S --click "Notes" --click "Add note"` -> 11.png

11.png: "About Farah". Good, and the club note is still underneath.

### Step 11
Jordan: "Type it, save it."
Command: `node tool/real.mjs --step $S --type "Moving away in May; ask who takes over the Tuesday run" --click "Save note"` -> 12.png

12.png: Two notes in the list, one tagged "Farah", one "Graph". And on the right under Farah there's a little "1 note" link now. Nice touch, actually.

### Step 12
Jordan: "Now -- will they be there next time? The top bar just says 'friends' and 'Local only'; I've no idea if this project has been kept anywhere. Last time I used Save as from the menu. Open the hamburger menu and look."
Command: `node tool/real.mjs --step $S --click-at 24,20` -> 13.png (Main menu)

13.png: Menu has Save (Ctrl+S), Save as..., Save local copy..., Export... Nothing tells me whether it's already kept. Notes have timestamps but that's not the same thing.

### Step 13
Jordan: "Plain Save. That's what I'd do in any program."
Command: `node tool/real.mjs --step $S --click "Save"` -> 14.png

14.png: "Save friends as" dialog with a Name box. So it had NOT been kept yet -- good thing I checked. Doesn't say where it goes, but the top bar said Local only.

### Step 14
Jordan: "'friends' is useless in a month. Call it 'Running club spring' and Save."
Command: `node tool/real.mjs --step $S --type "Running club spring" --click "role=button:Save"` -> 15.png

15.png: Title is now "Running club spring", and a message: "Saved Running club spring in this browser." In this browser -- fine for me, but if IT wipes Chrome it's gone. Whatever, that's how it worked before too.

### Step 15
Jordan: "I don't trust it until I've seen it come back. Close it and open it again like I would next week."
Command: `node tool/real.mjs --step $S --reopen` -> 16.png

16.png: Start screen. Recent projects: "Running club spring -- In this browser -- 20 nodes -- Oct 8, 2026, 11:49 PM". Under it: "This browser can clear projects kept here. Save a local copy of any project you need to keep." Hm, so "Saved" wasn't really saved-saved. Noted. First check the notes came back.

### Step 16
Jordan: "Open Running club spring."
Command: `node tool/real.mjs --step $S --click "Running club spring"` -> 17.png

17.png: "Opened Running club spring". Farah still selected, and "1 note" under her name on the right. The Notes rail is closed, though, so the club note isn't visible yet.

### Step 17
Jordan: "Where I'd read them: the Notes tab. Click it to make sure both are there."
Command: `node tool/real.mjs --step $S --click "Notes"` -> 18.png

18.png: Both notes are back after closing and reopening -- Farah's and the club one, with their tags and times. That's where I'd read them.

### Step 18
Jordan: "But that start screen said the browser can clear these. Our IT does wipe Chrome profiles. Belt and braces: menu, 'Save local copy...'."
Command: `node tool/real.mjs --step $S --click "Main menu" --click "Save local copy..."` -> 19.png; tool printed: a file was saved: Running club spring.graphty.json, 8,321 bytes (downloads/).

19.png: The screen looks exactly the same as before. No message on screen that anything happened -- the browser just downloaded a file (Running club spring.graphty.json). After Save, it told me "Saved ... in this browser"; here it says nothing. I'd go check my Downloads folder.

### End
Jordan: "Done. Both reminders are in, they came back after I closed it, and I've got a file copy. Stopping."

Command: `node tool/real.mjs --end $S`

## Debrief (in character)

**Did I finish?** Yes. Two notes: one tagged Farah ("Moving away in May; ask who takes over the Tuesday run"), one tagged Graph ("Spring list, checked against the sign-up sheet"). Saved the project as "Running club spring" in the browser, closed and reopened it, and both notes were there in the Notes panel. Also saved a local copy file. Where I'd read them: the Notes icon on the left rail; for Farah, also the "1 note" link under her name on the right when she's picked.

**Ease: 5 / 7.**

**What confused me:**
- The first time I hit Add note it said "About PageRank". It quietly took whatever was open on the right-hand panel as the subject. I wanted the club, not a measure. There was no way to change the subject inside the note box; I had to cancel, guess that "Everything" in the Graph list meant the whole club, pick it, and come back. Clicking blank map didn't clear it either. If I hadn't read the small "About ..." label I'd have pinned my club note to PageRank and never known.
- Even then it said "About Graph", not something like the file or club name. Fine, I worked it out, but "Graph" isn't how I think of my running club.
- Nothing told me the work wasn't kept until I pressed Save and got a "Save as" box. The top bar only says "Local only", which I read as privacy, not "unsaved". No dot, no "unsaved changes".
- "Saved ... in this browser" felt done, and then the start screen told me the browser can clear projects and I should save a local copy. So which one is the real save? Two kinds of save plus Save as is one too many to keep straight.
- "Save local copy..." gave no message on screen at all. The Save gave a toast; this one didn't. I only know it worked because a file showed up.

**What was fine:** the Notes panel itself is simple, the tags on each note (Farah / Graph) are clear, and the "1 note" link on Farah's details is a nice touch -- that's what would remind me when I'm looking at her ranking. Finding Farah through the search box worked the way it always has.

**Off-topic grumble:** our sign-up sheet lives in a Google Form that someone exports by hand, so "checked against the sign-up sheet" is only true for about a week anyway.
