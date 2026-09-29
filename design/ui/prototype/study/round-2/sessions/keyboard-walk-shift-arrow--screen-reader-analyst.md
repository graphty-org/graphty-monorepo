# Session: walking the graph with Shift and the arrow keys -- Morgan, screen-reader analyst

**Participant:** Morgan Reyes, blind senior analyst; NVDA in Chrome, keyboard only, screen curtain
on. (Composite persona; see study/personas/screen-reader-analyst.md.)

**Task, as the moderator gave it:** "Using only the keyboard, find Javert, walk to his most
connected neighbour and back, and select two of his neighbours."

**Screens used:** the keyboard walk page (the only one of the three that responds to keys), then
the Find page and the Inspector page, which are galleries of still pictures.

**How this was simulated:** what the screen reader says was taken from the page's accessible names
and from the text the working mock puts in its live region and focus readings. Morgan hears none of
the pictures. The magenta "Screen reader says" strip is a sighted tester's aid and is not counted as
something Morgan heard beyond what the live region speaks.

**Result in one line:** Javert could not be found at all -- the page that walks holds a protein
network, and the page that holds Les Miserables does not work. With the moderator's permission
Morgan did the walk on the protein network's start node instead, and that part worked: most
connected neighbour, back, and two neighbours selected, all by keyboard, all spoken.

---

## Think-aloud

**00:00 -- page title.** "Keyboard walk on the protein network." Protein network. The task said
Javert. Javert is a policeman in Les Miserables, not a protein. Fine, maybe the title is just a
name for the demo. Carry on.

**00:10 -- headings.** H. Nothing. H again, "no next heading". Shift+H, nothing. So there are no
headings on this page at all. That's the first thing I check and it's already a miss. The people I
train read by headings and arrows; they would be stuck right here. I'll go by Tab.

**00:40 -- Tab order.** Tab. "Main, toolbar. Main menu, 1 of 5." Right arrow does nothing, down
arrow: "Graph, pressed, 2 of 5." "Assistant, 3 of 5." Just "Assistant". Is it on, off? It doesn't
say. Tab: "Graphs, list. ppi-core-300..." Tab: "Styles, list." Tab, Tab, then "Tools, toolbar",
then:

> "Graph drawing, application. Protein interactions, 33 of 300 nodes shown. Nothing selected. The
> walk starts at TP53. Shift+Arrow: next neighbor. Space: select. Question mark: keys."

OK. That is better than most. It's an application region, which normally makes me nervous, but it
told me on the way in what the keys are, and it told me the size. Thirty-three of three hundred
shown -- so something is filtered, and it said so. Good. Shift+Tab back: "Tools, toolbar." Tab
again, back on the drawing. It reverses cleanly.

**01:30 -- finding Javert.** Now, find Javert. My reflex is Ctrl+F. On this page Ctrl+F opens
Chrome's own find bar, not anything in the tool. I type "javert", Enter: "no results". Chrome's,
not theirs. Escape.

Question mark: "Keys, dialog." I read it with the arrows. "On the canvas. Arrows, move the view.
Shift+Down, start the walk. Enter, open the inspector. Walking. Shift+Right, next neighbor..."
There's nothing about finding a node by name. Escape: back on the drawing.

I tabbed past something called quick actions earlier? No -- I remember Ctrl+K from other tools.
Ctrl+K: "Quick actions. 12 results. Select neighbors, unavailable, nothing selected, 1 of 12." I
type "javert". "0 results. No commands match."

"No commands match." I didn't ask for a command. I asked for a person. Did it even look at the
nodes? I don't know. It doesn't say "no node called javert", it says no *commands*. The edit box
itself says "Find a command" when I go back to it.

That's two routes and nothing. The title said protein network and the drawing said protein
interactions. I'm fairly sure Javert isn't in here. I'm going to use my one question.

**02:45 -- the one question to the moderator.** "Is Javert even in this graph?" Moderator: "This
page has a protein network. The Find page has the Les Miserables network." I note that as my one
"what's on the screen" question for this task.

