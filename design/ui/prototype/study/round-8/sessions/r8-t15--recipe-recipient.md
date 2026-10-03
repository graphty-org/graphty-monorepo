# Session: deciding what the program may send back (recipe recipient, "Tom")

Task as given: "You are opening this program for the first time, on a work laptop. Before you put
any data into it, decide whether you are comfortable with what it may send back to its makers, and
make that choice."

Renders are in design/ui/prototype/tmp/round-8-sessions/r8-t15--recipe-recipient/.

## Step 1 -- the start screen (shots/tasks/r8-t15/01.png)

No command; this is what opened.

Think-aloud: "OK, no sign-in. Good. Top right says 'Local only' with a padlock, and on the left in
small gray print 'Files are read on this computer and never uploaded.' Fine, but small gray print
is what everybody writes. Then there's this box along the bottom: 'Your data is yours, but please
help us.' That's the line I actually read. The next bit says they will never see the data I
analyze but want to collect how I use it. '...only ever be used by the author of the application
and his Claude Code sessions.' What is a Claude Code session? Is that a person, a company, some
AI thing? That's somebody outside the building. Before I say yes to anything I want to see what
'information about how you use the app' means. There's a 'What is collected' link. I'll open that
before I touch either button."

## Step 2 -- open "What is collected" (02.png)

    timeout 120 node app-b/study.mjs --try .../tmp/round-8-sessions/r8-t15--recipe-recipient/02.png task:r8-t15 --click "What is collected"

What I saw: four bullets. "A replay of each session, with every node name, attribute value, label
and file content masked." "Anonymous task events with their timings..." "Errors and performance."
"A feedback widget..." Then in bold: "No file contents ever leave your computer."

Think-aloud: "A replay of each session. So a recording of my screen, of what I clicked. They say
the names are masked. Masked how? By whom? If one gene name slips through, that's unpublished data
on somebody's server, and it's my name on the data-management sheet. I'm not able to check that
masking myself, and IT certainly hasn't reviewed it. The bold line says no file contents leave my
computer, but the first bullet is a replay of my session with the contents 'masked', so something
about my screen does leave. That's two statements I'd have to reconcile for IT. And the 'Claude
Code' thing is still not explained. On a work laptop the answer is no. Good that the box says
nothing is collected until I answer -- so I haven't already sent anything by looking."

## Step 3 -- click "No thanks" (03.png)

    timeout 120 node app-b/study.mjs --try .../tmp/round-8-sessions/r8-t15--recipe-recipient/03.png task:r8-t15 --click "What is collected" --click "No thanks"

What I saw: the box went away and a small dark message at the bottom said "Usage data stays off."
with a "Settings" button.

Think-aloud: "'Stays off.' Good, that's a straight answer -- it was off and it's still off. I'd
like to see that somewhere that doesn't disappear, though. The padlock says 'Local only' up top.
Let me click that and see if it says the same thing."

## Step 4 -- click "Local only" (04.png)

    timeout 120 node app-b/study.mjs --try .../tmp/round-8-sessions/r8-t15--recipe-recipient/04.png task:r8-t15 --click "What is collected" --click "No thanks" --click "Local only"

What I saw: a Settings window opened on "Privacy". "Share usage data" with a switch, which is off.
Below it, "Where your data goes -- A plain statement you can forward to whoever asks." Then a list:
Files you open -- Read on this computer. Never uploaded. Your project -- Saved where you save it.
Assistant keys -- Kept in this browser, only while Remember keys is on. Usage data -- Off. Nothing
is sent. And a line about exports being saved where you choose, never sent.

But behind the window the whole screen had changed: there's a network open called "Les Miserables"
with panels full of things -- PageRank, Louvain, Shortest paths, a table.

Think-aloud: "This bit is what I wanted. 'Usage data: Off. Nothing is sent.' And 'a plain
statement you can forward to whoever asks' -- that's exactly what IT will ask me for. I'd
screenshot this and send it to them. Switch is off, so that matches what I chose.

"Hang on, though. What's all that behind it? I clicked a padlock and now there's a network open
that I never opened. Les Miserables? Did it load a sample by itself? I didn't put anything in yet
-- that was the whole point. I suppose it's their example, not mine, so no harm, but I don't like
a program doing things I didn't ask for. And 'Assistant keys' -- what assistant? Is there
something in here that talks to an outside service? It says kept in this browser, but I'd want to
know what the assistant sends before anyone in the lab turns it on. There's also something called
'Diagnostics' in the list on the left. I'm not clicking that."

I stopped here. I'd made the choice and found it written down.

## After the task

Did I succeed? Yes. I turned down the usage data, the app confirmed it twice ("Usage data stays
off", and "Usage data: Off. Nothing is sent." on the Privacy page), and nothing was collected
before I answered.

Single Ease Question: 5 of 7. The choice itself was easy -- the box was right in front of me with
two plain buttons. Points off because the explanation raised two questions it didn't answer (what
a "Claude Code session" is, and how a "masked replay" squares with "no file contents ever leave
your computer"), and because clicking the padlock opened a network I hadn't asked for behind the
settings, which made me wonder what else it does on its own.

Would I use this instead of what I use now? For this part, it's better than anything I've had:
Cytoscape never told me where anything went, and the postdoc's web pages certainly didn't. The
"Where your data goes" page is something I could forward to IT as-is. Whether I'd put our
unpublished hits in it is still IT's call, not mine, and I'd also need to know what that
"Assistant" sends before I'd let anyone switch it on. Today I'd still ask her to send me a PNG and
the spreadsheet, but I'd send IT that page.

## Problems noticed

- The consent text names "the author of the application and his Claude Code sessions" as the
  recipient of usage data with no explanation of what that is; to a lab manager it reads as an
  unnamed outside party. (severity: medium)
- "A replay of each session ... masked" sits next to bold "No file contents ever leave your
  computer"; the two read as contradicting each other, and the masking can't be checked by the
  user. (severity: medium)
- Clicking the "Local only" padlock on the empty start screen opened Privacy settings over a fully
  loaded "Les Miserables" network the participant never opened. (severity: medium)
- The Privacy page lists "Assistant keys" without saying what the assistant is or what it sends.
  (severity: low)

## What worked

- Nothing is collected until you answer, and the box says so.
- "No thanks" was confirmed with "Usage data stays off."
- The Privacy page's "Where your data goes" list, "a plain statement you can forward to whoever
  asks", answers the exact question IT asks.
