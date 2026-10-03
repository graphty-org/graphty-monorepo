# Session: usage-data consent on first launch -- Nadia, level-1 alert reviewer

Task as given: "You are opening this program for the first time, on a work laptop. Before you
put any data into it, decide whether you are comfortable with what it may send back to its
makers, and make that choice."

Start screen: shots/tasks/r8-t15/01.png -- the start page with a usage-data card at the bottom
("Your data is yours, but please help us."), buttons "Share usage data" and "No thanks", a
"What is collected" expander, and a "Local only" chip with a lock in the top right.

All commands ran from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t15--alert-reviewer/.

## Step 0 -- reading the start screen

Think-aloud: "Okay, it's asking about my data right away. Good, at least it asks. 'We will never
see the data you analyze' -- everyone says that. 'Used by the author of the application and his
Claude Code sessions'? So some AI tool is reading it? This is a bank laptop. Before I click
anything, I want to know exactly what 'information about how you use the app' means. There's a
'What is collected' link, so I'll open that."

## Step 1 -- open "What is collected"

    timeout 120 node app-b/study.mjs --try .../r8-t15--alert-reviewer/01.png task:r8-t15 --click "What is collected"

Saw: the card grows into a list: a session replay with node names, attribute values, labels
and file content masked; anonymous task events with timings; errors and performance; a feedback
widget. Then, in bold: "No file contents ever leave your computer."

Think-aloud: "'A replay of each session.' So it records my screen. They say it's masked, but
masked how? If one account number or customer name gets through, that's a data incident, and I'm
the one who clicked yes. The bold line is nice, but the first bullet makes me nervous. Also, I
don't get to decide this. IT security would. When I'm not sure, the answer is no, same as an
alert: if in doubt, it goes up. No thanks."

## Step 2 -- click "No thanks"

    timeout 120 node app-b/study.mjs --try .../r8-t15--alert-reviewer/02.png task:r8-t15 --click "What is collected" --click "No thanks"

Saw: the card is gone. A small dark message at the bottom says "Usage data stays off." with a
"Settings" button. "Local only" is still in the top right.

Think-aloud: "'Stays off.' Good, so it was never on. That matches 'Nothing is collected until
you answer.' QA would want me to check it actually took, though. The top corner says 'Local
only' -- is that about this, or about files? Let me click it."

## Step 3 -- click "Local only" to check

    timeout 120 node app-b/study.mjs --try .../r8-t15--alert-reviewer/03.png task:r8-t15 --click "What is collected" --click "No thanks" --click "Local only"

Saw: a Settings window open on Privacy. The "Share usage data" switch is off. Under "Where your
data goes" is a list: Files you open -- read on this computer, never uploaded; Your project --
saved where you save it; Assistant keys -- kept in this browser, only while Remember keys is on;
Usage data -- Off. Nothing is sent. There is also a "Files you exported" link.
Behind the window, a full project is now open (Les Miserables, a graph, a long left-hand list, a
data panel on the right) where the empty start page used to be.

Think-aloud: "Okay, this is what I wanted. 'Usage data: Off. Nothing is sent.' And 'a plain
statement you can forward to whoever asks.' I'd literally screenshot this for IT. That's the
export test, and it passes: one picture, a few lines.
But wait, why is there a project open behind this? I didn't open Les Miserables. I clicked
'Local only'. Did that load a sample? Did I just put data in it? It's a novel, so it doesn't
matter, but I would want to know what I did. And 'Assistant keys': what assistant? I didn't set
one up. I'm not touching it. I'm done. Usage data is off and I've seen it written down."

## Outcome

- Succeeded? Yes. Declined usage data and confirmed in Settings > Privacy that it is off and
  nothing is sent.
- Single Ease Question: 6 of 7. The choice itself was easy and the confirmation was clear. I
  lost a point because the project appearing behind Settings made me unsure whether I had loaded
  something, and because I had to read about a "session replay" and an AI ("Claude Code
  sessions") before I could make up my mind.
- Would I use this instead of my current tool? Not my call, and not for clearing alerts: my
  queue lives in the case system. But on privacy alone, the "Where your data goes" box is
  better than anything our vendors give me. I could forward it to IT security as is. If this
  ever goes up for approval, that box helps, and the words "session replay" and "Claude Code"
  hurt.

## Problems observed

1. Clicking "Local only" after declining left the start page and showed a full project
   (Les Miserables) behind Settings. The participant could not tell whether her click had loaded
   data, right after a task that was about not putting data in yet. Severity: medium.
2. The consent card's first bullet, "a replay of each session", and the phrase "his Claude Code
   sessions" read as screen recording and AI access. For a bank user that alone decides "no".
   The bold "No file contents ever leave your computer" sits below the bullets that worry her.
   Severity: low to medium (it did not block the task, but it drives the answer).
3. "Assistant keys" in the privacy statement names a feature she never set up. It caused
   mild unease. Severity: low.

## What worked

- "Nothing is collected until you answer" plus the toast "Usage data stays off." told her the
  default was safe.
- Settings > Privacy has a "Where your data goes" statement, one line per kind of data, that she
  would screenshot for compliance.
- "What is collected" lists the specifics on the first screen, before she has to answer.
