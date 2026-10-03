# Session: deciding what the app may send back on first open (nonprofit operations analyst)

Participant: Grace, operations and data coordinator at a small nonprofit, first time in a graph tool.
Task as given: "You are opening this program for the first time, on a work laptop. Before you put
any data into it, decide whether you are comfortable with what it may send back to its makers, and
make that choice."

Commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t15--nonprofit-operations-analyst/.

## Step 1 -- start screen (shots/tasks/r8-t15/01.png)

What I see: the start page, with "Files are read on this computer and never uploaded" on the left,
"Local only" with a lock at the top right, and a box along the bottom: "Your data is yours, but
please help us." Two buttons, "Share usage data" and "No thanks", and a "What is collected" link.

Thinking aloud: Good, it asks before anything happens, and it says "Nothing is collected until you
answer." But "the author of the application and his Claude Code sessions" -- I don't know what
Claude Code is. It sounds like an AI. I'm not clicking yes until I see what they actually take.

## Step 2 -- open "What is collected"

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t15 --click "What is collected"

What I see: a list. "A replay of each session, with every node name, attribute value, label and
file content masked." Task events with timings, errors and performance, a feedback widget. Then in
bold: "No file contents ever leave your computer."

Thinking aloud: A replay of my session? So it records what I do on screen. They say the names are
"masked", but I'd have to take their word for it, and these are donor names. The bold line helps,
and I'd believe it for the file. But a recording plus an AI reading it -- I can't clear that with my
director, and I'm not going to try. No.

## Step 3 -- decline

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t15 --click "What is collected" --click "No thanks"

What I see: the box is gone. A small black note at the bottom: "Usage data stays off." with a
"Settings" button.

Thinking aloud: OK, that's clear. "Stays off" -- so it was never on. Good.

## Step 4 -- double-check through the "Local only" label

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t15 --click "No thanks" --click "Local only"

What I see: a Settings window opened on Privacy. "Share usage data" switch is off. Below, "Where
your data goes -- A plain statement you can forward to whoever asks": Files you open -- Read on
this computer, never uploaded. Your project -- saved where you save it. Assistant keys -- kept in
this browser, only while Remember keys is on. Usage data -- Off. Nothing is sent.

Thinking aloud: This is the page I'd screenshot for my director. "Usage data: Off. Nothing is
sent." Done. Two things bother me, though. Behind the settings window there is now a whole project
open -- "Les Miserables" with colors and lists -- and I never opened that. Did clicking the lock
open a sample? That makes me wonder what else happens that I didn't ask for. And "Assistant keys":
what assistant? Nobody told me there's one. If it's the same AI as the "Claude Code" in the
message, I'd want to know whether it's on.

I'm stopping here; I made my choice and confirmed it.

## Outcome

- Succeeded? Yes. I said no to usage data, and the Privacy page confirms "Off. Nothing is sent."
- Single Ease Question: 6 of 7. The choice itself was easy and honest; the wording about an AI
  and the project that appeared out of nowhere took a point off.
- Would I use this instead of my current tool? Maybe. Right now I use Excel and I can't install
  add-ins. This one asks first, says files never leave the laptop, and gives me a plain statement I
  can forward -- that's more than most tools do. I'd still want my director or IT to read the
  "assistant" and "session replay" parts before I load donor names.

## Problems noticed

1. "The author of the application and his Claude Code sessions" -- an unexplained product name
   that reads as "an AI will see this". Made me less willing to say yes. (moderate)
2. "A replay of each session" is the first item in the list; "replay" sounds like screen
   recording, and "masked" is a promise I can't check. (moderate, it decided my answer)
3. Clicking "Local only" opened Settings over a Les Miserables project I never opened. Unexplained
   change behind my back, on the very screen meant to reassure me. (moderate)
4. "Assistant keys" on the Privacy page mentions an assistant nobody introduced. (minor)

## What worked

- Asked before collecting anything, and said so ("Nothing is collected until you answer").
- "No file contents ever leave your computer" in bold, and "Files are read on this computer and
  never uploaded" on the start page.
- "Usage data stays off." confirmation after No thanks.
- The "Where your data goes" statement, written to be forwarded.
