# Session r4-s55 -- Dev, returning (reminders on friends.csv)

Session folder: tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s55 (worktree-relative). Every command below runs from the studio worktree with
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ and S=<that session folder>.

## Start

`node design/ui/studio/tool/real.mjs --start $S setup:friends-ranked.txt` -> 01.png

01.png: Okay, my running club list is open, colored and sized by PageRank like last time. I need two
reminders. On the left rail there is a "Notes" button -- that is the obvious door. I will click it.

## Step 1

`--step $S --click "Notes"` -> 02.png

02.png: A Notes panel, "No notes." and a little plus at the top right. Wait -- one of my reminders is
about Farah specifically, so I want it stuck to her, not floating. Let me hover the plus to see what
it says before I click it.

## Step 2

`--step $S --hover-at 276,60` -> 03.png. Tooltip: "Add note N".

"Add note", shortcut N. It does not say what the note is attached to. I will click it and see what it
asks me. I will start with the club-wide one, since nothing is selected.

## Step 3

`--step $S --click "Add note"` -> 04.png

04.png: A text box opened, but above it, it says "About PageRank". Wait -- I do not want a note about
the PageRank run, I want one about the whole club. I guess it picked up whatever the right panel is
showing. I will Cancel and try to point it at the whole graph first.

## Step 4

`--step $S --click "Cancel" --click "Graph"` -> 05.png

05.png: Back on the Graph list: Selection, PageRank (highlighted), Everything. "Everything" sounds like
the whole club. I will click Everything so the right panel is about the whole graph.

## Step 5

`--step $S --click "Everything"` -> 06.png

06.png: The right panel now says "Everything" with the default style (that is the base look, not what
I meant, but it is "the whole graph"). Now back to Notes and Add note, hoping it says "About
Everything" or the club.

## Step 6

`--step $S --click "Notes" --click "Add note"` -> 07.png

07.png: Now it says "About Graph". Oh nice, that is the whole club. The box looks focused. I will type
the club reminder and press Save note.

## Step 7

`--step $S --type "Spring list, checked against the sign-up sheet" --click "Save note"` -> 08.png

08.png: The note is saved: the text, a "Graph" tag, the date. Good. Now Farah. The dots have no names
on them, so I cannot click her. I will use the search box on the Graph panel and type Farah.

## Step 8

`--step $S --click "Graph" --click "Find nodes, edges, values" --type "Farah"` -> 09.png (tool: "Graph"
matched both the rail button and the note's Graph tag, so nothing happened.)

I meant the Graph button on the left rail. I will click it by its spot on the screen instead.

## Step 9

`--step $S --click-at 28,75 --click "Find nodes, edges, values" --type "Farah"` -> 10.png

10.png: Search found "Nodes 1: Farah" and four of her ties. I will click Farah under Nodes so she is
selected, and hope the right panel turns into her.

## Step 10

`--step $S --click-at 112,153` -> 11.png

11.png: Farah is selected -- she has a yellow glow at the bottom, and the right panel says "Farah, Node",
PageRank 0.06394, #1 of 20. Now Notes, then Add note; I expect "About Farah".

## Step 11

`--step $S --click "Notes" --click "Add note"` -> 12.png

12.png: "About Farah". That is exactly it. Typing her reminder and saving.

## Step 12

`--step $S --type "Moving away in May; ask who takes over the Tuesday run" --click "Save note"` -> 13.png

13.png: Both reminders are in the Notes list: Farah's with a "Farah" tag, the club one with "Graph". And
Farah's panel on the right now says "Node, 1 note". Nice. Now, will they still be there next time? The
top says "Local only" and I do not see "saved" anywhere. Last time I saved the project from the menu,
so I will open the main menu (the three lines at top left).

## Step 13

`--step $S --click "Main menu"` -> 14.png

14.png: The menu has Save (Ctrl+S), Save as..., Save local copy..., Export... I will just press Save,
like last time.

## Step 14

`--step $S --click "Save"` -> 15.png

15.png: A "Save friends as" dialog, Name "friends". Fine, it has never been saved under a name yet I
guess. I will click Save in the dialog.

## Step 15

`--step $S --click "Save"` -> 16.png

16.png: A notice at the bottom: "Saved friends in this browser." Good. But I want proof the notes come
back, so I will close the tab and open the app again, like coming back tomorrow.

## Step 16

`--step $S --reopen` -> 17.png

17.png: The start page. Under Recent projects: "friends, In this browser - 20 nodes - Oct 11, 3:45 AM".
Underneath in small print: "This browser can clear projects kept here. Save a local copy of any project
you need to keep." Wait -- so "in this browser" might not be safe? First let me open friends and check
my notes are there.

## Step 17

`--step $S --click-at 593,108` -> 18.png

18.png: "Opened friends". Farah is still selected and her panel says "Node, 1 note". The Notes rail is
where I would read them. Opening Notes to check both are back.

## Step 18

`--step $S --click "Notes"` -> 19.png

19.png: Both reminders came back after closing the tab: Farah's ("Moving away in May; ask who takes over
the Tuesday run", tag Farah) and the club one ("Spring list, checked against the sign-up sheet", tag
Graph). That small print on the start page still worries me though -- "this browser can clear
projects". I am not losing work the week of a deadline, so I will also do "Save local copy..." from
the menu.

## Step 19

`--step $S --click "Main menu" --click "Save local copy..."` -> 20.png (tool: a file was saved,
friends.graphty.json, 8,423 bytes)

20.png: The browser downloaded friends.graphty.json. The app itself showed nothing this time -- no
"saved a copy" notice like the one Save gave me -- so I only know from my downloads. That is fine.
Where I would read the reminders: the Notes button on the left rail lists both; and when Farah is
selected, her panel says "1 note", which I could click. I am done.

`--end $S`

## End (in character)

**Did I finish?** Yes. Both reminders are in the program: Farah's is attached to Farah ("About Farah"
when I wrote it, a "Farah" tag on it now) and the club one is attached to the whole graph ("Graph" tag).
I saved, closed the tab, opened friends again from Recent projects, and both were still in the Notes
list. I also saved a local copy file in case the browser clears things. I would read them in the Notes
panel on the left rail; Farah's also shows as "1 note" on her own panel when she is selected.

**Ease: 6 of 7.**

**What confused me:**
- The first time I pressed Add note it said "About PageRank", because the PageRank run happened to be
  open on the right. I did not want a note about a calculation. Nothing told me beforehand what the
  note would be attached to, or let me change it in the note box; I had to cancel, go find
  "Everything" in the Graph list, and come back. Then it said "About Graph", which was right, but I
  only got there by guessing that "Everything" means the whole club.
- The names are not drawn on the dots, so I could not just click Farah; I had to search for her.
- After Save it said "Saved friends in this browser", and the start page then warned in small print
  that "this browser can clear projects kept here". So was "Save" enough to "still be there next time"
  or not? I did the local copy to be safe, but the program never said which one I actually needed.
- "Save local copy..." downloaded the file with no message in the app, so I only knew it worked from
  my downloads.
- Small thing: "Graph" was both the left-rail button and the tag on my club note.

Essay-style sentence for myself: "I left two notes in the project -- one on Farah, one on the whole
club -- saved it, reopened it, and both were still there in the Notes panel."