**03:10 -- the Find page.** Title: "Find and Quick actions". H: no headings. Tab: a checkbox,
"Annotations". Some links along the top, "1 Just opened", "2 Hits inside the filter", "3 Hits
outside the filter" -- these are pictures of different moments, I gather, not a tool. I press
Down arrow through the page and I hear text: "Name, id or value", "thenard", "Thenardier group 4
dot degree 11". It's all plain text. There is no edit field. I can't type into anything. Further
down there's a table-ish thing with "Javert 4 10 17" in it, read as a run of text, no column
headers announced. I can hear that Javert exists and has three numbers next to him. I can't do
anything with him.

That's a second dead end in a row. By my own rule, I'd stop here and go look for an export. There
isn't one on this page either -- "Export files..." is just text.

**04:00 -- the Inspector page.** I try it because the moderator listed it. Title "Inspector". It
does have headings: "1. One node: TP53, at rest", "2. Grow by one hop...", twelve of them. It's a
catalogue of pictures of a panel, all about proteins again. Nothing about Javert. Nothing to
press. This isn't a place I can do a task.

**04:40 -- moderator nudge.** I tell the moderator I'd give up on finding Javert. Moderator: "If
you're willing, do the rest of the task on the walk page with whichever node it starts on." Fine.
TP53 stands in for Javert. For the record: the "find" part failed.

**05:00 -- starting the walk.** Back on the keyboard walk page, Tab to the drawing. Same reading.
It said Shift+Arrow is next neighbour. Shift+Right:

> "PALB2, neighbor 1 of 32 of TP53, by weight, highest first. Weight 0.98, degree 5, rank 247 of
> 300. Shift+Enter goes back, Esc ends the walk, Tab leaves the canvas, ? lists the keys."

That's long. At my rate it's two, maybe three seconds. But the node name is first, and I'm told how
to get out, once. I'll accept it once. If it says the exits every time I'll be annoyed.

PALB2 has degree 5. That's not the most connected neighbour. It's in weight order -- whatever
weight is here. It doesn't say what weight means. Confidence? Strength? A number with no
definition. I'll let it go for now; I want degree.

**05:40 -- getting to the most connected neighbour.** How do I order by degree? Question mark
again. "Keys, dialog." Down, down... "O. Order: weight, degree, name." There it is. It's not in the
announcement I got on entering the walk, only in the sheet. Escape. "PALB2, 1 of 32." Good, it
kept my place. That's the thing I care about.

O:

> "Neighbors by degree, highest first. UBC, neighbor 1 of 32 of TP53, weight 0.80, degree 21, rank
> 7 of 300."

UBC, 21. Is that the most connected of the 32? It says "by degree, highest first", and it's number
1. I believe it, but I check: Shift+Right. "RPS8, 2 of 32, weight 0.42, degree 17, rank 11 of 300."
17, lower. Shift+Left: "UBC, 1 of 32..." Yes. UBC is his most connected neighbour, and I'm on it.
Shift+Left again: "First neighbor." A wall, told to me. Good.

One question. Degree 21 -- is that in the whole graph of 300 or in the 33 shown? Rank 7 "of 300"
says whole graph. But I'm in a filtered view and it doesn't say which graph the 21 is counted in.
For TP53 it happens to agree -- 32 neighbours, degree 32 -- so I can't tell. I'd want that said.

Does "walk to" mean I'm there? My focus is on UBC. I could go into UBC's own neighbours with
Shift+Down, but the task said walk to him and back, so I'll call being on him "at" him.

**06:30 -- and back.** The entry said Shift+Enter goes back. Shift+Enter is an odd back key. I try
what my hands expect first, Shift+Up:

> "Start, TP53."

That also works. Good -- I didn't have to trust a key I've never used. Back at the start. That's
my second question on any new tool, "can I get back", and the answer is yes, in one key.

**07:00 -- selecting two neighbours.** Shift+Down, into TP53's neighbours again: "UBC, neighbor 1
of 32 of TP53, by degree, highest first. Weight 0.80, degree 21, rank 7 of 300." It remembered the
order and where I was. It didn't repeat the exits. Good.

Space: "UBC added. 1 selected on canvas. ] and [ step through the selection." Fine -- told once,
when it matters.

Shift+Right: "RPS8, 2 of 32, weight 0.42, degree 17, rank 11 of 300." Space: "RPS8 added. 2
selected on canvas."

Two selected. Let me check that without trusting the announcement. Shift+Left: "UBC, 1 of 32,
weight 0.80, degree 21, rank 7 of 300, selected." It says "selected" on the node. Good.

