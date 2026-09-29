# Keyboard walk, Shift+Arrow -- Analyst Alex

**Task as given:** "Without a mouse, find Javert, move through the characters he is connected to,
and select two of them."

**Participant:** Alex, operations data analyst. Normally a mouse user; uses Ctrl+F and Tab like
anyone, but has never walked a graph by keyboard. Mild red-green colour weakness.

**Pages used:** the keyboard walk screen (driven by keys only, in a fresh browser tab), its key
sheet, the inspector on the right, and the keyboard-only storyboard for reference.

**Outcome:** the task as worded could not be done -- there is no Javert on this page. Alex did the
same moves on the hub the page offered instead (TP53) and got two neighbours selected with no
mouse. Single Ease Question: **3 of 7**.

---

## Think-aloud

**1. Landing.** "OK, Protein interactions. Proteins. I was told Javert, which is Les Mis, which is
the sample every tutorial uses. This is not Les Mis. Maybe it's in here somewhere, maybe there's
another graph in the list." Looks at the left panel: Graphs has one entry, ppi-core-300, 300
nodes. "One graph. So no."

"There's a pink strip up top that says 'Tab to the drawing (or click it), then press Shift+Down'.
Fine, that's an instruction, I'll take it."

**2. Getting to the drawing with Tab.** Presses Tab. Focus goes to "Gallery", then to the row of
step names across the top, then the Annotations box. "Those are the mock's own tabs, I'll ignore
them." Keeps going. A "Skip to the graph drawing" link shows up. "Oh, that's nice, but I'm already
pressing Tab, I'll just keep going." He does not press Enter on it -- he did not trust that it was
not another demo link. Tab goes through the menu, Graph, Data, Results, Notes, Assistant, the
"33 of 300" filter chip, the Graphs search and plus, the ppi-core-300 row, the Sets plus, the
toolbar, and then the drawing. "Seventeen Tabs. In real life I'd have grabbed the mouse around
tab eight. The skip link would have saved me, I just didn't believe it."

Once on the drawing, the frame goes blue. "OK, the picture has the focus. Good, I can see that."

**3. Finding Javert.** "Ctrl+F. That's what I'd do in anything." Ctrl+F opens a box over the
drawing with a search field. Types "Javert". It says **No nodes match "Javert"** and under it
"Enter goes to the node and selects nothing. Esc closes Find."

"Right. No Javert. That's what I thought." Then, a second thought: "Hang on -- up top it says
33 of 300. There's a filter on. Is Javert one of the 267 I can't see? Does this search look at the
hidden ones or just the 33?" Tries "jav". Same: no nodes match. "It doesn't tell me. In Gephi if
something's filtered out, search at least says 'it's there but filtered'. Here 'No nodes match'
could mean 'not in your data' or 'not in your filter', and those are really different answers.
If this was my supplier file and a supplier I know exists came back 'no match', I'd assume the
import dropped it, and I'd go check the SQL for twenty minutes." Presses Esc; the box closes and
focus goes back to the drawing. "Esc did what I expected, at least."

Alex does not find Javert. He considers stopping here.

**4. Deciding what to do instead.** "I'm told to find a character and walk his connections. There
is no character. The obvious stand-in is the big one in the middle -- TP53, the table says degree
32, the most connected. I'll do the moves on that, but I want it on record that I couldn't do the
thing I was asked."

**5. The key sheet.** "What do the keys actually do?" Presses ?. A "Keys" box opens. Reads it:
Arrows move the view; Shift+Down "walk into this node's neighbours"; Shift+Right next neighbour;
Shift+Left previous; Shift+Enter back; Enter "add this node to the selection"; Space "add or
remove"; Esc "end the walk; again, clear the selection"; Ctrl+Z undo.

"Plain arrows move the camera and Shift+arrows walk. I'd have got that wrong -- I'd have pressed
Down and expected to go to a node. At least it's written down." On Esc: "Esc twice wipes my
selection. That's the kind of thing I'd do by accident, pressing Esc to close something. Good
that Ctrl+Z brings it back, if I remember that." Presses Esc; the sheet closes, focus is back on
the drawing.

"Also: how do I get to TP53? I didn't pick anything." The pink strip earlier said "The walk starts
at TP53". "So it just starts at the biggest one. Handy here. But if I wanted Javert and Javert
isn't the biggest, I'd need Find to put me on him first -- the Find box does say 'Enter goes to
the node', so I think that's how, I just couldn't test it."

