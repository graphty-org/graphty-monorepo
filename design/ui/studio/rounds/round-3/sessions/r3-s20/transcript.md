# Session r3-s20 -- Morgan Reyes (screen-reader analyst), task T12 prompt A (Les Miserables)

Session started in screen-reader mode with an empty app. Morgan works by keyboard only and judges
everything by what the screen reader can reach; the screenshots are kept for graders, not used.

## Step 0 -- start

Command: `node tool/real.mjs --start rounds/round-3/sessions/r3-s20 empty --sr`

Heard: `focus: nothing (the page itself)`. No page title or live text announced by the tool.

Morgan: "Nothing has focus. Fine, that is normal for a fresh page. First I read the page to learn
what is here, then I start tabbing."

## Step 1 -- read the page

Command: `--step --read`

Heard: button "Main menu", heading 1 "graphty", button "Local only", heading 2 "Start", buttons
"Open project or file... Ctrl+O" and "New from data...", "Files are read on this computer and never
uploaded", heading 2 "Recent projects", heading 2 "Samples" with four buttons including "Open the
Les Miserables sample", then a long usage-data consent paragraph with "Share usage data" and
"No thanks".

Morgan: "Real headings, named buttons. And it answers my first question before I ask it: files stay
on this computer. Good. The consent paragraph is long, but it says nothing is collected until I
answer. I will say no thanks, then open the Les Miserables sample. Tabbing to find them."

## Step 2 -- learn the tab order

Command: `--step --key Tab --key Tab --key Tab`

Heard: button "Main menu", button "Local only", button "Open project or file... Ctrl+O".

Morgan: "Tab order follows reading order. Keep going to the samples."

## Step 3 -- reach the samples

Command: `--step --key Tab x4`

Heard: "New from data...", "Open the Les Miserables sample", "Open the Zachary's karate club
sample", "Open the College football sample".

Morgan: "I went one past. Shift+Tab back twice to Les Miserables and press Enter. The consent
question can wait; it says nothing is collected until I answer."

## Step 4 -- open Les Miserables

Command: `--step --key Shift+Tab --key Shift+Tab --key Enter --wait 3000`

Heard: "Les Miserables: 77 nodes, 254 edges" (polite status). Focus: nothing (the page itself).

Morgan: "That is the summary I want: name, node count, edge count, said once. But focus went
nowhere -- the button I pressed is gone and I am on the page itself. That is the kind of thing that
loses people. Read the page to find out what replaced the start screen."

## Step 5 -- read the workspace

Command: `--step --read`

Heard: toolbar-like buttons (Main menu, "Project: Les Miserables", Undo, Redo disabled, Local only,
Graph, Data), "Graph Les Miserables", combobox "Find", tree items "Selection" and "Everything",
"Analyze in the toolbar ( Shift+A ) to add results here", buttons Analyze, Layout, View, Quick
actions, "From Les Miserables", "Graph actions", tabs Style and Values (selected), "Collapse
Overview" expanded, then "Nodes 77 Edges 254 Direction Undirected, from the file: directed 0
Density 0.08681 Components 1 Edges per node 1 to 36, mean 6.597".

Morgan: "No headings in this read at all, which is a step back from the start page -- I would press
H and get nothing. But the overview is the thing I always ask for: counts, direction and where it
came from, density, components, degree range. That is better than most tools. There is a Find box;
that is my way to Javert. Tab to it and type."

## Step 6 -- tab to Find

Command: `--step --key Tab x9`

Heard: Main menu, "Project: Les Miserables", Undo, Redo disabled, Local only, Graph, combobox
"Find", treeitem "Selection", separator "Resize left panel" value 240.

Morgan: "Odd: 'Graph' was in the tab order but 'Data' was not -- probably a tab pair where only the
current one is a stop. I passed Find. Shift+Tab twice and type the name."

## Step 7 -- type Javert in Find

Command: `--step --key Shift+Tab --key Shift+Tab --type "Javert"`

Heard: combobox "Find" value "Javert" expanded. No count of matches was said and no option is
highlighted.

