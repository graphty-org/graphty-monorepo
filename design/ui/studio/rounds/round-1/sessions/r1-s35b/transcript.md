# Session r1-s35b -- Elena (first-time graph user), T5: a file that will not read

Dataset: `club-members.graphml` (a GraphML file cut off part way through). Start: empty app.

Note on timing: the start command waited about 45 minutes for a free browser slot before the first
screenshot appeared; all four slots were held by other sessions. The session itself took three
steps.

## Step 1 -- the empty app (01.png)

Command: `node tool/real.mjs --start rounds/round-1/sessions/r1-s35b empty`

What I saw: a dark start page. Left column "Start" with "Open project or file..." (Ctrl+O), "New
from data...", "or drop a file anywhere in this window", "Files are read on this computer and never
uploaded." Middle: "Recent projects", empty. Right: four samples (Les Miserables, Zachary's karate
club, College football, Florentine families). At the bottom a box asking to share usage data, with
"Share usage data" and "No thanks".

Think-aloud: "Okay, it's asking about usage data first. No thanks. My coworker sent me a file, so
'Open project or file...' is the obvious one -- 'New from data' sounds like building something from
a spreadsheet, and I already have a file. Nice that it says files never leave my computer."

No hesitation.

## Step 2 -- open the file (02.png)

Command: `--step --click "No thanks" --click "Open project or file..." --upload club-members.graphml`

Tool output: a file chooser opened; chose club-members.graphml.

What I saw: still the start page, usage box gone. A message bar near the bottom of the window:
"club-members could not be opened: the file is incomplete or damaged near line 9, so nothing was
read. Ask for the file again." with a close (X) button.

Think-aloud: "Oh. It didn't open. But it tells me why: the file is incomplete or damaged around
line 9, and nothing was read -- so I'm not looking at half a network and wondering what's missing.
And it tells me what to do: ask for the file again. That's exactly what I'd want. I don't have to
guess whether it's me."

Slight hesitation: "near line 9" means nothing to me personally, but I can paste it into my email
and my coworker will know what it means.

## Step 3 -- does the message stay? (03.png)

Command: `--step --wait 10000`

What I saw: the same screen, and the message is still there after ten seconds.

Think-aloud: "Good, it doesn't vanish while I'm copying it into an email. I'll write: 'The
club-members file you sent seems to be cut off or damaged around line 9 -- the program couldn't
read any of it. Could you export it again and resend?' Done."

Command: `node tool/real.mjs --end rounds/round-1/sessions/r1-s35b`

## In character, at the end

- **Did I finish?** Yes. I could not carry on working with this file, but I know exactly what to
  tell my coworker: the file is incomplete or damaged near line 9, nothing was read, please send it
  again.
- **How hard was it (1 = trivial, 7 = impossible)?** 1. One click to open, and the answer was on
  the screen right away.
- **What confused me?**
  - Nothing really blocked me. "Near line 9" is a technical detail I can't check myself, but it's
    useful to pass along.
  - Small wish: the message sits in a bar near the bottom of the page, away from where I clicked; on
    a busy screen-share I might have missed it. A "copy message" button would make forwarding it
    easier.
  - I wasn't sure whether the message would disappear on its own; it didn't in ten seconds, which
    was a relief.
