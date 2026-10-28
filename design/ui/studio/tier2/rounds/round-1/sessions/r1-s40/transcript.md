# Session r1-s40 -- Dev (returning student), T19 prompt B (Florentine families)

Build: 946256efb876 (frozen, `/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/`).
All commands run from `design/ui/studio/tier2` with `REAL_DIST` set to that folder.

## Step 1 -- start

`../tool/with-browser.sh node ../tool/real.mjs --start rounds/round-1/sessions/r1-s40 setup:florentine-ranked.txt` -> 01.png

Okay, this is the Florentine families one, already ranked -- PageRank in the list, dots sized and
colored by it, the key in the corner. No names on the dots though. I need to leave myself two
reminders: one on the Medici, one on the whole network. Wait -- there's a "Notes" button on the
left rail I don't remember from last time. That's literally what I want. I'll try it first.

## Step 2 -- `--click Notes` -> 02.png

A "Notes" panel, "No notes.", and a little plus at the top. Nice, that's the place. I'm going to
hover the plus to see what it says before I click it.

## Step 3 -- `--hover-at 276,60` -> 03.png

Tooltip says "Add note N" (so N is a shortcut). Pointer stayed an arrow, not a hand, small thing.
Nothing is selected right now, so I'd guess a note from here is about the whole network. I'll do
the whole-network one first: click it.

## Step 4 -- `--click "Add note"` -> 04.png

Wait. A box opened, but above it says "About PageRank". I don't want a note about the ranking, I
want it about the whole network. I guess it picked whatever is open on the right (the PageRank
panel). I'll cancel, go back to Graph, pick "Everything" so the whole network is what's open, and
try again.

## Step 5 -- `--click Cancel --click Graph --click Everything` -> 05.png

Okay, "Everything" is open on the right now. Back to Notes and the plus again; hopefully it says
"About Everything" or the network this time.

## Step 6 -- `--click Notes --click "Add note"` -> 06.png

"About Graph" now. Graph = the whole network, I think, so that's the one. Typing it and hitting
"Save note".

## Step 7 -- `--type "Marriages only; business ties are a separate list" --click "Save note"` -> 07.png

Saved: the text, a "Graph" tag, the date, and a trash can. Good. Now the Medici one. It seems the
note goes to whatever is open, so I need the Medici open first. No names on the dots, so I'll use
the find box like last time: Graph, then type Medici.

## Step 8 -- `--click Graph --click "Find nodes, edges, values" --type "Medici"` -> 08.png

(The tool said "Graph" matched two buttons -- the rail button and the "Graph" tag on my note -- and
took the first; the screen shows the Graph panel, so it was the rail.) The find box shows "Nodes 1:
Medici" and six marriages. Clicking the Medici node row.

## Step 9 -- `--click-at 116,153` -> 09.png

