# Session: show every character's name (recipe recipient, "Tom")

Task as given by the moderator: "You have never used this program before. You will practice on
the ready-made network of characters from the novel Les Miserables that comes with the program,
not on your own data. Right now only a few characters have their names written on the drawing.
Get every character's name written next to its dot."

Start screen: shots/tasks/r8-t10/01.png. All commands were run from
design/ui/prototype; renders are in tmp/round-8-sessions/r8-t10--recipe-recipient/.

Outcome: gave up after three attempts. No names were added.

## Step by step

### 1. Start screen (01.png)

"Start, recent projects, samples. Good -- 'Files are read on this computer and never uploaded'.
That's the first thing I'd want to know. There's a box at the bottom asking to collect how I use
it. No thanks. Les Miserables is right there at the top of Samples, 77 characters. Click that."

### 2. The network opens (02.png)

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t10 --click "No thanks" --click "Les Miserables"

"Okay, orange dots, gray lines. A few names: Fantine, Myriel, Valjean, Javert, Cosette, Marius,
a handful at the bottom. Most dots are blank, which is what she said. The list on the left is
long -- PageRank, Louvain, shortest paths, density, link prediction. I don't know what most of
those are and I'm not reading all of them. On the right there's a column of headings: Fill,
Shape, Effects, Label, Tooltip. 'Label' -- that's the word I want."

### 3. Click "Label" on the right (03.png)

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Label"

"I clicked Label. Nothing changed. Same names, same dots. Did it do anything? Maybe I clicked
the wrong thing."

### 4. Click "Labels show..." in the left list (04.png)

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Labels show"

"There's a row on the left, 'Labels show... 1 node'. One node? There are a dozen names on there
already, so I don't know what the one is. Clicked it. A black message: 'Labels shown anyway (this
file): Valjean. Opens in the inspector (not available yet)'. Not available yet. So it's about
Valjean only, and whatever it opens isn't there. That's two."

### 5. Try the little plus next to "Label" (05.png, 06.png)

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t10 --click "No thanks" --click "Les Miserables" --click "Add label"
    -> nothing on screen is called "Add label"
    timeout 120 node app-b/study.mjs --try .../06.png task:r8-t10 --click "No thanks" --click "Les Miserables" --hover "Label"
    -> tooltip: null

"Maybe the word wasn't the button and the plus is. I rested on it -- nothing tells me what it is.
And that Label heading is under 'PageRank' at the top of the right panel. I don't know what
PageRank is. If I add a label there, am I changing her colors? I'm not going to guess."

### Stopping

"Three tries, nothing changed on the drawing. I'd ask her to just send me a PNG with the names
on it."

## After the task

- Did I succeed? No. Every dot that had no name still has no name.
- Single Ease Question (1 = very difficult, 7 = very easy): 2. Getting to the network was easy;
  the actual job, nowhere.
- Would I use this instead of what I use now? Not for this. What I use now is the postdoc
  sending a PNG and an Excel file. Opening without installing anything and the "never uploaded"
  line are better than what I've had with other programs. But the one thing I tried to do --
  put names on the dots -- I couldn't find, and the two places that said "label" either did
  nothing or said "not available yet".

## What I noticed (in his words)

- "I clicked Label and nothing moved. No message, nothing."
- "'Labels show... 1 node' -- but there are a dozen names already. Which one is it counting?"
- "'Not available yet.' Then why is it there?"
- "The Label heading is under PageRank. Is labelling a PageRank thing? I don't want to touch her
  colors."
- "The left list is too long. I didn't read past the first few rows."
- Good: "It opened in the browser, no install, and it told me files stay on this computer."
