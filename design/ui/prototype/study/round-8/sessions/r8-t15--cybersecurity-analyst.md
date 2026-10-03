# Session: first launch, decide what the app may send back -- Priya (threat hunter, bank SOC)

Task given by the moderator: "You are opening this program for the first time, on a work laptop.
Before you put any data into it, decide whether you are comfortable with what it may send back to
its makers, and make that choice."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t15--cybersecurity-analyst/ (D below).

## 01 -- start screen (shots/tasks/r8-t15/01.png)

Three questions first: is this approved, where does it run, does it phone home. Not approved --
nobody has reviewed it, so in real life I stop here. It's a study, so I keep going.

Where does it run: top right says "Local only" with a lock, and on the left "Files are read on this
computer and never uploaded." Fine, that's a claim. Claims are cheap. Does it phone home: the box at
the bottom is literally asking to. "Your data is yours, but please help us." Good that it says
nothing is collected until I answer -- opt-in, not opt-out. That's the right default. But "only ever
be used by the author of the application and his Claude Code sessions" -- so an AI tool from a third
party gets fed my usage data? That's a second vendor I'd have to put through review. Already a no.
Before I click no, I want to see what they were going to take, so I know what I'm declining.

## 02 -- expand "What is collected"

    timeout 120 node app-b/study.mjs --try D/02.png task:r8-t15 --click "What is collected"

List: "A replay of each session, with every node name, attribute value, label and file content
masked." A session replay. On a bank laptop. Masked how? Client side, before it leaves? By regex?
My node names would be hostnames and account names -- if one masking rule misses one field, that's
an IOC list leaving the building. Then "anonymous task events with their timings", "errors and
performance", a feedback widget. Errors are the classic leak -- stack traces carry values. It does
say "No file contents ever leave your computer." in bold, which is the right sentence, but a replay
is a recording of my screen in all but name. No endpoint listed, no domain I could allowlist or
block. I'd need the domain to check with our proxy team.

## 03 / 04 -- the "Local only" chip, and the "Settings > Privacy" link

    timeout 120 node app-b/study.mjs --try D/03.png task:r8-t15 --click "Local only"
    timeout 120 node app-b/study.mjs --try D/04.png task:r8-t15 --click "Settings > Privacy"

Both land on the same Privacy page. Okay, so the chip is a door to the privacy statement --
consistent, I like that. But hold on: behind the dialog there's a whole project open. "Les
Miserables", 77 nodes, PageRank, Louvain, a "Watchlist", notes. I didn't open anything. I clicked a
privacy link on the start screen. Did it just load a sample on my behalf? Is that mine now? For a
first-run "before you put any data in" moment that's unsettling -- I can't tell what state the app
is in.

The Privacy page itself is the best thing I've seen today. "Where your data goes -- a plain
statement you can forward to whoever asks." Files you open: read on this computer, never uploaded.
Your project: saved where you save it. Assistant keys: kept in this browser only while Remember keys
is on. Usage data: Off, nothing is sent. Exports never sent. That's a table I could literally paste
into a vendor review ticket. What's missing: the Assistant row talks about keys but not about what
goes TO the assistant. If I use it, does my graph go to some model provider? That's the row I need.
Also no domains, no "here is every outbound request this app can make".

## 05 -- Settings > Assistant (failed)

    timeout 120 node app-b/study.mjs --try D/05.png task:r8-t15 --click "Settings > Privacy" --click "Assistant"

Tried to read the Assistant settings to see if it calls out. The click went to the other
"Assistant" (the side rail one) and didn't go anywhere useful. Two things named Assistant on screen
at once. I'm not chasing it; I'm not going to use anything called Assistant on bank data anyway.

## 06 -- Settings > Diagnostics

    timeout 120 node app-b/study.mjs --try D/06.png task:r8-t15 --click "Settings > Privacy" --click "Diagnostics"

Logging, detailed profiling, frame rate -- all off. "Logging" with no description: logging to
where? Local console or the makers' server? It sits right under Privacy so I have to ask. One line
saying "kept on this computer" would settle it.

## 07 -- make the choice: "No thanks"

    timeout 120 node app-b/study.mjs --try D/07.png task:r8-t15 --click "No thanks"

Banner's gone, toast at the bottom: "Usage data stays off." with a Settings button. Clear,
no guilt trip, no second nag. Done -- that's my choice made.

## 08 -- verify in settings

    timeout 120 node app-b/study.mjs --try D/08.png task:r8-t15 --click "No thanks" --click "Settings"

"Settings" matched two buttons (the toast's and the gear). It opened General, not Privacy, and once
again a Les Miserables project is sitting behind the dialog. I'd expected the toast's Settings to
take me straight to the privacy toggle I just set. I already saw on 04 that the toggle shows Off,
so I'm taking the toast at its word. Stopping here.

## Wrap-up

Succeeded? Yes. I declined usage data before loading anything, and I know what I declined: a masked
session replay, task timings, errors, a feedback widget.

Single Ease Question: 6 of 7. The decision itself was easy -- opt-in, two plain buttons, a list of
what's collected one click away. Lost a point because opening privacy settings dropped me into a
project I never opened, and the two "Assistant"/two "Settings" collisions.

Would I use this instead of my current tool? Not yet, and not because of this screen. This is the
most honest first-run privacy screen I've seen in a graph tool, and the "Where your data goes" table
is something I'd forward to our third-party risk people. But it's still not on the approved list,
the statement names an AI vendor as a recipient of usage data, it gives no outbound domains I could
verify against the proxy, and the Assistant row doesn't say where my graph goes if I use it. Fix
those and it's a much shorter review.

## Problems noted (in her words)

- "I clicked a privacy link on the start screen and a whole project opened behind the dialog. I
  didn't load anything." (03, 04, 08)
- "The usage data goes to 'his Claude Code sessions' -- that's a second vendor seeing my sessions."
  (01, 02)
- "A session replay on a bank laptop. Masked how, and before or after it leaves?" (02)
- "Assistant keys row, but no row for what my graph sends to the assistant." (04)
- "Logging -- logging to where?" (06)
- "No domain list. I can't verify 'nothing is sent' against our proxy." (02, 04)
- "Settings after 'No thanks' opened General, not Privacy." (08)
