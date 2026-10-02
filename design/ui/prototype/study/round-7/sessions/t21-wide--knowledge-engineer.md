# Session: label hosts by name (wide IT estate) -- knowledge engineer

Participant: Dr. Min-ji Kim, knowledge graph engineer (persona file study/personas/knowledge-engineer.md).
Task as given: "Have each host in the drawing show what people call it, not its inventory number.
The data on screen is a sample: a company's IT estate, hosts and the network connections between
them, with dozens of things recorded about each. If that is not your line of work, treat it as your
own wide spreadsheet."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t21-wide--knowledge-engineer/.

## Start screen (shots/tasks/t21-wide/01.png)

"300 nodes, 1,105 edges, directed, 69 columns of which 8 are shown. Fine. What I want is the
rdfs:label equivalent -- in a CMDB that is the hostname, and the inventory number is the IRI. I do
not see any text on the dots at all right now, so I am not sure what 'not its inventory number'
refers to. The right panel is about the graph as a whole. There is a Style tab. Labels are a style
thing in most tools, so I will look there."

## Step 1 -- Style tab on the graph

    timeout 120 node app-b/study.mjs --try .../01.png task:t21-wide --click "Style"

"Canvas background, print-safe colors, 'Hide overlapping labels', layout method and seed. So labels
exist somewhere, but this is the canvas, not the hosts. Nothing here says which property becomes
the label."

## Step 2 -- the 'Everything' row on the left

    timeout 120 node app-b/study.mjs --try .../02.png task:t21-wide --click "Everything"

"'Everything -- built-in row. Paints 300 nodes, 1,105 edges. Default look, under every other row.'
So that is the base style for all instances. Fill, Shape, then Effects, Label, Tooltip each with a
plus. Label is what I want. Side remark: color says 6366F1, which is an indigo, and the dots on
the canvas are gray. I would ask about that if this were my data."

## Step 3 -- clicking the word 'Label'

    timeout 120 node app-b/study.mjs --try .../03.png task:t21-wide --click "Everything" --click "Label"

"Nothing. The heading is not the control. It must be the plus."

## Step 4 -- guessing the plus button's name

    timeout 120 node app-b/study.mjs --try .../04.png task:t21-wide --click "Everything" --click "Add label"
      -> nothing on screen is called "Add label"
    timeout 120 node app-b/study.mjs --try .../05.png task:t21-wide --click "Everything" --click "+"
      -> opened the Analyze palette (Louvain, PageRank, ...). Not what I wanted.
    timeout 120 node app-b/study.mjs --try .../06.png task:t21-wide --click "Everything" --click "Add"
      (also tried "Show label" and "Add a label": nothing on screen is called either)
      -> 06 shows the Effects menu: Outline, Glow, Wireframe, Flat shading.

"The plus icons have no visible text, and the first one I hit was Effects. I am wasting time
guessing names. Let me rest the pointer on it and read the tooltip."

    timeout 120 node app-b/study.mjs --try .../07.png task:t21-wide --click "Everything" --hover "Add"
      -> tooltip "Add to Effects"

"'Add to Effects'. So the Label one is 'Add to Label'. Clumsy phrasing, but predictable."

## Step 5 -- Add to Label

    timeout 120 node app-b/study.mjs --try .../08.png task:t21-wide --click "Everything" --click "Add to Label"

"Two choices: 'Label line' and 'Show labels'. I do not know what a 'label line' is -- a leader line
from the label to the node? A line of text? 'Show labels' sounds like the switch, so I take that
first."

## Step 6 -- Show labels

    timeout 120 node app-b/study.mjs --try .../09.png ... --click "Show labels"
    timeout 120 node app-b/study.mjs --try .../10.png ... --click "Show labels" --click "Show labels"

"A 'Show labels' row with an unticked box, and a database-cylinder icon next to it. I tick it.
The box is ticked and the drawing does not change at all -- still no text on any host. And it does
not ask me WHICH attribute to show. A label switch with no source is not a label. Back up and try
the other item."

## Step 7 -- Label line

    timeout 120 node app-b/study.mjs --try .../11.png task:t21-wide --click "Everything" --click "Add to Label" --click "Label line"

"Ah. So 'Label line' means 'a line of label text'. A row 'Above: Pick a field' and a list:
'Typed text', then the hosts table, 'In use (2): id -- Key, hostname -- Name', then all the other
attributes with type icons and fill rates (backup_last_success_at 84 percent, cmdb_last_audited_at
62 percent). That is actually good: it tells me id is the key and hostname is already declared the
name, and it shows how complete each column is. That is the import honesty I usually have to
check by SPARQL. The name 'Label line' cost me a detour, though."

## Step 8 -- pick hostname

    timeout 120 node app-b/study.mjs --try .../12.png task:t21-wide --click "Everything" --click "Add to Label" --click "Label line" --click "hostname"

"Label: Above -- hostname. That is the setting I wanted. But the drawing still has no text on it.
I cannot see a single hostname on the canvas. Maybe it hides them at 300 nodes, maybe 'Hide
overlapping labels' or zoom matters -- nothing tells me. Is the label on and invisible, or not on?"

## Step 9 -- do I also need 'Show labels'?

    timeout 120 node app-b/study.mjs --try .../13.png ... --click "hostname" --click "Add to Label" --click "Show labels" --click "Show labels"
      -> nothing on screen is called "Show labels"
    timeout 120 node app-b/study.mjs --try .../13.png ... --click "hostname" --click "Add to Label"

"Now the plus does not offer 'Show labels' any more; it just adds a second label line and opens
the field list again. So the two menu items were not two steps of one job, they were two separate
things, and I cannot tell how they relate. I stop here: the setting says hostname, which is what
was asked."

## After the task

- Succeeded? Probably. The panel says each host's label is the hostname, and the field list
  confirms hostname is the name and id the key. But I never saw a hostname drawn on the canvas, so
  I am taking the panel's word for it, which I normally would not.
- Single Ease Question: 4 of 7.
- Would I use this instead of my current tool? For a CMDB-shaped table, maybe -- the attribute list
  with key and name marked and fill percentages is better than what Gephi gives me. But two things
  would stop me trusting it: the change did not show up in the drawing, and there are two different
  'label' items ('Show labels' and 'Label line') whose relationship I could not work out. In
  SPARQL plus a spreadsheet I always know what the label is.

## Problems noted

1. Plus buttons are icon-only; the first one I hit was Effects. Tooltip "Add to Label" is findable
   only by hovering.
2. "Label line" does not read as "choose what text to show"; I took "Show labels" first and got a
   checkbox with no field.
3. After choosing hostname (and separately after ticking Show labels) the canvas showed no text on
   any node; no message explained why.
4. "Show labels" and "Label line" coexist as separate items, and Show labels disappears from the
   menu once a label line exists; I could not tell which one actually controls the drawing.
5. The task speaks of an inventory number being shown, but the start screen shows no labels at all,
   so there was nothing to compare against.
6. Fill color reads 6366F1 (indigo) while every dot on the canvas is gray.
