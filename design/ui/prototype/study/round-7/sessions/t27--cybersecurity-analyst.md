# Session: first open at work, decide what may leave the computer, then start on the sample

Participant: Priya, threat hunter in a bank SOC (persona file study/personas/cybersecurity-analyst.md)

Task as given by the moderator: "This is your first time opening graphty at work. Your IT policy
says nothing about your work may leave your computer. Decide what you are comfortable with, then
start on the sample of characters."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t27--cybersecurity-analyst/.

## Start screen (shots/tasks/t27/01.png)

Think-aloud: "Okay. Three questions before I do anything: is this approved, where does it run, does
it phone home. Top right says 'Local only' with a lock. Left column says 'Files are read on this
computer and never uploaded.' Good, that's two of three answered before I asked. Then there's a
banner at the bottom: 'Your data is yours, but please help us.' That's the phone-home question. It
says nothing is collected until I answer -- fine, but I want to know what 'information about how you
use the app' means before I click anything. And '...used by the author of the application and his
Claude Code sessions'? So an AI tool sees it. That's a no at a bank, but let me read what it is."

## 01 -- expand "What is collected"

    timeout 120 node app-b/study.mjs --try .../01.png task:t27 --click "What is collected"

Think-aloud: "'A replay of each session, with every node name, attribute value, label and file
content masked.' A session replay. Masked or not, a screen recording of my analyst tool leaving the
building is exactly what policy says no to. I can't verify the masking. Task events and timings,
errors, a feedback widget. 'No file contents ever leave your computer.' Fine, but the answer is still
No thanks. Credit where due: the list is short and concrete and it's shown before I'm asked to
decide, not after."

## 02 -- before deciding, click the "Local only" chip to see what it claims

    timeout 120 node app-b/study.mjs --try .../02.png task:t27 --click "Local only"

Think-aloud: "That opened Settings, Privacy page. Wait -- it also dropped me into a project
behind the dialog. Les Miserables is open back there with a bunch of layers already. I clicked a
privacy chip on the start screen, I didn't open a project. Odd, but whatever.

The Privacy page is the best thing so far. 'Where your data goes. A plain statement you can forward
to whoever asks.' Files you open: read on this computer, never uploaded. The Assistant: only when you
ask, sends your question with node names and statistics to Anthropic. Data sources: request goes
from this computer. Usage data: Off, nothing is sent. And a 'What this does not promise' paragraph --
browser extensions can read what's in the browser. That's honest. I could paste this table into a
vendor review ticket as-is. That's the thing I would actually show my lead.

Two catches. One: 'Usage data: Off' -- but the banner is still unanswered, so is it off or is it
'not yet decided'? It says off, I'll take it. Two: the Assistant line. Node names to Anthropic. With
real host names that's a hard no. I want it off, not just 'only when you ask'."

## 03 -- answer the banner: No thanks

    timeout 120 node app-b/study.mjs --try .../03.png task:t27 --click "No thanks"

Think-aloud: "Banner gone. Toast: 'Usage data stays off.' with a Settings button. Good, it confirmed
what it did. That's the phone-home answered."

## 04 -- Settings, Assistant page

    timeout 120 node app-b/study.mjs --try .../04.png task:t27 --click "No thanks" --click "Local only" --click "Assistant"

Think-aloud: "Assistant page. Provider: Anthropic. Model: listed from Anthropic. Key: a row of dots.
There's ALREADY a key in there? I didn't paste one. Whose key is that? On a work laptop that is a
question for my security team. And 'Remember keys on this device' is on. I'm looking for an off
switch for the whole Assistant. There isn't one on this page that says 'Off'."

## 05, 06 -- try the Provider dropdown for a "None" option

    timeout 120 node app-b/study.mjs --try .../05.png task:t27 --click "No thanks" --click "Local only" --click "Assistant" --click "Anthropic"
    -> nothing on screen is called "Anthropic"
    timeout 120 node app-b/study.mjs --try .../06.png task:t27 --click "No thanks" --click "Local only" --click "Assistant" --click "Provider"

