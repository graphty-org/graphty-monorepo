# Session: Explorer Elena, "Which characters link Fantine to Gavroche through as few others as possible?"

Participant: Explorer Elena (first-time graph user, product manager). Task: find the characters
that link Fantine to Gavroche through as few others as possible, and show it in the drawing.
Start screen: shots/tasks/t12/01.png. Renders: tmp/round-7-sessions/t12--explorer-elena/NN.png.
All commands were run from design/ui/prototype with the prefix
`timeout 120 node app-b/study.mjs --try <dir>/NN.png task:t12`; only the steps are listed below.

Outcome: gave up. No path from Fantine to Gavroche was ever drawn.

## Think-aloud

**Start (01.png from the task).** "OK, lots of orange dots. I can see Fantine up top and Gavroche
down at the bottom, so I just need what's in between. Valjean is the big dark one in the middle --
he's probably the main guy, everything goes through him. I bet the answer is Valjean." (Wrong
reading: dot size and darkness are taken as importance and as "the answer", without checking.)

**01 -- `--click "Fantine"`.** "I'll click Fantine." -> *nothing on screen is called "Fantine"*.
"Huh. The dot doesn't do anything? Maybe I missed it."

**02 -- `--click "Find rows and notes"`.** "There's a search box. I'll type Fantine in there."
The box gets a blue outline. Nothing else. "...OK, it's a search for rows and notes. I don't
know if a character is a row."

**03 -- `--click "Shortest paths"`.** "Wait, 'Shortest paths' is right there in the list. That's
literally what I want." Clicked it. The right side now says **Louvain**, "Eight distinct" colors,
"Paints 77 nodes". "I clicked shortest paths and it's showing me... Louvain? What's Louvain? Did
I click the wrong row?" (It highlighted the right row on the left, but the panel on the right
talks about something else.)

**04 -- `--click "Shortest paths" --click "Valjean to Javert"`.** "There's one called Valjean to
Javert. Let me look at that one." Right side: Path, From Valjean, To Javert, 2 nodes, 1 edge,
17 shared chapters. "OK, this is the kind of thing I want, just with my two names. But the
drawing didn't change at all -- everything is still orange. Where is the path?"

**05 -- `... --click "All options..."`.** "Maybe I can change the names here." A box: Weight "Not
used: fewest edges", Scope "Full graph, 77 nodes", Data version. "Fewest edges -- that sounds
like 'as few others as possible', good. But I can't change anything, it's just info."

**06 -- `... --click "from Shortest paths"`.** "Maybe this link takes me to where shortest paths
are made." It went to **Louvain** again: communities, modularity 0.565, a bar chart. "Again! I
keep asking for shortest paths and getting this Louvain thing. I probably don't understand what
it is." (First blaming herself.)

**07 -- `... --click "..."`.** Tried the three dots on the path. Same info box as before.
"Nothing new."

**08 -- `--click "Analyze"`.** "The PageRank panel said 'from Analyze', so maybe there's an
Analyze." A box opened with a search and a list. Under Recent: **Shortest path -- "The fewest
steps, or the lightest route, between two nodes."** "There! 'Fewest steps.' That's it."

**09 -- `--click "Analyze" --click "Shortest path"`.** A "Path between" box: From "Type a name",
To "Click to pick", Weight "value (loaded weight)", Stronger / Farther / Capacity, a sentence
about "1/value", Scope Whole graph, and a grey "Find path" button. A banner on top: "Click a node
or set for From". "OK, From is Fantine, To is Gavroche. I'm not touching Weight, I don't know
what 1/value means. ...Wait, the other path said 'fewest edges' and this one says 'value
(loaded weight)'. Is that going to give me fewest people? I'll leave it, I don't want to break
anything." (She does not notice that the default here is not "fewest steps".)

**10 -- `... --click "Type a name"`.** Clicked into From. Nothing visible changed.

