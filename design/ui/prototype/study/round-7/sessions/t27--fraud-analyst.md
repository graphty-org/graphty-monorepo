# Session: first open at work, under a "nothing leaves my computer" policy -- Sarah, fraud investigator

Task as given: "This is your first time opening graphty at work. Your IT policy says nothing about
your work may leave your computer. Decide what you are comfortable with, then start on the sample
of characters."

Mode: not mandated (her own five minutes). Start screen: shots/tasks/t27/01.png.
All commands run from design/ui/prototype; renders in tmp/round-7-sessions/t27--fraud-analyst/.

## Step 1 -- start screen (01.png, given)

"OK. First thing I read is the left column: 'Files are read on this computer and never uploaded.'
Fine, that's the sentence I'd forward to IT. Top right says 'Local only' with a lock. Good.
Then there's a box at the bottom: 'Your data is yours, but please help us.' Every vendor says
that. 'Only ever used by the author of the application and his Claude Code sessions' -- so an
AI is reading it? Not on a bank laptop. Before I say no I want to see what they'd take."

## Step 2 -- what is collected (02.png)

    timeout 120 node app-b/study.mjs --try .../02.png task:t27 --click "What is collected"

"'A replay of each session, with every node name, attribute value, label and file content masked.'
A replay. Of my screen, basically. Masked or not, I'm not explaining to IT security why a
recording of my case work went to someone's server. And they said 'nothing is collected until
you answer' -- at least they asked first. The bottom line, 'No file contents ever leave your
computer', is the right sentence. The answer is still no."

## Step 3 -- what does the lock mean (03.png)

    timeout 120 node app-b/study.mjs --try .../03.png task:t27 --hover "Local only"

"Tooltip: 'Change this in Settings > Privacy.' Change it to what? So it's not always local?
That worries me more than it reassures me. I'll say no to usage data, then go look."

## Step 4 -- decline (04.png)

    timeout 120 node app-b/study.mjs --try .../04.png task:t27 --click "No thanks"

"'Usage data stays off.' Good, a confirmation I could screenshot."

## Step 5 -- click the lock (05.png)

    timeout 120 node app-b/study.mjs --try .../05.png task:t27 --click "No thanks" --click "Local only"

"Settings opened on Privacy. Wait -- behind it I'm suddenly inside the Les Miserables chart, and
it already has stuff in it: shortest paths, a watchlist, 'For the report'. I never opened that.
Whose work is this? On my first day? Anyway.

This page is the one I actually wanted: 'Where your data goes -- a plain statement you can
forward to whoever asks.' That's exactly what I'd paste into an email to IT. Files: never
uploaded. Usage data: off, nothing is sent. Then: 'The Assistant -- only when you ask it
something, it sends your question with node names and statistics to Anthropic.' Node names.
In my world node names are customer names and account numbers. That has to be off. And 'What
this does not promise' -- fine, honest, I'll give them that."

## Step 6 -- the Assistant page (06.png)

    timeout 120 node app-b/study.mjs --try .../06.png task:t27 --click "No thanks" --click "Local only" --click "Assistant"

"There's already a key in there. Dots in the Key box. I didn't put a key in. Who did? If that key
works, the Assistant can send names out the moment someone clicks the button. And there is no
off switch -- just Provider: Anthropic. I'll try the dropdown for 'None'."

    timeout 120 node app-b/study.mjs --try .../08.png task:t27 --click "No thanks" --click "Local only" --click "Assistant" --click "Anthropic"
    -> nothing on screen is called "Anthropic"

"Can't open it the way I expected. Forget all keys, then."

## Step 7 -- forget keys (07.png, 09.png)

    timeout 120 node app-b/study.mjs --try .../07.png task:t27 ... --click "Forget all keys"
    timeout 120 node app-b/study.mjs --try .../09.png task:t27 ... --click "Forget all keys" --click "Forget"

"Confirm box: 'the Assistant stops until you paste a key again.' That's the sentence I wanted --
it's off. Key box now says 'Paste your Anthropic key'. Toast: 'All keys forgotten.' I'd rather
have a plain 'Assistant: off' switch that IT can see, not 'off because the key is gone'. Somebody
on my team pastes a key and it's back on with no one noticing."

## Step 8 -- Diagnostics, just in case (10.png)

    timeout 120 node app-b/study.mjs --try .../10.png task:t27 ... --click "Forget" --click "Diagnostics"

"Logging, profiling, frame rate. All off. 'Nothing here changes a graph.' Doesn't say whether
logging sends anything anywhere. I'll assume it's local since it's off anyway."