**6. Walking.** Shift+Down. A small panel appears above the toolbar: "Walking the drawing, PALB2,
1 of 32 from TP53", with confidence, degree, rank, module. A double ring shows on PALB2 in the
picture. "OK, that's clear. I'm on PALB2, it's number 1 of 32 of TP53's neighbours, sorted by
confidence." Shift+Right: RPA1, 2 of 32. "Next one. Fine. Like tabbing through a list, but the
ring jumps around the picture so I have to hunt for it with my eyes. The panel tells me the name,
so I read the panel instead."

"'Neighbors by Confidence / Degree / Name', with an O next to it. So O changes the order. I'd
probably want Name if I were looking for someone specific among 32."

**7. Selecting two.** Enter on RPA1: "RPA1 selected. 1 selected on canvas." The right panel
switches to "1 selected". Shift+Right to RAD51, Enter: "RAD51 selected. 2 selected on canvas."
The right panel now says **2 selected**, Selection 2, RPA1 7, RAD51 5, module DNA repair,
degree Mixed.

"That worked, and it worked first time. The right side updating is the thing that tells me it's
real -- I'd trust that more than the rings on the picture, which are hard to tell apart: the one
I'm on has a double ring, the selected one has a single ring. In a hurry I would not see the
difference." And: "The 7 and 5 next to the names -- I assume that's degree? It doesn't say.
The degree row above says Mixed, so probably."

**8. Wrap-up.** "So: moving and selecting by keyboard is actually fine once you're on the
drawing. Getting there was a long Tab slog unless you trust the skip link, and finding the one
node I was told to find was impossible -- it's not in this data. And when search came back empty
it didn't tell me whether that's because of the filter."

---

## Single Ease Question

**3 of 7.** "The walking and selecting part on its own would be a 5 -- once I read the key sheet
it did what it said. But the task was find Javert, and I couldn't. Nothing on the page told me
why: wrong dataset, or filtered out. I had to decide on my own to swap in another node. Plus the
Tab slog to get there."

## Would he use this instead of his current tool?

"For this? I don't do graphs by keyboard, so this isn't why I'd switch. What I care about is that
it didn't fight me: Ctrl+F, Esc, Enter all did the normal thing, and the right-hand panel showed
me what I'd selected with numbers. That's better than Gephi, where I honestly don't know if there
is a keyboard way. But the empty search result is the part that would stay with me. In my own work
the worst thing a search can do is say 'nothing' when the answer is 'it's there, you filtered it'.
Fix that and I'd call this better than what I have. Right now it's a maybe."

---

## What went wrong, for the designers (in Alex's words where possible)

1. **Javert is not on the page.** The task names a Les Miserables character; the only graph is a
   protein network. "I couldn't do the thing I was asked." (Severity: blocks the task.)
2. **"No nodes match" does not say whether the filter hid the node.** The page shows 33 of 300
   nodes; Find reports "No nodes match" with no mention of the 267 filtered out. "'Not in your
   data' and 'not in your filter' are really different answers." (High: in real use this sends him
   back to re-check his import.)
3. **Seventeen Tabs to reach the drawing.** The skip link was there but read as another demo link;
   he tabbed past it. (Medium.)
4. **The walk starts at the biggest node without saying so on screen.** Only the screen-reader
   strip mentions "The walk starts at TP53". A sighted keyboard user has to infer it. "If Javert
   isn't the biggest, how do I start on him?" (Medium.)
5. **Walk ring versus selected ring are hard to tell apart** (double ring versus single ring,
   same colour). He relied on the inspector count instead. (Low to medium.)
6. **Numbers in the inspector's Selection list are unlabelled** (RPA1 7, RAD51 5). He guessed
   degree. (Low.)
7. **Esc twice clears the selection.** He expects to press Esc casually; undo exists but he may
   not remember it. (Low.)

## What worked

- Ctrl+F, Esc and Enter behaved the way they do in every other program.
- The walk panel ("PALB2, 1 of 32 from TP53", with confidence, degree and module) gave a clear
  sense of place without looking at the picture.
- The right-hand panel switching to "2 selected" with both names was the confirmation he trusted.
- The ? key sheet was short enough to read and answered "arrows or Shift+arrows?" before he got
  it wrong.
