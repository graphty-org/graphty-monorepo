# Session r2-s35 -- Nadia (level-1 alert reviewer), task T14 "Stop for the day and come back"

Dataset: Les Miserables sample, set up with labels on names and PageRank run.

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s35 setup:rounds/round-2/setups/T14.txt`

Saw (01.png): the Les Miserables drawing, every node orange, names on most of them. Left panel
lists "Selection", "Influence 77" and "Everything". Right panel: Style for "Everything", with a
Label line "Above / name". A legend "Color: Influence 0.003299 -- 0.07543" at the top. Title bar:
"Les Miserables", undo/redo, a lock and "Local only".

Nadia: "OK, so this is my work: names are on, the influence thing is colored. 'Local only' --
does that mean it is not saved anywhere yet? I need it saved under my own name. I'd look for
File or Save. There's a menu icon top left, I'll try that."

## Step 2 -- open the main menu

Command: `--step --click-at 24,20` (button "Main menu")

Saw (02.png): a menu: Back to start; New project; Open project or file...; Open sample; Save
(Ctrl+S); Save as... (Shift+Ctrl+S); Save local copy...; Export...; Rename (F2); Settings...;
Keyboard shortcuts; Help.

Nadia: "Three saves. Save, Save as, Save local copy. Hesitated here -- 'local copy' sounds like
'on this computer', but the task says a name I choose, and in Word that's always Save as. I'll
go with Save as and see if it asks me for a name."

## Step 3 -- Save as

Command: `--step --click "Save as..."`

Saw (03.png): a small dialog "Save Les Miserables as" with one field, Name, filled with "Les
Miserables", and Cancel / Save.

Nadia: "Good, it asks for a name. No folder picker, so I don't know where it goes, but fine.
I'll call it what I'd call an alert file: 'LesMis key characters 2026-10-07'."

## Step 4 -- type the name

Command: `--step --click "Name" --key Control+a --type "LesMis key characters 2026-10-07"`

Saw (04.png): the Name field now reads "LesMis key characters 2026-10-07".

Nadia: "Name's in. Save."

## Step 5 -- Save

Command: `--step --click "Save"`

Saw (05.png): the title bar now says "LesMis key characters 2026-10-07". A message at the bottom:
"Saved LesMis key characters 2026-10-07 in this browser." The bar still says "Local only".

Nadia: "Saved 'in this browser'. Hmm. Is the browser this computer? I think so -- it's my
laptop's browser. But 'Local only' still sits up there and I'm not sure whether that is good or
bad. I'll take it. Now put it away: the menu had 'Back to start', that's my 'close the file'."

## Step 6 -- Back to start

Command: `--step --click "Main menu" --click "Back to start"`

Saw (06.png): a start page. Left: "Open project or file...", "New from data...". Middle, "Recent
projects": "LesMis key characters 2026-10-07 -- In this browser - 77 nodes - Oct 7, 2026, 12:05
..." with a "..." button, and under it in small grey text: "This browser can clear projects kept
here. Save a local copy of any project you need to keep." Right: the samples.

Nadia (hesitated here): "Wait. 'This browser can clear projects kept here.' So what I just did
is NOT safe? IT wipes our browsers sometimes. That's exactly the 'Save local copy' I skipped in
the menu. Nobody told me that when I saved -- the message just said 'saved in this browser'. OK,
I'll open it again and do Save local copy too, so there's a real file on my computer."

## Step 7 -- reopen it from Recent projects

Command: `--step --click "LesMis key characters 2026-10-07"`

Saw (07.png): "Opened LesMis key characters 2026-10-07". Same drawing, colors and names. The right
panel now shows the graph's overview (77 nodes, 254 edges) instead of the "Everything" style I had
open, and the "Influence" row on the left no longer shows "77" beside it.

Nadia: "Looks the same. Now Save local copy from the menu."

## Step 8 -- Save local copy

Command: `--step --click "Main menu" --click "Save local copy..."`

Tool: "a file was saved: LesMis key characters 2026-10-07.graphty.json, 29,870 bytes" (to
downloads). Saw (08.png): no message in the app at all -- no dialog, no toast. The screen looks
exactly as before.

Nadia: "Did that do anything? In real Chrome I'd see the download pop up in the corner, so I
guess it went to Downloads as a .json file. The app itself said nothing, which is odd after it
was so chatty about 'saved in this browser'. Fine. Now end of day: Back to start, then close the
browser."

## Step 9 -- put it away and come back "tomorrow"

Command: `--step --click "Main menu" --click "Back to start" --reopen` (back to start, close the
tab, open the app again in a new tab with the same browser storage)

Saw (09.png): the start page again. Recent projects lists "LesMis key characters 2026-10-07 --
In this browser - 77 nodes - Oct 7, 2026, 12:05 ...". The local copy I downloaded is not listed
-- only the browser one.

Nadia: "Morning. There it is, top of Recent. I'll open it and check my names and the influence
colors are still there."

## Step 10 -- open it from Recent

Command: `--step --click "LesMis key characters 2026-10-07"`

Saw (10.png): "Opened LesMis key characters 2026-10-07". Same layout, orange influence colors,
the legend "Color: Influence 0.003299 -- 0.07543", names on the characters. Left panel still has
"Influence", but without the "77" it showed yesterday.

Nadia: "Drawing, names, colors -- same as yesterday. But that 77 next to Influence is gone. Did
the scores come back or only the colors? I'll click Influence and see."

## Step 11 -- click Influence

Command: `--step --click "Influence"`

Saw (11.png): right panel "Influence -- Measure from Influence, Oct 7", Style tab: Color bound to
Influence, Label Show. The 77 still does not come back beside the row.

Nadia: "So the coloring rule is there. I want to see actual numbers though -- Values tab."

## Step 12 -- Values tab

Command: `--step --click "Values"`

Saw (12.png): "77 of 77 have a value, 0.003299 to 0.07543, median 0.01242"; Top 10: Valjean
0.07543, Myriel 0.04278, Gavroche 0.03577, Marius 0.03089, Javert 0.0303, Thenardier 0.02793,
Fantine 0.02702, Enjolras 0.02188, Cosette 0.02061, MmeThenardier 0.0195; "Made with: PageRank,
Ran Oct 7, Damping factor 0.85".

Nadia: "There it is -- all 77 scores, Valjean on top, and it even says it was PageRank run on Oct
7. That's what QA would want written down. Names are on the drawing. Done."

## End

Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s35`

