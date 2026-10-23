# Session r3-s52 -- Morgan Reyes (screen-reader analyst), task T5: a file that will not read

Dataset: club-members.graphml. Start: empty, screen-reader mode (keyboard only; no pointer).

## Step 0 -- start

Command: `node tool/real.mjs --start rounds/round-3/sessions/r3-s52 empty --sr`

Heard: `focus: nothing (the page itself)`. No page title or heading spoken at load.

Morgan: "Nothing has focus. Fine, that is normal for a page. I'll read what is around and then Tab."

## Step 1 -- browse-mode read of the page

Command: `--step --read`

Heard: button "Main menu"; heading 1 "graphty"; button "Local only"; heading 2 "Start"; button "Open project or file... Ctrl+O"; button "New from data..."; "or drop a file anywhere in this window Files are read on this computer and never uploaded."; heading 2 "Recent projects" (empty); heading 2 "Samples" with four sample buttons; then a long usage-data paragraph with "Share usage data" / "No thanks".

Morgan: "Headings. Good, somebody named the parts. And it says files are read on this computer and never uploaded -- that answers my first question before I asked it. The usage-data paragraph is long; I'm saying no to that. Then Ctrl+O, since it told me the shortcut."

## Step 2 -- Tab x3

Command: `--step --key Tab --key Tab --key Tab`

Heard: focus button "Main menu", then "Local only", then "Open project or file... Ctrl+O".

Morgan: "Tab order follows the reading order. I'm on Open. Enter, and I expect a file picker."

## Step 3 -- Enter on Open

Command: `--step --key Enter`

Heard: the system file chooser opened; focus stays on "Open project or file... Ctrl+O".

Morgan: "Standard file dialog. I'll go to Downloads and pick club-members.graphml."

## Step 4 -- choose club-members.graphml

Command: `--step --upload club-members.graphml`

Heard: focus: nothing (the page itself). Then an assertive alert, twice in a row, identical: "club-members could not be opened: the file is incomplete or damaged near line 9, so nothing was read. Ask for the file again."

Morgan: "Well. That's actually a sentence I can use: important word first-ish -- the file name, then 'could not be opened', a line number, and what to do. But I heard it twice, word for word, and my focus went nowhere -- it fell off the button onto the page. Is that message still somewhere I can read it, or did it just go by? Let me read the page."

Hesitation: focus loss after the file dialog closed; double announcement.

## Step 5 -- read the page again

Command: `--step --read`

Heard: the same start page as before, and at the very end, after the usage-data buttons: "club-members could not be opened: the file is incomplete or damaged near line 9, so nothing was read. Ask for the file again." followed by button "Dismiss". Focus still: nothing.

Morgan: "Good -- it stayed. It's at the bottom of the page, after the usage-data essay, so a person reading top-down hears everything else first, but it's there and I can go back to it. Let me check I can reach it with the keyboard and not just in browse mode: Shift+Tab from nowhere should land at the end."

## Step 6 -- Shift+Tab

Command: `--step --key Shift+Tab`

Heard: focus: nothing (the page itself). Shift+Tab from nowhere did not land on anything.

Morgan: "Hm. Nothing. Maybe the browser chrome took it. Tab forward then."

## Step 7 -- Tab

Command: `--step --key Tab`

Heard: focus button "Main menu" -- back to the top of the tab order, not near the message.

Morgan: "Focus restarted at the top. The message is reachable in browse mode at the end of the page; I'm not going to Tab through eighteen stops to press Dismiss. I know what to tell my coworker. Done."

## End

Command: `--end rounds/round-3/sessions/r3-s52`

## Debrief (in character)

**Did I finish?** Yes. I know exactly what to tell my coworker: "club-members.graphml is incomplete or damaged near line 9 -- the program read nothing from it. Please send it again; it looks cut off." I did not end up with anything to work on, but the task allowed for that and the file is the problem, not me.

**Ease: 6 out of 7.**

What worked:

- The start page has real headings and real buttons with names. Ctrl+O was spoken on the Open button, and the Tab order matched the reading order.
- Before I even asked, it told me files are read on this computer and never uploaded. That is the first thing I need to know before loading anything from work.
- The error is a sentence I can repeat to someone: which file, that nothing was read, roughly where (line 9) and what to do (ask for it again). No stack trace, no "error 0x...".
- The message stayed on the page after it was announced, so I could go back and read it again.

What bothered me:

- The alert was spoken twice, word for word, back to back. At my speed that is a whole sentence wasted, and it makes me wonder whether two things failed.
- When the file dialog closed, focus went nowhere -- not back to the Open button, not to the message. I had to go hunting.
- The message sits at the very bottom of the page, after the long usage-data paragraph and its two buttons. Reading top-down I hear the whole start page again before I find it. Shift+Tab from the page did not take me there either; Tab took me back to the top.
- "Damaged near line 9" -- my coworker will ask "line 9 of what?" It's fine for me because I'd open it in a text editor, but it doesn't say what is wrong there (it is cut off, by the look of it; the program could say "it ends early" if that's what it knows).
- The usage-data paragraph is long and mentions "his Claude Code sessions" -- I skipped it, and I'll skip it every time it is still there.

Would I use this instead of my scripts? For this job, NetworkX would have given me a parse error with a line number too, but a less readable one. As a first impression it's better than "almost": the parts I touched talked to me.