**11 -- `... --click "Fantine"`.** "It says click a node, so I'll click Fantine's dot." ->
*nothing on screen is called "Fantine"*. "The dot still doesn't click."

**12 -- `... --click "Click to pick"`.** Clicked To. The two hints swapped places (From now says
"Click to pick", To says "Type a name"), banner now "...for To". "So it moved which one I'm
filling. Fine. But I still can't get a name in."

**13 -- `... --type "Fantine"`.** Typed Fantine without clicking the box first. Nothing.

**14 -- `... --click "Type a name" --type "Fantine" --key Enter`.** Clicked From, typed Fantine,
pressed Enter. A tooltip "Click a node on the canvas, or type a name" and a black toast:
**No match for ""**. "No match for... nothing? I typed Fantine. Did it not take my typing? I
probably clicked the wrong spot." (Note for the reader: the click-through tool may not support
typing, so this failure may be the harness rather than the design. What she saw, though, was an
empty-quote error after typing a name.)

**15 -- `... --click "Shortest path" --click "Table"`.** "Maybe I can pick from a list instead."
-> *nothing on screen is called "Table"* (the Path box covers the bottom).

**16 -- `... --click "Shortest path" --click "Gavroche"`.** Tried Gavroche's dot. -> *nothing on
screen is called "Gavroche"*.

**17 -- `--click "Table"`.** Opened the table from the start screen. "There's a list of names:
Valjean, Gavroche, Marius, Javert, Thenardier. Gavroche is second. Fantine isn't on screen, I'd
have to scroll."

**18 -- `--click "Table" --click "Analyze" --click "Shortest path" --click "Click to pick"
--click "Gavroche"`.** Opened the table, then the path box. The table closed when Analyze opened.
-> *nothing on screen is called "Gavroche"*. "It closed my list. OK."

**19 -- `--click "Assistant"`.** "Maybe I can just ask it." -> "Off. Nothing is sent. Turn on in
Settings." "Not going into settings."

**20 -- `... --click "Click a node or set for From"`.** Tried the banner itself. -> *nothing on
screen is called that*. "...yeah. OK."

Engagement dropped here. She stopped trying new things.

## After the session

**Did she succeed?** No. "I found the right thing -- 'Path between', fewest steps -- but I could
never get Fantine and Gavroche into it. If I had to guess the answer I'd say Valjean, because
he's in the middle of everything." (That answer is a guess from the picture, not something the
app told her.)

**Single Ease Question (1-7):** 2. "Finding the path thing took a while but was OK once I hit
Analyze. Getting names into it was impossible."

**Would she use this instead of her current tool?** "Not for this. In our dashboard I click a bar
and it filters. Here I clicked the dots and nothing happened, twice, and when I clicked 'Shortest
paths' it kept showing me some Louvain thing. The saved path from Valjean to Javert was exactly the
kind of answer I wanted, though, if I could make my own."

## What stood out (observer notes, plain language)

- Clicking the "Shortest paths" heading in the left list, and the "from Shortest paths" link on a
  saved path, both opened the communities result (Louvain) on the right. She read that as her own
  mistake the first time and as the tool's the second.
- Selecting the saved path "Valjean to Javert" did not change the drawing; she could not see
  where the path was.
- The way in was "Analyze" (the beaker button), which she reached only by guessing the word from a
  "from Analyze" link. The left list's "Shortest paths" heading gave no way to make a new one.
- In "Path between", the default Weight is "value (loaded weight)", while the saved paths say
  "fewest edges". The task asks for fewest people in between; she would have run it with the wrong
  setting without knowing.
- Picking a name failed every way she tried: clicking a dot, clicking a name label, typing, and the
  table (which closes when Analyze opens). Typing ended in "No match for """ -- possibly a limit
  of the click-through tool, but the message itself gives her nothing to act on.
- Misreading: she took the biggest, darkest dot (Valjean) to be the answer. The legend says size
  is degree and color is PageRank; she did not read it.