## Wrap-up (in character)

**Did I finish?** Yes. I saved it under my own name ("LesMis key characters 2026-10-07"),
closed it with Back to start, closed the browser tab, came back, opened it from Recent projects,
and all of my work was there: the drawing, the names on the characters, the influence colors and
legend, and all 77 influence scores with the note that PageRank made them on Oct 7.

**Ease: 5 out of 7.** Saving and getting it back was quick -- maybe two minutes. What cost me:

- **Which save?** The menu has Save, Save as... and Save local copy.... I picked Save as because
  it lets me name it. Only on the start page, in small grey text, did I learn "This browser can
  clear projects kept here. Save a local copy of any project you need to keep." The "Saved ... in
  this browser" message right after saving never warned me. If I had not read that grey line I'd
  have gone home thinking it was safe. I went back and did Save local copy as well.
- **Save local copy said nothing.** No message in the app, no "saved to Downloads". I assume it
  downloaded a .json file; I could not tell from the app. And the start page next morning only
  listed the in-browser copy, not the file, so I don't know how I'd find the file again without
  Open project or file.
- **"Local only"** sits in the title bar the whole time and I never learned whether it means
  "not saved" or "private". It did not change after saving.
- **The 77 next to Influence disappeared** after reopening (it was there before I saved). It made
  me doubt the scores had come back until I clicked through to Values and saw 77 of 77.
- Small: after reopening, the right panel showed the graph overview instead of the "Everything"
  style I had open; not a problem, just not where I left off.

Downloaded file: rounds/round-2/sessions/r2-s35/downloads/LesMis key characters 2026-10-07.graphty.json