**07:45 -- leaving, and checking where it went.** Esc: "Walk ended at UBC. 2 selected on canvas."
One Esc ended the walk, it didn't throw away my selection. I was worried a second Esc would clear
it, and the sheet says it would, so I don't press it.

Tab: "Nodes table, filtered graph, 33 rows, sorted by degree. UBC, Unassigned, degree 21, rank 7
of 300, selected. Row 2 of 33. 1 of 2 selected." Down arrow: "RPS8, Ribosome, degree 17, rank 11
of 300, selected. Row 3 of 33." So the selection is in the table as well, in text, where I can go
back to it. That's what I want: the fact lives somewhere, not only in something said once.

The table's a list I arrow through, though. I try Ctrl+Alt+Right to hear the column header -- I get
nothing useful, it reads the row again. It's a row that reads as a sentence, which is fine for
this, but I couldn't sort it myself or read one column down.

**08:20 -- Enter on a node, for the inspector.** Out of curiosity, back to the drawing (Shift+Tab),
Shift+Down, Enter: "Inspector, UBC, selected. Module Unassigned, degree 21, rank 7 of 300." Escape
brings me back to UBC in the walk. It didn't lose my place. I'll give it that.

---

## Single Ease Question

**Score: 3 out of 7.**

"The walking part was a 6. Honestly, it's the first graph drawing that has ever told me anything
useful on the first key press. But the task started with 'find Javert', and I couldn't. The page
that walks didn't have him, the page that had him didn't work, and when I typed his name the tool
told me no *commands* matched. So I only did half of your task, and only because you told me to
pretend a protein was a policeman. That's a 3."

## Would I use this instead of what I use now?

"Not yet. NetworkX with `G.neighbors('Javert')` and a sort by degree answers this in one line, and
I don't have to find him first -- I just type his name. What this has that my scripts don't is
walking: hearing one neighbour at a time, stepping in and stepping back, and knowing where I came
from. I'd actually use that to explore a referral network I don't know yet. But three things would
have to be true. First, I have to be able to find a node by typing its name, from the drawing, and
be told plainly if it isn't there. Second, it has to tell me which graph a degree is counted in
when I've got a filter on, and what 'weight' is. Third, the page needs headings, so the people I
train don't get lost before they ever reach the drawing. Fix those and I'd try it on real data --
after someone tells me where my file goes."

---

## Problems observed

1. **Javert could not be found (severity 4).** Ctrl+F on the walk page is the browser's, not the
   tool's; the key sheet lists no way to find a node by name; Quick actions answered "0 results. No
   commands match." to a person's name, which does not tell Morgan whether nodes were searched at
   all. The edit box is labelled "Find a command". (A mock limit also contributes: the walk page
   holds only the protein network, and the Find page, which holds Les Miserables, is a gallery of
   still pictures with no edit field.)
2. **No headings on the walk page or the Find page (severity 3).** H finds nothing on either;
   someone reading by headings, the most common way in, has no entry point.
3. **The key to change neighbour order is only in the key sheet (severity 2).** The walk starts in
   weight order and the task "most connected" needs degree order; O is not mentioned on entry, so
   Morgan had to open the sheet to find it. It worked once found.
4. **Which graph a degree is counted in is not said during the walk (severity 2).** With 33 of 300
   nodes shown, "degree 21, rank 7 of 300" leaves open whether 21 is filtered or full. "Weight" is
   never defined.
5. **The walk's first announcement is long (severity 1).** Two to three seconds at Morgan's rate;
   acceptable because it comes once and the node name is first.
6. **Nodes table rows read as sentences; the table-reading keys give no column headers (severity
   2).** Fine for confirming the selection, not for reading one column or sorting.
7. **"Assistant" in the rail is read with no state (severity 1).** Whether it is on or off is only
   in a tooltip.

## What worked

- Entering the drawing names the graph, the count shown, the selection and the keys in one reading.
- Shift+Up goes back as well as Shift+Enter; "Start, TP53." is short and certain.
- The walk remembers order and position across the key sheet, the inspector visit and a
  step back in; exits are said once, not every time.
- Edges of the list are spoken ("First neighbor.").
- Space selecting is confirmed with a count, the node reads "selected" when revisited, and the same
  selection is in the Nodes table in text.
- Esc ends the walk without clearing the selection.
