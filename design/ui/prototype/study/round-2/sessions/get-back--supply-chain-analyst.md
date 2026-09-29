# Session: getting back after a wrong step -- supply chain analyst

Participant: Dana Okafor (composite persona: supply chain risk analyst, Excel and Power BI user,
not a network scientist). Screens: "Undo and ways back" (participant view, version A: undo is
silent while the filter chip is in view) and the filter chip's steps list. The graph is the Les
Miserables co-appearance network, 77 characters, narrowed by three filter steps, with a
hand-built selection of 19 characters just lost to a stray click on empty canvas.

Task, as read aloud: "After your last few actions the numbers changed in a way you did not
expect. Get back to where you were, without losing work you meant to keep."

Renders used: shots/sess-gb-sca-s3.png (start), -s2.png (one undo), -s1.png (two undos),
-s3-pop.png and -s2-pop.png (steps list open), -s2-menu-hist.png (Edit menu), -fix.png (end).

## Transcript

**Start screen.** "OK. This isn't supplier data, it's... Les Miserables? Fine, pretend these
are suppliers. Numbers changed. Which numbers? Right side says edges 106, components 1, density
0.280. I don't know what I'm supposed to expect for any of those. The table I can read: Valjean
18, and next to it 36 in grey under 'full graph'. So something is cutting this down."

"Top left, in small grey type: 'Filtered: 28 of 77 nodes, 3 steps'. So I've got 28 of 77
left. That's a lot gone. First thing I'd do anywhere is Ctrl+Z."

**Ctrl+Z, once.** "Nothing popped up. Did it do anything? ... The picture changed, there's a
new light blue bunch at the bottom -- Marius, Gavroche. And the top left now says 41 of 77,
2 steps. OK so it undid something. What did it undo? It doesn't tell me. In Excel I'd at least
see the cell go back. Here I have to spot that a little grey number moved from 28 to 41."

"Numbers went up, which is what I wanted, I think? But I don't know if that was the step that
was wrong. 'Last few actions' -- the moderator said few. Again."

**Ctrl+Z, twice.** "76 of 77, 1 step. OK now nearly everything is back, the picture's a
hairball again with black dots on the edges. That's too far, I'm pretty sure I didn't mean to
throw away every filter. And the thing is I can't see what the other two steps WERE any more.
They're just... gone."

(She clicks the chip, now reading "Filtered: 76 of 77 nodes, 1 step". The list shows one row,
"Filter to Largest component, 76".)

"One step. Where are the other two? I undid them, so they're not in the list. That's how
undo works I guess, but I wanted to see what I had. I'm not typing them back in, I don't
remember them."

"Excel: Ctrl+Y." **Ctrl+Y.** "41, 2 steps. Oh good, that works. **Ctrl+Y** again -- 28, 3
steps. OK, I'm back where I started. I've wasted two minutes getting back to the problem. At
least redo is the key I already know."

**Opens the filter chip at the start state.** "Now the list. 'Filter steps'. Three rows, each
with a tick box and a number. Filter to Largest component, 76. Filter to degree >= 5, 41.
Filter out group 8, 28. This is basically the Power BI filter pane. Good, I understand tick
boxes."

"Which one is wrong? I don't use 'degree'. 'Group 8' -- no idea what group 8 is, it's a
colour on the legend. What I can read are the counts: 76, then 41, then 28. The degree one
takes me from 76 to 41 -- that's the one that ate half my list. The group 8 one only drops
13, and if I'd meant to filter out a group I'd have done it on purpose. I'll untick the
middle one. If that's wrong I'll tick it back."

**Unticks "Filter to degree >= 5".** "63 of 77, 2 of 3 steps. The row goes grey and shows two
dashes instead of a number, and it stays in the list. I like that it stays -- I can put it back.
That's the first thing on this screen that behaved like I expected."

"Right side now says components 4. It was 1. I don't know what a component is. Is that bad? Did
I just break something else? Nobody tells me. The table is what I trust: Valjean 32 now."

**Notices the table line.** "Hang on -- over the table: 'Selected: none, showing the previous
selection'. I had a selection? The moderator said don't lose work. Then there's 'Previous
selection' next to it. It looks like a label, not a button, it's the same grey text. I only
tried it because it was next to the word 'none'."

**Clicks "Previous selection".** "Now the rows are highlighted blue, 'Selected: 19 of 63 nodes',
and the right panel says 19 nodes. OK, so I lost a selection somewhere and didn't know until I
read the small print over the table. If I'd been looking at the picture I'd never have known."

"I think I'm back. 63 of 77, two steps on, my 19 picked. I'd want to write down what I did
because I'm not sure I could explain it to anyone."

**Did not open:** the Edit menu or Undo history. "I don't go into menus to undo things. Ctrl+Z
is Ctrl+Z." (Asked afterwards; shown shots/sess-gb-sca-s2-menu-hist.png.) "Oh, that tells me
'Undo Filter to degree >= 5' before I press it. That's useful, but it's three clicks deep
behind the hamburger. Put that line on screen when I press Ctrl+Z."

## After the task

**Single Ease Question: 4 of 7.** "I got there, but by guessing. The undo told me nothing and
took out the wrong thing first; the tick boxes and the numbers per step are what saved me."

**Instead of your current tool?** "For this, no. In Excel if a filter's wrong I look at the
filter arrows and untick. This tick-box list is actually the same idea and it's fine -- that
part I'd use. But I had to find it by clicking a grey pill I didn't think was a button, the undo
key goes silent and undoes the step I wanted, and I lost a selection without being told. And
before any of it: can IT approve this, and can I get the 19 rows out to Power BI? If those are
yes, it's a side tool for the network picture. It doesn't replace the spreadsheet."

## Observations for the studio

- First reach: Ctrl+Z, twice, from Excel habit. The first press removed the step worth keeping
  (Filter out group 8); she noticed only through the chip count and the canvas and could not
  tell which step it was.
- Undone steps disappear from the steps list, so after two undos she could not see what she had
  had. She recovered only because Ctrl+Y (Windows redo) worked.
- The steps list, found by clicking the chip, is what got her to the answer. She chose the wrong
  step from the per-step counts, not from the rule text ("degree", "group 8" meant nothing).
- The lost selection went unnoticed until she read the scope line over the table; its
  "Previous selection" action reads as plain text.
- "components 4" after the fix worried her with no explanation.
- End state reached: 63 of 77 nodes, 2 of 3 steps, 19 selected -- the intended end state.