Think-aloud: "Clicked the provider box, nothing opened. Clicked the Provider label, nothing
useful. I wanted 'None'. Not there, or I can't get to it. Workaround: kill the key."

## 07, 08 -- Forget all keys

    timeout 120 node app-b/study.mjs --try .../07.png task:t27 --click "No thanks" --click "Local only" --click "Assistant" --click "Forget all keys"
    timeout 120 node app-b/study.mjs --try .../08.png task:t27 --click "No thanks" --click "Local only" --click "Assistant" --click "Forget all keys" --click "Forget"

Think-aloud: "Confirm dialog: 'Every provider's key is removed from this browser, and the Assistant
stops until you paste a key again.' That's what I want -- 'the Assistant stops'. Forget. Toast: 'All
keys forgotten.' Key box now says 'Paste your Anthropic key', model says 'Listed once the key is
checked'. Fine. I'd still rather have a switch that says Off; 'no key' is an off switch by accident.
I left 'Remember keys' on because there's nothing to remember now; I'd turn it off if this were
real, so a key pasted by mistake doesn't stick around."

## 09 -- close Settings

    timeout 120 node app-b/study.mjs --try .../09.png task:t27 --click "No thanks" --click "Local only" --click "Assistant" --click "Forget all keys" --click "Forget" --key Escape

Think-aloud: "Escape closed it. Here's the graph. Top bar still says 'Local only'. Legend says
color is PageRank, size is degree, square root scale, 1 to 36. Good, there's a legend. The left
panel has a lot already: Louvain, Shortest paths, a Watchlist, a 'For the report' folder. This is a
sample somebody prepared, I guess. 'Starting on the sample' -- I'm on it."

## 10, 11 -- the route a normal person takes: start screen, No thanks, the sample card, then Table

    timeout 120 node app-b/study.mjs --try .../10.png task:t27 --click "No thanks" --click "Les Miserables"
    timeout 120 node app-b/study.mjs --try .../11.png task:t27 --click "No thanks" --click "Les Miserables" --click "Table"

Think-aloud: "Same screen when I go through the sample card. So the chip earlier really did open
this project under me. The Table is what I want: 77 nodes, sorted by degree, Valjean on top with
36, then Gavroche 22, Marius 19. 'Valjean is first on all three measures; Gavroche is in the top
3 on all three.' Good, that's the 'which of these do I look at first' line. Counts match the summary
on the right: 77 nodes, 254 edges, one connected component. Nothing that doesn't add up."

## 12 -- check the Assistant is really off

    timeout 120 node app-b/study.mjs --try .../12.png task:t27 --click "No thanks" --click "Local only" --click "Assistant" --click "Forget all keys" --click "Forget" --key Escape --click "Assistant"

Think-aloud: "Assistant panel: 'Off. Nothing is sent. Turn on in Settings.' That's the sentence I
wanted. Done. Usage data off, Assistant off, files local. I'm starting on the sample."

## Debrief

Did I succeed? Yes. Usage data is off, the Assistant has no key and says "Off. Nothing is sent.",
files never leave the machine, and I'm looking at the characters in a table sorted by degree.

Single Ease Question: 5 of 7.
- What earned it: "Local only" in the top bar, "Files are read on this computer and never uploaded"
  on the start screen, "What is collected" open before I answer, the "Where your data goes" table I
  could forward to a reviewer, and the honest "What this does not promise" paragraph.
- What cost it: there is no plain Off for the Assistant -- the provider box would not open, and the
  only way off was "Forget all keys", which turns it off as a side effect. A key was already
  saved and I don't know whose. Clicking the "Local only" chip on the start screen also opened a
  project behind the Settings dialog, which I didn't ask for. And the banner names "his Claude Code
  sessions" -- at a bank, the words "AI sessions see your usage" end the conversation even with
  masking.

Would I use this instead of my current tool? Not instead. Next to it, maybe, for a scrubbed or lab
file. The privacy statement is the first one I've seen in a graph tool that I could hand to vendor
review without rewriting. But nothing here changes the approved-software list -- a real trial still
stops at the ticket -- and I haven't seen a query box, a time range or a CSV export yet, which is
what decides whether it replaces anything.
