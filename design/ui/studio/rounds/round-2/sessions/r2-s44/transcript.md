# Session r2-s44 -- Ruth (data journalist), task T5 "A file that will not read"

Dataset: club-members.graphml (in my Downloads). Start: empty.

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s44 empty` -> 01.png

What I see: a dark start page. "Start" with "Open project or file..." (Ctrl+O) and "New from data...", a line saying files are read on this computer and never uploaded, Recent projects (empty), four samples. At the bottom a box asks to share usage data. A "Local only" lock at top right.

Next: I decline the usage data first -- unpublished names do not leave my computer. Then "Open project or file...", since a coworker sent me a file.

## Step 2 -- decline usage data

Command: `--step --click "No thanks"` -> 02.png

What I see: the box is gone; a line at the bottom says "Usage data stays off. Change this in Settings > Privacy". Good, that is what I wanted, and it told me so.

Next: "Open project or file..." and pick club-members.graphml from Downloads.

## Step 3 -- open the file

Command: `--step --click "Open project or file..." --upload club-members.graphml` -> 03.png
(My first try named the file with a folder the tool did not accept -- a tool slip, not the app's; nothing ran.)

What I see: the start page is still there, and a message bar at the bottom: "club-members could not be opened: the file is incomplete or damaged near line 9, so nothing was read. Ask for the file again." with a close X.

Reading it aloud: could not be opened; incomplete or damaged; near line 9; nothing was read. "Nothing was read" answers my first question -- is anything half-loaded that I might mistake for the whole club? No. Good. "Near line 9" is something my coworker can act on.

Hesitation: is that all it will tell me? It does not say which of the two -- cut off, or damaged -- and nothing about what kind of file it took it for. I would like to copy the sentence into my email. I will wait a few seconds to see whether the message goes away before I have written it down.

Next: wait 8 seconds and look again.

## Step 4 -- does the message stay?

Command: `--step --wait 8000` -> 04.png

What I see: the same message, still there after 8 seconds. It waits for me to close it. Good -- I have time to write it down: "the file is incomplete or damaged near line 9, so nothing was read."

Hesitation: one source is not a story. Before I email my coworker and tell him his file is broken, I want a second door to agree. There is "New from data..." under Start -- maybe that is a more forgiving reader for files that are not projects.

Next: click "New from data..." and see what it asks for.

## Step 5 -- "New from data..."

Command: `--step --click "New from data..."` -> 05.png

What I see: a page "Open as a new graph", an empty "Tables" list with a +, "Drop a file here, or choose a file...", a Direction box "As the file says", and Cancel / Load (Load greyed, "Choose a file first"). The title bar now says "Untitled". The error message from before is gone -- glad I wrote it down.

Next: "choose a file..." and give it the same club-members.graphml.

## Step 6 -- the same file through "New from data..."

Command: `--step --click "choose a file..." --upload club-members.graphml` -> 06.png

What I see: a red box: "club-members.graphml could not be read as GraphML. Check the file, or pick another format in File settings." Below it a "File settings" bar. Load stays grey: "The file could not be read". The Tables list is empty, so again nothing came in.

The two doors agree that it fails, but they do not say the same thing. The first said "incomplete or damaged near line 9" and "ask for the file again". This one says only "could not be read as GraphML", without the line, and suggests picking another format -- which makes me wonder whether the file is fine and the program guessed the wrong kind. "Says who?" Which one do I believe?

Next: open "File settings" once to see whether it tells me more (a line number, a reason), or whether picking a format is the real fix.

## Step 7 -- File settings

Command: `--step --click "File settings"` -> 07.png

What I see: a small panel: Format "Auto", and "Error limit -- Bad rows read past before the file is refused", set to 100. Nothing more about why this file failed: no line number, no reason.

My reading: the file ends in .graphml, my coworker said it was GraphML, and the program already read it as GraphML ("Auto", and the red box said "as GraphML"). Picking some other format would be guessing, and I do not guess. The error limit is about bad rows; the first message said the file is incomplete near line 9 -- you cannot skip past rows that are not there. Raising it to get "something" on screen would give me a network I cannot vouch for. I stop here.

What I will tell my coworker: "The club-members.graphml you sent won't open -- the program says it is incomplete or damaged near line 9 and read nothing from it. Can you export or send it again?"

Done. Ending the session.

Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s44`

## Debrief, in character

**Did I finish?** Yes. I know exactly what to tell my coworker: the file is incomplete or damaged near line 9, nothing was read from it, send it again. I did not get a network to work on, and I should not have -- the file is broken.

**Ease: 6 of 7.** One click and one file, and the first message answered the three things I needed: it failed, nothing half-loaded, and roughly where ("near line 9"). It stayed on screen until I closed it, so I could copy it down. It is one point off 7 because of the second door.

**What confused me:**

- The two ways in tell different stories. "Open project or file..." said "incomplete or damaged near line 9 ... Ask for the file again." "New from data..." said only "could not be read as GraphML. Check the file, or pick another format in File settings." -- no line, and a hint that a different format might fix it. For a cut-off file that hint is wrong, and someone less stubborn could waste time trying formats.
- "Incomplete or damaged" -- which? It matters for what I tell the sender: "it got cut off in the email" and "it is malformed" are different requests. I could not tell from the screen which it was.
- File settings offers an "Error limit" for bad rows. It is not clear whether that would let this file through. I chose not to try, because a network built from a partial file is a network I cannot defend to an editor.
- The first message disappeared when I went to "New from data...". If I had not written it down, I would have lost the line number.
- Small plus: the "No thanks" to usage data was acknowledged right away ("Usage data stays off"), and the start page says files are read on this computer and never uploaded. That is what I check first.