## Step 9 -- close and look at the chart (11.png)

    timeout 120 node app-b/study.mjs --try .../11.png task:t27 ... --click "Forget" --key Escape

"Esc closed it. Good. Big orange hairball-lite, a legend top left that says PageRank. I don't know
what PageRank is in my terms. The big dark one in the middle is Valjean. That's my 'account
everything touches'. Click it."

## Step 10 -- select Valjean (12.png)

    timeout 120 node app-b/study.mjs --try .../12.png task:t27 ... --key Escape --click "Valjean"

"'Valjean, 36 connections.' That's the number I'd want first. A row of icons popped up with no
words on them. I tried resting on one I guessed was neighbors:"

    timeout 300 node app-b/study.mjs --try .../13.png task:t27 ... --click "Valjean" --hover "Neighbors"
    -> nothing on screen is called "Neighbors"

"Nope. Clicked 'Data' instead, expecting his details:"

    timeout 120 node app-b/study.mjs --try .../14.png task:t27 ... --click "Valjean" --click "Data"

"That went to some data-sources page on the left and dropped my selection. Not what I meant.
Back. I'll go where I always go: the table."

## Step 11 -- the table (15.png, 16.png)

    timeout 120 node app-b/study.mjs --try .../15.png task:t27 ... --click "Valjean" --click "Table"
    timeout 120 node app-b/study.mjs --try .../16.png task:t27 ... --click "Valjean" --click "Table" --click "Edges"

"Now we're talking. Nodes table sorted by degree, and a sentence on top: 'Valjean is first on all
three measures.' That's the kind of line I can put in a narrative. Edges tab: source, target,
value -- if value were an amount, that's my counterparty list. But it's all 254 links, not
Valjean's 36, even though he's selected. I'd want it filtered to him without hunting."

## Step 12 -- export test (17.png - 20.png)

    timeout 120 node app-b/study.mjs --try .../17.png task:t27 ... --click "Edges" --click "Export"
    -> nothing on screen is called "Export"
    timeout 120 node app-b/study.mjs --try .../18.png task:t27 ... --click "Edges" --click "Les Miserables"
    timeout 120 node app-b/study.mjs --try .../19.png task:t27 ... --click "Les Miserables" --click "Export..."
    timeout 120 node app-b/study.mjs --try .../20.png task:t27 ... --click "Export..." --click "Data"

"Export is under the project name. Opening that menu threw away my selection and flipped the table
back to Nodes, which is irritating. Export dialog: 'Saved to this computer only; nothing is
uploaded.' Right message, right place, bottom left. Image: 'legend not drawn' -- the legend is
the part my reviewer needs, so I'd have to turn that on somewhere. One preset is called 'To
share' -- I don't share, I file. Data tab: CSV, full graph, edges. The preview shows
'0,1,...' -- numbers, not names. If that's what lands in Excel I'm doing a VLOOKUP before I can
read it. There's a warning box about what CSV can't hold that I didn't read. I stop here."

## Verdict

Succeeded? Mostly. The privacy part, yes: usage data off, Assistant key forgotten, and I found a
plain list of where data goes that I could forward to IT. Starting on the sample: I found the hub
and a sortable table, which is a start, not an investigation.

Single Ease Question: 5 of 7. The privacy statement was easy to find and clear. What cost me:
a key already stored on a fresh install, no real "Assistant off" switch, the lock's tooltip
implying "local only" can be changed, and landing in someone else's half-done chart without
opening it.

Would I use it instead of my current tool? Not instead of Excel; maybe beside i2 for the big
ring cases, if IT signs off. The privacy page is better than anything i2 or our vendors give me.
But the Assistant sending "node names" to an outside company is a feature IT will make us prove
is off, and right now "off" means "nobody pasted a key yet." I'd want an off switch an admin can
lock. And the CSV has to come out with names, not numbers.

## Problems noted (in her words)

1. "There's already a key in there. I didn't put a key in." -- fresh start showed a stored Assistant key.
2. No on/off for the Assistant; off only means "no key". Someone pastes a key and it's back on.
3. "Local only" tooltip says "Change this in Settings > Privacy" -- reads as if local-only can be turned off.
4. Clicking the lock dropped me into a Les Miserables project already full of someone's work.
5. Icon-only selection toolbar; I could not find "show his connections" by name.
6. Clicking "Data" with a node selected went to the sources page and dropped the selection.
7. Edges table does not narrow to the selected character's links.
8. Opening the project menu cleared my selection and reset the table tab.
9. Image export leaves the legend off by default; a preset is named "To share".
10. CSV preview shows ids (0,1) instead of names.
