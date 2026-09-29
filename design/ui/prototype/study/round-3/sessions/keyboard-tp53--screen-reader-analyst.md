# Session: find TP53 and who it connects to, keyboard only -- Morgan Reyes (screen-reader analyst)

**Participant.** Morgan Reyes, the blind health-services analyst in `study/personas/screen-reader-analyst.md`:
NVDA at a fast rate, keyboard only, NetworkX at work. This is a simulated participant; the thresholds
the persona marks as assumptions (30 seconds before calling a control dead, two dead ends before
giving up) apply here too.

**Task, as the moderator gave it.** "Without a mouse, find TP53 and look at who it connects to."

**Pages used.** The keyboard walk mock (`screens/keyboard-walk.html`, the protein network, 33 of
300 nodes shown), pressed key by key; what the screen reader would say was read from the magenta
"Screen reader says" strip. The Find mock (`screens/find.html`) was opened second. The Find mock
shows a different graph (Les Miserables) and has no live keys, so it could not be used to find
TP53. Where a line below says "mock limit", the mock does not build that part, and that is not
counted as a design failure.

**Outcome.** Success, with difficulty. TP53 was found without searching, because it happens to be
where the walk starts. The 32 neighbors were heard one at a time and then read as a table after
selecting them. The table never gave the weight of each TP53 link. Single Ease Question: 5 of 7.

---

## Transcript

**Moderator:** Without a mouse, find TP53 and look at who it connects to.

**Morgan:** Fine. Page title first. "Keyboard walk on the protein network." All right, so it's a
protein network, I'll take their word. Headings, H... "Protein interactions", "Graphs", "Sets and
paths", "Styles", "Views 1", "Graph". Six. That's the left panel and the right one. No heading for
the drawing and none for the table. So if the table's down there I can't jump to it with H. Noted.
I don't want to jump by landmark; half the people I train don't know that key exists.

Tab order then. Tab. "Main, toolbar. Main menu, 1 of 5." Tab. "Graphs, list. ppi-core-300, 300
nodes, selected." Good, a count. Tab. "Styles, list. Size by degree, style layer, 1 of 3." Tab.
"Export files, button." Tab. "Inspector. More actions, menu button, 1 of 5." Tab. "Help and
resources, menu button." Tab. "Tools, toolbar. Select, pressed, 1 of 5." Seven stops and I still
haven't heard the graph. Tab.

"Graph drawing, application. Protein interactions, 33 of 300 nodes shown. Nothing selected. The
walk starts at TP53. Shift plus Arrow: next neighbor. Space: select. Question mark: keys."

Huh. Well, that's my protein. It just told me. I didn't find TP53, it was handed to me. That's
fine today, but next time it'll be some clinic that isn't the biggest one and I want to know how I
get there. Also: "33 of 300 nodes shown". Shown by what? Somebody filtered this. Which 33?

It's an application region, which normally means my reading keys are off. But it told me the keys
and it'll tell me more on question mark, so I'll allow it. Shift+Tab to check it reverses... "Tools,
toolbar." Yes. Tab back in. Same long speech again. It's long. At my rate it's two seconds, and I'm
going to hear it every time I come back here.

Question mark. "Keys, dialog." Reading it down: headings, "On the canvas", "Walking", "Selection",
"Leaving". Shift+Down starts the walk, Shift+Right next neighbor, Shift+Enter back, Shift+Home back
to the start, O changes the order, Space selects, Esc ends the walk, Tab goes to the Nodes table.
"graphty-element's default keys. Read only." Short, grouped, in words. That's better than most.
Esc. Back on the drawing.

Plain Right Arrow first, to see what it does. "View moved. Shift plus Arrow walks the graph." OK,
it moved a picture I can't see and it told me the right key. Good recovery.

Shift+Down. "PALB2, neighbor 1 of 32 of TP53, by weight, highest first. Weight 0.98, degree 5, rank
247 of 300. Shift+Enter goes back, Esc ends the walk, Tab leaves the canvas, question mark lists the
keys."