Medici is highlighted in yellow (the biggest dot, #1 of 15 on PageRank) and open on the right. No
"note" spot on the right panel that I can see, so I'll do what worked: Notes, then the plus, and
check it says "About Medici".

## Step 10 -- `--click Notes --click "Add note"` -> 10.png

"About Medici". Oh nice, that's it. Typing the reminder and saving.

## Step 11 -- `--type "Check the 1434 return from exile" --click "Save note"` -> 11.png

Both reminders are in the list now, Medici one on top with a "Medici" tag, the network one with
"Graph". And on the right under Medici it now says "1 note" -- cool. But "Save note" isn't the same
as saving my work, right? The top bar still says "Local only" and I don't know if this project was
ever saved. Last time I did Save as, so: Control+S like I'd do anywhere.

## Step 12 -- `--key Control+s` -> 12.png

"Save Florentine families as", name filled in. So it was never saved before -- good thing I
checked. Clicking Save.

## Step 13 -- `--click Save` -> 13.png

"Saved Florentine families in this browser." Okay. Top bar still says "Local only" though, which
I guess means it's only in this browser, fine for me. I don't trust it until I see it, so I'll
close and come back like it's the next day.

## Step 14 -- `--reopen` -> 14.png

Start screen. Under Recent projects: "Florentine families -- In this browser - 15 nodes - Oct 8,
11:48 PM". There's also a line under it: "This browser can clear projects kept here. Save a local
copy of any project you need to keep." Hm, that makes me a little nervous. First let me open the
recent one (not the sample on the right, which would be a fresh copy) and see if my reminders are
there.

## Step 15 -- `--click-at 624,108` -> 15.png

"Opened Florentine families." It came back exactly as I left it: ranking colors and sizes, Medici
still picked, and "1 note" under Medici on the right. Let me open Notes to see both.

## Step 16 -- `--click Notes` -> 16.png

Both reminders are back: "Check the 1434 return from exile" tagged Medici, and "Marriages only;
business ties are a separate list" tagged Graph. That's where I'd read them. Let me also try the
"1 note" link under Medici on the right, to see if it's a second way in.

## Step 17 -- `--click Graph#1 --click "1 note"` -> 17.png

The "1 note" link brought me to the Notes list (both notes, Medici's on top). So that's a second
way in from the family itself. It doesn't single out the Medici one, but with two notes I can see
it fine. Last thing: that line on the start screen ("This browser can clear projects kept here")
worries me with a deadline. Let me check the main menu for a way to keep a copy on my laptop.

## Step 18 -- `--click-at 24,20` (Main menu) -> 18.png

There it is: "Save local copy..." -- the same words as the warning on the start screen. Clicking it.

## Step 19 -- `--click "Save local copy..."` -> 19.png

The tool reports a download: "Florentine families.graphty.json", 7,366 bytes, in the session's
`downloads/` folder (it holds both reminders' text). On screen, though, nothing changed: no
message like the "Saved ... in this browser" one I got from Control+S. In a real browser I'd see
the download bar, so I'd believe it, but inside the app there's no confirmation that the copy was
written or where it went.

I'm done.

## End

`--end rounds/round-1/sessions/r1-s40`

## In character, at the end

**Did I finish?** Yes. Both reminders are in: "Check the 1434 return from exile" tied to the
Medici, and "Marriages only; business ties are a separate list" tied to the whole network
("Graph"). I saved the project in the browser, closed it, opened it again from Recent projects, and
both were still there. I'd read them in the Notes panel on the left rail; the Medici one also shows
up as "1 note" under the Medici on the right, which takes me to the same list. I also saved a local
copy to my laptop because the start screen warned the browser can clear projects.

**Ease: 6 / 7.**

**What confused me:**

- The first time I clicked the plus in Notes it said "About PageRank", because the ranking was what
  was open on the right. I wanted a note about the whole network and nothing told me the note
  would latch onto whatever is open. I had to cancel, go to Graph, click Everything, and come back.
  Then it said "About Graph" -- which I guessed means the whole network, but "Everything" and
  "Graph" being two names for the same thing made me pause. A way to choose what the note is about
  inside the note box would have saved the round trip.
- "Save note" vs. saving the project: I wasn't sure saving a note also saved my work. It didn't --
  the project had never been saved and Control+S asked for a name. Nothing near the notes said the
  project itself was unsaved; the top bar's "Local only" didn't tell me either.
- The start screen's line "This browser can clear projects kept here" made me worry after I had
  already saved; that's when I went looking for "Save local copy...". It worked, but the app gave
  no message on screen after it.
- Small: the plus button in Notes showed an arrow pointer, not a hand, so for a second I wasn't
  sure it was clickable. The tooltip "Add note N" helped.

**Essay-style sentence (what I'd tell my instructor):** "My reminders are in the Notes panel: one
attached to the Medici and one to the whole marriage network, and they were still there after I
closed and reopened the saved project."

## Observer notes (not in character)

- No implementation defects hit: no script errors or failed requests were printed at any step;
  every control the participant reached worked as labeled.
- Tool-level ambiguity: `--click Graph` matched both the left-rail button and the "Graph" tag on a
  saved note (two buttons share the accessible name "Graph"); the tool took the rail button.
  A screen-reader user would meet the same duplicate name.
