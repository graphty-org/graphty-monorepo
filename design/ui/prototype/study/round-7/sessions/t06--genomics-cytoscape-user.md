# Session: leave two reminders (genomics Cytoscape user, "Maren")

Task as given by the moderator: "Leave two reminders for next week: one about the tie between Javert and Valjean itself (the two share many chapters), and one about the whole circle of characters around the bishop Myriel. You have never typed your name into this program. The data on screen is a sample: characters of the novel Les Miserables, linked when they appear in the same chapter. If that is not your line of work, treat them as your own people or things."

Start screen: shots/tasks/t06/01.png. All commands were run from design/ui/prototype. Renders are in tmp/round-7-sessions/t06--genomics-cytoscape-user/.

## Think-aloud

**Start screen.** OK, a network, everything orange because it is colored by PageRank. Left rail: Graph, Data, Views, Notes, Assistant. "Reminders" -- nothing says reminder, so Notes is the obvious guess. In Cytoscape I would honestly just put this in a column, or a sticky note on my monitor.

**01** `timeout 120 node app-b/study.mjs --try .../01.png task:t06 --click "Notes"`
A list of notes. Each one has little chips under it -- "Community 3", "Napoleon", "Javert -- Valjean". So notes are tied to things in the network. There is even already a note on "Javert -- Valjean": "They share 17 chapters." Somebody did half my job. There is a plus at the top of the panel.

**02** `--click "Notes" --hover "+"` -> "nothing on screen is called +". Fine, I'll hover by what I guess its name is.
`--click "Notes" --hover "Add note"` -> tooltip "Add note  N". Good, short, it has a shortcut.

**03** `--click "Notes" --click "Add note"`
A box opens, "Write a note", but it is already stuck onto "Co-appearances" -- that is the whole network. Not what I want. I don't see any "attach to" picker, only the x on the chip. So I have to pick the thing first, I guess, like selecting in Cytoscape before running anything.

**04** `--click "Notes" --click "Javert -- Valjean"`
I clicked the edge chip on the old note. The right side now says "Javert -- Valjean, Edge", value 17, ends Javert and Valjean, and a Notes section: "1 note . Add note (N)". That is the edge itself, which is what the task says. Good.

**05** `--click "Notes" --click "Javert -- Valjean" --click "Add note"`
Now the new note box is attached to "Javert -- Valjean". That is right.

**06** `... --click "Add note" --click "Write a note" --type "Next week: check the Javert-Valjean tie, 17 shared chapters." --click "Save"` -> "nothing on screen is called Write a note", "nothing on screen is called Save".
**07** `... --click "Add note" --type "Next week: check the Javert-Valjean tie, 17 shared chapters."` -> box still empty.
**08** `... --click "Add note" --key Control+Enter` -> nothing saved; Save stays gray.
I can't get text into the box in this click-through. I'll count it as: I would type "Next week: check the Javert-Valjean tie, 17 shared chapters" and press Save. It never asked who I am, so I don't know whether my name ends up on it or whether it would stop me at Save to ask. I can't tell from here.

**09** `--click "Notes" --click "Myriel"`
Second reminder: Myriel's circle. I clicked "Myriel" and it picked the first note, "Myriel's household and the people he meets in Digne", tagged "Community 3". The right panel says "Community 3, Group from Louvain, Paints 10 nodes". Louvain -- that's a clustering, like MCODE. Is Community 3 the same as "everyone around Myriel"? Myriel has about nine or ten spokes on the canvas, and it says 10 nodes, so probably. But nothing on the canvas lights up, everything stays orange because PageRank "covers" the color. I can't see which ten.

**10** `--click "Notes" --click "Table"`
I wanted Myriel's own row so I could do "first neighbors" like in Cytoscape. The table is sorted by degree and Myriel isn't in the rows I can see. Gave up on that.

**11** `--click "Notes" --click "Community 3" --click "Data"`
Wanted the member list of Community 3; "Data" took me to the left Data page (sources, filters) instead of the tab on the right. Not what I meant, but harmless.

**12** `--click "Notes" --click "Community 3" --click "Add note"`
New note box attached to "Community 3". That's my second reminder: "Next week: go through Myriel's circle." Same problem, can't type it here.

**13** `--click "Notes" --click "Napoleon"`
Checked what a single character looks like. Small toolbar pops up over the canvas with five unlabeled icons, plus "Napoleon, 1 connection". One of the icons looks like a target -- maybe neighbors -- but they're unlabeled and I don't click unlabeled icons. If I could get Myriel selected like this, I'd rather use his neighbors than a Louvain cluster. Stopping here.

## Outcome

- Do I think I succeeded? Partly. Both note boxes were attached to the right-looking things: the Javert -- Valjean edge, and Community 3 for Myriel's circle. I could not actually type or save either one, and I'm only fairly sure Community 3 is "his circle" -- it is a Louvain cluster, not his neighbors, and I couldn't see the members on the canvas.
- Single Ease Question: 4 of 7. Attaching to the edge was easy once I clicked the chip; the first try silently attached to the whole network, and the "circle" was guesswork.
- Would I use this instead of my current tool? For notes, maybe -- notes stuck to an edge or a cluster is something Cytoscape doesn't really give me, I end up keeping a text file next to the session. But I wouldn't switch for that. The default attaching to the whole network is the kind of quiet thing that would bite me: I'd write my reminder and later find it hanging on the wrong object.

## Problems I hit

1. "Add note" with nothing selected silently attaches the note to the whole network ("Co-appearances"); no visible way to change the target in the box except removing the chip.
2. "The whole circle around Myriel" has no obvious object. I only found Community 3 because an old note mentioned it; it is a Louvain cluster, which may not be the same as his neighbors, and selecting it does not show its members on the canvas (PageRank color covers it).
3. I could not find Myriel's own node to select from the notes or the visible table rows.
4. The floating toolbar on a selected node is five unlabeled icons.
5. Never asked for a name, so I don't know whose name goes on the note.