So TP53 has 32 neighbors and it's reading them strongest first. Name first, that's right. But
"weight 0.98" -- weight of what? The link? Is that a score, a count of papers, what? And "rank 247
of 300" -- ranked by what? Degree, I assume, but I'm assuming. I don't sign my name to assumptions.

Shift+Right. "RPA1, 2 of 32, weight 0.95, degree 7, rank 172 of 300." Shorter on the second one.
Good, it dropped the key list. Shift+Right. "RAD51, 3 of 32..." Shift+Right. "RPA2, 4 of 32..."
Shift+Left. "RAD51, 3 of 32." It goes back. Consistent.

Let me go one hop out and see if I get lost. Shift+Down on RAD51. "TP53, neighbor 1 of 2 of RAD51
in filtered graph, by weight, highest first. Weight 0.87, degree 32, rank 2 of 300, where you came
from." Oh, that's nice. "Where you came from." That's the thing nobody does. And "in filtered graph",
so RAD51 has more links somewhere I can't see. It said degree 5 for RAD51 earlier and now it has 2
here. So "degree" is the whole graph and the neighbor count is the filtered graph. Two numbers from
two different graphs in one sentence and only one of them says which. I worked that out; my junior
colleague won't.

Shift+Right. "53BP1, 2 of 2." Shift+Enter. "Back to RAD51, neighbor 3 of 32 of TP53." Shift+Home.
"Start, TP53. Nothing selected on canvas." There's my way home. Two keys and I know where I am. Good.

Now order. O. "Neighbors by degree, highest first." Shift+Right... "RAD51, neighbor 31 of 32 of TP53,
by degree, highest first."

Wait. 31 of 32? I just asked for highest degree first and it put me on number 31. It went back to
the node I was on before, RAD51, in its new position. I expected the top of the list. Didn't it just
say "highest first"? I'll press O twice more to get back to weight. "Neighbors by name, A to Z.
53BP1, neighbor 1 of 32." "Neighbors by weight, highest first. PALB2, neighbor 1 of 32." So when
I'm already in the list it goes to number 1, and when I'm at the start it remembers where I was.
Two rules for one key. That's the kind of thing that costs me.

OK, I've heard four of 32. I'm not pressing Shift+Right 28 more times and holding it all in my
head. I want the list. Shift+Home. Space. "TP53 added. 1 selected on canvas. Right bracket and left
bracket step through the selection." Esc. "Walk ended at TP53. 1 selected on canvas."

Now I need "select the neighbors". Nothing I've heard says how. The key sheet doesn't list it. The
toolbar had something called "Quick actions" as tool 4 of 5, but it didn't say a key. I'll guess
Ctrl+K because every tool with a command palette uses it... "Quick actions. 11 results. Select
neighbors, 1 of 11." Lucky guess. Type "neigh". "1 result. Select neighbors, 1 of 1." Enter. "32
neighbors added. 33 selected on canvas." Once, clearly. Good.

Tab to the table. "Nodes table, filtered graph, 33 rows, sorted by degree. TP53, DNA repair, degree
32, rank 2 of 300, selected. Row 1 of 33. 1 of 33 selected." Down. "UBC, Unassigned, degree 21, rank
7 of 300, selected. Row 2 of 33." Down. "RPS8, Ribosome, degree 17, rank 11 of 300, selected." End.
"HSPA8, Unassigned, degree 4, rank 271 of 300, selected. Row 33 of 33."

So the table is the whole filtered graph, which happens to be TP53 plus its 32 neighbors. Every
row says "selected" because I selected all of them. That word on every row tells me nothing now.
And the column I actually wanted, the weight of each link to TP53, isn't here. The walk told me
PALB2 is 0.98; the table doesn't. So the answer to "who does it connect to, and how strongly" is
spread over two places, and one of them I can only hear one row at a time.

Let me try the other way in, the way I'd do it with a clinic that isn't the start. Back on the
drawing, Ctrl+K, type TP53. "1 result. TP53, node, exact name, 1 of 1." Enter. "TP53 selected. 1
selected on canvas." Shift+Down. "PALB2, neighbor 1 of 32 of TP53..." That's the route. Name it,
Enter, walk. I'd write that one in my keystroke file. But I only found it because I guessed Ctrl+K.

