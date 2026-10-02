# Session: getting a network into a new, empty project -- Tom, the recipe recipient

Task as given: "You have just started a new, empty project. Get your network of characters into
it. The data on screen is a sample: characters of the novel Les Miserables, linked when they appear
in the same chapter. If that is not your line of work, treat them as your own people or things."

Participant: Tom, lab manager, never builds networks; gives a new tool about two minutes and two
attempts. He treats the characters as "the postdoc's gene network file".

Renders are in `tmp/round-7-sessions/t29--recipe-recipient/` under the prototype folder. Every
command was run from `design/ui/prototype` with
`D=$PWD/tmp/round-7-sessions/t29--recipe-recipient`.

## Start screen (shots/tasks/t29/01.png)

"OK. Title says Les Miserables at the top, so that's my project. Big empty gray area, a card in the
middle: 'No nodes to draw. This graph is empty.' and one blue button, 'Add data...'. Fine, that's
the obvious one. 'Local only' up top -- I'd like to believe that means nothing leaves my laptop, but
it doesn't say so. I have her file on my desktop. I'll press the blue button and expect it to ask me
which file."

## Step 1 -- the big blue button

```
timeout 120 node app-b/study.mjs --try $D/01.png task:t29 --click "Add data..."
```

"Wait. It didn't ask me for a file. The title at the top changed to 'Door entries, March 2026'.
Whose is that? There's a table of person_id, building_id, times -- 4,212 rows, 'Not in people',
'Not in buildings', yellow warnings everywhere, 'Add as people / Leave out', 'Directed /
Undirected', 'From -> person'. I didn't pick any of this. Is this someone else's data? Did I just
open somebody's badge-swipe log? That's exactly the kind of thing that gets me a call from
compliance.

I'm not pressing Load on someone else's file. The only thing I trust here is Cancel."

## Step 2 -- back out

```
timeout 120 node app-b/study.mjs --try $D/02.png task:t29 --click "Add data..." --click "Cancel"
```

"Good, 'Load cancelled: nothing was loaded'. That's the first sentence today that told me plainly
what happened. I'm back on the empty screen. So the blue button is not 'pick my file'. Maybe I
clicked the wrong thing. Second try: there's a 'Data' button on the left side. My file is data."

## Step 3 -- the Data button on the left

```
timeout 120 node app-b/study.mjs --try $D/03.png task:t29 --click "Data"
```

"Huh. Now there's a picture. Orange dots, names -- Valjean, Javert, Cosette, Marius. On the left:
'miserables.gexf, 77 nodes, 254 edges'. On the right: Nodes 77, Edges 254. So... it's in? I didn't
pick a file. I clicked a tab. Either it was always in there and the 'This graph is empty' screen was
lying to me, or clicking 'Data' loaded something by itself. I can't tell which. 77 and 254 -- I'd
have to ask her whether that's the number in her file; I can't count dots.

Also there's PageRank, Louvain, betweenness, 'Density 0.0868', a log-log chart. I don't know what
any of that is and I'm not learning it at 4 pm. Did those come with her file or did the app make
them up?"

## Step 4 -- looking for File, the way I'd normally open something

"I don't trust that. In every program I own, you open a file with File, Open. The three lines in the
corner is probably the menu."

```
timeout 120 node app-b/study.mjs --try $D/04.png task:t29 --hover "Menu"
timeout 120 node app-b/study.mjs --try $D/05.png task:t29 --click "Main menu"
```

"'Main menu'. Clicked it: New project, Open..., Open recent. That's what I wanted. But the screen
behind it has the orange network again, and the left list has 'For the report', 'Group 2', 'Group
8', 'Betweenness' with a crossed-out eye. A second ago it said empty. Every click I make, the
picture behind is different. I'll press Open..."

## Step 5 -- left-side "Add data" link, just to be sure

```
timeout 120 node app-b/study.mjs --try $D/06.png task:t29 --click "Add data"
```

"The little blue 'Add data to start' link on the left does the same as the big button: the door
entries table again. Same file I didn't choose. So both 'Add data' places go to somebody's door
log."

## Step 6 -- File, Open

```
timeout 120 node app-b/study.mjs --try $D/07.png task:t29 --click "Main menu" --click "Open..."
```

"'Choose a file': transfers-2026-04.csv, mule-ring-triage.graphty, risk-review-look.json. None of
those is mine. No miserables file, nothing that looks like what she sent, and no way I can see to
go to my desktop or drag it in. Mule ring? Transfers? These sound like a bank's files. I'm getting
uneasy about whose machine this is.

That's three wrong turns. I'd stop here. I'll email her and ask her to just send me a PNG, or to
load it for me and send me the link."

## Outcome

Did I succeed? "I don't know. When I clicked 'Data' the characters were there, 77 and 254. But I
never chose a file, I never saw it ask me for one, and the two 'Add data' buttons opened someone
else's door log. If the PI asked me 'did you load it?' I couldn't say yes with a straight face. I'd
call that a no."

Single Ease Question (1 = very difficult, 7 = very easy): **2**. "The only easy bit was Cancel
telling me nothing was loaded."

Would I use this instead of what I use now? "No. What I use now is: she sends me a picture and an
Excel file. With this, I pressed the button that said Add data and got a stranger's badge log, and
the Open list was full of files that aren't mine. I want it to ask me which file, show me hers, and
tell me it's in. The 'Local only' thing would matter to me if it said in plain words that my data
stays on my laptop -- right now it's two words I'd have to take on faith."

## What Tom noticed, in his words

- "I pressed 'Add data' and it opened a file I never picked, called Door entries, March 2026."
- "The project name at the top changed to that file's name. Did I lose Les Miserables?"
- "Clicking 'Data' showed my characters, but I don't know if I loaded them or they were always
  there. The first screen said empty."
- "Open... showed three files, none of them mine, and no way to go find mine."
- "The import table has words I'd never touch: Directed, Undirected, From -> person, leading
  zeros, Edge id column."
- "'Load cancelled: nothing was loaded' -- that one I understood."
- "'Local only' -- I hope that means it stays here. It doesn't say."