Morgan: "It expanded, so there is a list, but it did not tell me how many matches. Arrow down into
the list."

## Step 8 -- arrow into the list

Command: `--step --key ArrowDown`

Heard: highlighted option "Javert" selected.

Morgan: "One option, Javert. Enter to go to him."

## Step 9 -- choose Javert

Command: `--step --key Enter --wait 1500`

Heard: focus: group "Summary values". Nothing else -- no "Javert selected" announcement.

Morgan: "Focus jumped to something called 'Summary values'. It did not say Javert. I will read
around it to find out whose summary this is."

## Step 10 -- read the Inspector

Command: `--step --read`

Heard: complementary "Inspector": "Javert Node", button "Node actions", tabs Style / Values
(selected), "Collapse Summary" expanded, "id Javert name Javert", button "Degree 17".

Morgan: "So it is Javert, and the program knows his id, his name, and a degree of 17. That is all
it knows about him -- the sample has no other attributes. Degree 17 is a button, which suggests it
leads somewhere: probably the neighbours. Tab to it and press Enter."

## Step 11 -- tab to Degree

Command: `--step --key Tab`

Heard: button "Degree 17". No description of what it does.

Morgan: "The name does not say what pressing it does. I will press it anyway; it is not a delete."

## Step 12 -- press Degree 17

Command: `--step --key Enter --wait 1000`

Heard: focus: region "Javert's 17 connections".

Morgan: "Now that is a name that says what it is: Javert's 17 connections. Read it."

## Step 13 -- read the connections

Command: `--step --read`

Heard: region "Javert's 17 connections", then 17 buttons in alphabetical order: Babet, Bamatabois,
Claquesous, Cosette, Enjolras, Fantine, Fauchelevent, Gavroche, Gueulemer, MmeThenardier,
Montparnasse, Simplice, Thenardier, Toussaint, Valjean, Woman1, Woman2.

Morgan: "Seventeen, and the count in the heading matches the count of names I heard. Alphabetical,
which is what I would sort by anyway. That is the answer. I am done."

Command: `node tool/real.mjs --end rounds/round-3/sessions/r3-s20`

## Answer

Javert shares chapters with 17 characters: Babet, Bamatabois, Claquesous, Cosette, Enjolras,
Fantine, Fauchelevent, Gavroche, Gueulemer, MmeThenardier, Montparnasse, Simplice, Thenardier,
Toussaint, Valjean, Woman1 and Woman2. What the program knows about him: id Javert, name Javert,
degree 17. Nothing else is stored for him in this sample.

## Debrief, in character

- **Finished?** Yes, in about a dozen keystroke groups and no help from anyone.
- **Ease:** 6 of 7.
- **What worked:** The start page has real headings and says files never leave the computer. The
  load announcement gave the name and both counts once. The overview after loading gave me nodes,
  edges, direction, components and degree range in text without running anything. Find took a
  name and gave one option. The connections list is a named region whose name carries the count,
  and the names are real buttons.
- **What confused or annoyed me:**
  - After opening the sample, focus fell to "nothing (the page itself)". The button I pressed was
    gone and nothing took its place. I had to read the page to learn where I was.
  - The workspace has no headings. On the start page H worked; here it would give me nothing.
  - Typing "Javert" in Find expanded the list but did not say how many matches there were. I had
    to arrow down to find out.
  - Choosing Javert moved focus to a group called "Summary values" without saying "Javert". I only
    knew whose summary it was after reading around it.
  - The "Degree 17" button does not say that it opens the list of connections. I pressed it on a
    guess. A newer user would not.
  - "Data" was not in the tab order next to "Graph". Probably a tab pair, but it was read as a
    button, so I could not tell.
  - The task says "shares chapters". Nothing I heard said what an edge means in this sample, or
    whether it carries a count of chapters. I am assuming one edge is one or more shared chapters.
  - I did not find out how to get back from the connections list to Javert's summary. I did not
    need to here, but next time I will.
- **Would I use this instead of my scripts?** For a manager's "who is connected to this one?" --
  possibly, it was quicker than writing the script. For anything I report, not until I know what
  the numbers mean and can export them.