Ctrl+F on the drawing does nothing in this page (mock limit). The other page, the Find one,
says Find opens with Ctrl+F or a search icon on the Graphs heading. That's my browser's find key.
If you take it over I want to know you did. And that Find page is a different graph, Les Miserables,
so I can't look for TP53 in it. From what the moderator read me, the Find list says "2 results in all
77 nodes". Is that spoken when I type, or do I have to go and find it? I can't tell from this page.
That's my one question to the moderator for this task.

**Moderator:** The Find page doesn't build that. It's a picture.

**Morgan:** Then I can't judge it. Done.

---

## After the task

**Single Ease Question (1 very hard, 7 very easy): 5.**

**Morgan:** A 5. I got it, and some of it was genuinely good. It told me TP53, it told me 32, it told me
"where you came from", and Shift+Home got me home. The drawing actually talked on the first key. I
did not expect that. But I found TP53 because it was sitting at the door, and I found "select
neighbors" because I guessed a key nobody told me. Take away those two bits of luck and it's a 3.

**Would you use this instead of your current tool?**

**Morgan:** Not instead. NetworkX gives me `G[ "TP53" ]` with the weights in one line, printed, and I
can re-run it next quarter. This gives me the neighbors, but the weights only one at a time in the
walk, and I don't know what "weight" or "rank" mean. If the table had a column for the link weight
to the selected node, and the numbers said what they are, I'd use it for the manager's "who is this
connected to" question, because I could hand my sighted colleague the same view and we'd be talking
about the same thing. That's the part NetworkX can't do for me.

---

## Problems, in Morgan's words, most severe first

1. **No way to read the neighbors with their link weights as a list.** The walk gives each weight
   one at a time; the Nodes table has no weight-to-TP53 column, and every row after "Select
   neighbors" just says "selected". Severity 3.
   "The walk told me PALB2 is 0.98. The table doesn't. So I'm writing weights down by hand."
2. **"Select neighbors" and "find by name" are only reachable by guessing Ctrl+K.** The key sheet
   lists neither, and the Quick actions tool in the toolbar does not say its key. Severity 3.
   "I found it because I guessed. Nobody told me Ctrl+K."
3. **Numbers without a definition.** "Weight 0.98" never says it is the confidence of the link;
   "rank 247 of 300" never says ranked by what; "degree" is the whole graph while "neighbor 1 of 2"
   is the filtered graph, and only the second says so. Severity 3.
   "Two numbers from two different graphs in one sentence, and only one of them tells me which."
4. **Changing the order at the start lands on neighbor 31, not the first.** After Shift+Home, O,
   then Shift+Right, the walk went back to RAD51 at 31 of 32 in the new order; while inside the list
   the same key goes to neighbor 1. Severity 2.
   "Didn't it just say highest first? Two rules for one key."
5. **No heading for the drawing or the table.** H reaches the side panels only; the table can only
   be reached by Tab or landmark. Severity 2.
   "If the table's down there I can't jump to it with H."
6. **The drawing's entry speech is long and repeats on every return.** About 30 words each time
   focus comes back. Severity 1.
   "Two seconds at my rate, every time I come back."
7. **TP53 was found by luck, not by searching.** It was the walk's start because it has the highest
   degree. "33 of 300 nodes shown" does not say what the filter is. Severity 2.
   "I didn't find TP53. It was handed to me."
8. **Ctrl+F opening Find in the page takes over the browser's find key**, and the Find mock cannot
   say whether its result count is announced (mock limit). Severity 1.

## What worked

- The drawing spoke on the first key press, gave its keys, and "View moved. Shift+Arrow walks the
  graph." corrected a wrong key without scolding.
- Every walk step puts the name first and the position ("3 of 32") second.
- "Where you came from" on the node one hop back, and Shift+Home "Start, TP53": the way back was
  always two keys away.
- "32 neighbors added. 33 selected on canvas." said once, and the table said "1 of 33 selected" on
  arrival.
- Quick actions matched the exact name "TP53" and Enter selected it.
