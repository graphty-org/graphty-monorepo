# Session r2-s45 -- Morgan (screen-reader analyst), task T5 "A file that will not read"

Screen-reader mode: keyboard only, reading the focus: and live: lines.

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s45 empty --sr`

Heard: `focus: nothing (the page itself)`. No live announcement, no page title read.

Morgan: "Silence. Focus is on the page itself. Fine -- I will Tab and find out what this enthusiastic thing offers."

## Steps 2-8 -- Tab through the start page

Commands: `--step --key Tab` seven times.

Heard, in order: button "Main menu"; button "Local only"; button "Open project or file... Ctrl+O"; button "New from data..."; button "Open the Les Miserables sample"; button "Open the Zachary's karate club sample"; button "Open the College football sample".

Morgan: "No heading I could jump to, but the buttons are named. 'Local only' is the first thing it says after the menu -- that answers my first question, where my file goes, if it means what I hope. 'Open project or file, Ctrl+O' is the obvious door. I will use the shortcut it told me about."

## Step 9 -- Ctrl+O

Command: `--step --key Control+o`

Heard: a file chooser opened (the system dialog); focus still reported on "Open the College football sample".

Morgan: "The Windows file dialog -- that I know. I pick club-members.graphml from Downloads."

## Step 10 -- choose the file

Command: `--step --upload club-members.graphml`

Heard: `live: status (polite): "No nodes to draw"`, then the assertive alert "club-members could not be opened: the file is incomplete or damaged near line 9, so nothing was read. Ask for the file again." -- twice. Focus dropped to the page itself.

Morgan: "That is a real sentence: what failed, where, what was kept (nothing), and what to do. Better than most. But it said it twice, at full interrupt, and 'No nodes to draw' came first, which for half a second sounded like an empty graph had loaded. And focus fell to nowhere, so I do not know where I am. I want to find that message again on the page and see if there is more detail -- 'near line 9' is good, I would like the actual problem too. Tab."

## Step 11 -- Tab to find where I am

Heard: button "Main menu" -- back at the very top.

## Steps 12-19 -- Tab through the whole page looking for the message

Commands: `--step --key Tab` eight times.

Heard: "Local only"; "Open project or file... Ctrl+O"; "New from data..."; the four sample buttons (Les Miserables, Zachary's karate club, College football, Florentine families); DisclosureTriangle "What is collected".

Morgan: "The page is exactly the start page again. The error is not something I can Tab to. Is it still on screen for a sighted person? I cannot tell. A few more Tabs to be sure."

Heard: button "Share usage data"; button "No thanks"; button "Dismiss"; then nothing (the page itself).

Morgan: "A usage-data question, fine. Then 'Dismiss' -- dismiss what? The usage question, or my error? A bare 'Dismiss' is the classic unlabeled toast close. If the error lives in a toast, I want to read it before I dismiss it. Let me go back to Dismiss and try arrow-reading around it... I only have Tab and keys here, so I will Shift+Tab back and see if anything more is said."

Heard: button "Dismiss" -- nothing more.

Morgan: "Still no clue what it dismisses. I already have the error text in my braille notes, so I will risk it and press it to find out."

## Step 25 -- Enter on Dismiss

Heard: focus: nothing (the page itself). No announcement of what closed.

Morgan: "Something went away and took my focus with it. Tab around once more to find out which thing it was."

## Steps 26-37 -- Shift+Tab around the whole page

Heard: "No thanks"; "Share usage data"; "What is collected"; the four samples; "New from data..."; "Open project or file... Ctrl+O"; "Local only"; "Main menu"; nothing (the page itself). "Dismiss" is gone.

Morgan: "So 'Dismiss' was my error message, and the usage question is still there. I closed the error without ever being able to read it in place -- if I had missed the first announcement, it was only reachable as a button called 'Dismiss' with no text of its own. Still: the app is back at its start page, nothing half-loaded, and I know what to tell my coworker. That part is done."

## End

Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s45`

## Debrief (in character)

**Did I finish?** Yes. I know exactly what to tell my coworker: "club-members.graphml is incomplete or damaged near line 9; the program read nothing from it. Please send it again." And the program was left in a clean state where I could carry on with another file.

**Ease: 6 out of 7.** Finding the open command took seven Tabs, and the shortcut was announced in the button name, so after that it was one keystroke. The error itself was the best part: what went wrong, where, what was kept, what to do.

**What confused me or slowed me down:**

- The error was announced twice in a row as an assertive alert. At my speech rate that is a full interruption repeated; once is enough.
- "No nodes to draw" was announced first, just before the error. For a moment it sounded like an empty graph had loaded successfully.
- After the error, focus fell to the page itself, so I had no idea where I was until I Tabbed back to "Main menu".
- The error message cannot be reached by Tab or read again in place. The only trace of it in the Tab order is a button called just "Dismiss", with nothing saying what it dismisses. I pressed it to find out, and it closed my error -- again leaving focus on nothing.
- "Near line 9" is helpful. Saying what was wrong at line 9 (cut off, unclosed tag) would let me tell my coworker more precisely, and would let me tell a cut-off download from a broken export.
- No headings to jump by on the start page; I had to Tab through every button.
- Nice surprise: "Local only" is the second thing it says. That is the first question I have about any web tool.
