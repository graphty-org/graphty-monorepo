# Session r1-s26 -- Dev (returning student), task T21 prompt B (team.csv to team-v2.csv)

Build: the frozen build named on the first line of criteria.md (tier2-r1d4-946256efb).

## Start

    REAL_DIST=<frozen build> with-browser.sh node real.mjs --start <session> setup:team-ranked.txt

01.png: My team project is open, "team" at the top, "Graph team.csv" in the left panel, and a
PageRank row with 12 next to it. Dots are sized and colored by PageRank, and the right panel shows
PageRank with Style and Values tabs. Okay, so first I need to write down who was first BEFORE I swap
anything. The Values tab should list the ranking.

## Steps

### Step 1

    node real.mjs --step <session> --click "Values"

02.png: The Values tab has a Top 10. Hal is first with 0.1293, then Ida 0.1224, Di 0.1177.
"12 of 12 have a value", so 12 people. Writing that down: BEFORE = Hal is first, 12 people.
"Made with: Weight -- weight (read as closer)" -- huh, interesting, but this task is about the new
list. Now, how did I open files before... it was "Open project or file..." from the menu in the
corner. I'm scared that opens a whole new project and I lose the styling though. Let me look in
the menu first.

### Step 2

    node real.mjs --step <session> --click-at 23,20

03.png: The menu: New project, Open project or file..., Open sample, Save, Save as..., Export...
Nothing says "new version of the file" or anything. "Open project or file..." sounds like it would
open a separate thing and my sized/colored dots might be gone. Wait -- the left side says "Graph
team.csv" and there's a "Data" button on the rail. Maybe the file itself lives there. Let me close
this and check Data first.

### Step 3

    node real.mjs --step <session> --key Escape --click "Data"

04.png: Data shows "Sources: team.csv, 12 nodes, 16 edges". That's my old file. So the thing I want
to swap is right here. There's no button next to it that I can see, just a little curvy icon. I'll
click on the file name and see if it gives me options.

### Step 4

    node real.mjs --step <session> --click-at 136,141

05.png: Clicking team.csv shows its details on the right ("Source, Added: Nodes 12, Edges 16") and
a table of the ties at the bottom. Nice, but nothing about putting a newer file in. I'm used to
programs hiding stuff in right-click menus, so let me right-click on team.csv.

### Step 5

    node real.mjs --step <session> --rclick-at 136,141

06.png: Oh nice, the right-click has "Edit source..." and "Replace with file...". That's exactly
it. I'd never have found it without right-clicking though -- there was no button for it. Clicking
"Replace with file..." and picking team-v2.csv from Downloads.

### Step 6

    node real.mjs --step <session> --click "Replace with file..." --upload team-v2.csv

07.png: A full page "Replace: team-v2.csv -- Was 12 nodes, 16 edges; now 14, 21". Oh good, that
already tells me there are 14 people now (two joined, matches what my manager said). It read the
columns as From / To / Weight, and there's a "Higher means: Not set / Closer / Farther / Capacity"
thing. It says if I don't choose, "PageRank ... read a higher weight as closer". The ranking I did
before also said "read as closer" in the Made with box, so if I leave it alone it's the same
method as last time, which is what I want for a before/after comparison. Wait, should I set
"Closer" on purpose? It says it'd do closer anyway. I'll leave it so I'm not changing two things
at once. Clicking Load.

### Step 7

    node real.mjs --step <session> --click "Load"

08.png: It loaded. "Graph team-v2.csv" now, and the overview says Nodes 14, Edges 21. My colors and
sizes are still there -- phew, didn't lose my work. Two dots are blue and small; I bet those are
the two new people (Mo and Nia) who don't have a ranking yet. The PageRank row in the list still
says 12 and has a little clock/rewind icon instead of the bar icon. So the ranking is still the
old one. Let me click PageRank and see if it offers to run again.

### Step 8

    node real.mjs --step <session> --click "PageRank"

09.png: There it is: "Data changed since this run" with a blue "Rerun" button. Same old Top 10
(Hal first) and "12 of 12 have a value", so that's still the old ranking. Clicking Rerun.

### Step 9

    node real.mjs --step <session> --click "Rerun"

10.png: New ranking, ran 11:34:47 PM. "14 of 14 have a value" and the row in the list says 14 now.
Top 10: Di 0.1339, Hal 0.1305, Ed 0.1245, Ida 0.1217, Jo 0.1141. The blue dots turned orange like
the rest. So Di is first now, Hal dropped to second. Made with still says "weight (read as closer)",
same as before, so it's a fair comparison. Last thing, save so I don't lose this: Control+S like
last time.

### Step 10

    node real.mjs --step <session> --key Control+s

11.png: "Save team as", name "team". Wait, it asks me for a name every time? I thought this was
already saved as "team". Whatever, keeping "team" and clicking Save.

### Step 11

    node real.mjs --step <session> --click "Save"

12.png: "Saved team in this browser." Done.

    node real.mjs --end <session>

## End of session (in character)

**Did I finish?** Yes.

- The team has **14 people** now (the Replace page said "Was 12 nodes, 16 edges; now 14, 21", and
  the Graph overview says Nodes 14).
- **Before:** Hal was first (PageRank 0.1293), from 12 people.
- **Now:** Di is first (0.1339); Hal is second (0.1305).
- Same method both times: Made with says "weight (read as closer)" for both runs.

Essay sentence: "After two new people joined, the team grew from 12 to 14, and the most central
person by PageRank changed from Hal (0.129) to Di (0.134), with Hal now second."

**Ease: 5 / 7.**

**What confused me:**

- **Finding where to put the new file.** The menu only had "Open project or file...", and I was
  scared that would start a separate project and lose my styling. I found "Replace with file..."
  only because I right-clicked team.csv in Data > Sources. Nothing on screen (no button, no "..."
  next to the file) told me that menu existed. If I hadn't tried right-clicking, I'd have asked a
  classmate.
- **The "Higher means: Not set / Closer / Farther / Capacity" choice on the Replace page.** I
  didn't know if I was supposed to set it. The sentence under it helped ("PageRank ... read a
  higher weight as closer"), so I left it alone to match my old run, but I wasn't sure that was
  "right".
- **The old ranking stayed on screen after loading.** The list still said PageRank 12 and the Top
  10 was the old one; only a small clock icon on the row hinted it was out of date. The "Data
  changed since this run / Rerun" bar was clear, but I only saw it after clicking PageRank. The two
  new people showed up as blue dots, which looked like a mistake at first until I guessed they just
  had no ranking yet.
- **Control+S asked for a name again** ("Save team as") even though the project was already
  called team. Minor.

What went well: the Replace page told me the before/after counts right away, my colors and sizes
survived, and "Made with" let me check the method was the same both times.
