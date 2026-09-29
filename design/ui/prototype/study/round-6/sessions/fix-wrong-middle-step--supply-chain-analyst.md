# Fix the wrong middle filter step -- Dana Okafor, supply chain risk analyst

Task as given by the moderator: "You narrowed the graph in three steps and the middle one was
wrong. Fix it without losing the third."

Screens seen, in order (study view, design notes hidden): the undo screen
(shots/tasks/fix-wrong-middle-step/01-undo.png), then the filter chip with its steps list open
(shots/tasks/fix-wrong-middle-step/02-filter-chip.png). Also consulted: the step editor state of
the filter chip (shots/screens__filter-chip-edit.png) and the steps list after the middle step is
turned off (screens/filter-step-recovery.html, "Way back: turn the middle step off").

Outcome: success, with some hesitation. Single Ease Question: 5 of 7.

## Think-aloud

**First screen (the undo screen).**

"OK, this isn't my data, it's the Les Miserables thing again. Fine. Seventy-seven 'nodes'.
Top left under the project name there's a little box: '27 of 77 nodes, 3 steps', with a funnel.
That's the filter. That's where I'd go -- it looks like the filter pane in Power BI, sort of.

There's a black box in the middle of the picture: 'Selection cleared (18 nodes) -- Bring it
back'. I didn't select anything. Did I? I'm going to ignore that, it's not what I'm here for. But
it's the loudest thing on the screen and it's about something I didn't ask about.

Would I hit Ctrl+Z? No. The bad step is the middle one. Ctrl+Z takes back the LAST thing I did,
which is the step I want to keep. That's how Excel works and I'm not going to gamble on this
being different. And the table header says 'Selected: none, showing the selection just cleared'
-- I don't know what that means either. I'll open the filter box."

**Second screen (the steps list).**

"Right, a list. Three rows, each with a tick box:

1. Filter to degree >= 2 -- took out 17, 60 left
2. Filter to degree >= 5 -- took out 20, 40 left, 'keeps only nodes with at least 5 neighbors
   among the 60 it reads'
3. Filter out group 8 -- took out 13, 27 left

This I like. It's Power Query's Applied Steps, basically, but with counts on every step. The
'took out / left' numbers are exactly what I'd want to put in a footnote: I started with 77,
here's what each step removed. I can read that.

'Degree' -- I don't use that word. From the table below, 'Degree (full graph)', and the grey
line on step 2 that says 'at least 5 neighbors', I'm guessing it means how many things each one
connects to. For me that'd be how many parts or sites a supplier is tied to. I'm guessing. If it
said 'connections' I wouldn't have to.

Also 'Filter to' and 'Filter out' are in that light grey and the actual rule is in black. On my
laptop at 110 percent that grey is where I'd lean in. It's the half that tells me whether it keeps
or throws away, so it's not the half to make faint.

So: the middle one is wrong. Two ways I can think of. Untick it, or change it. I'll untick first,
because that's what I'd do in the Power BI filter pane -- it's safe, it doesn't delete anything."

**Unticking the middle step.**

"I click the tick box on row 2. The row stays, greyed, with a dash instead of a count. Row 3 is
still there and still ticked, and its numbers changed -- it now says it took out fewer, because it's
reading more characters. The box at the top says '2 of 3 steps' and a bigger number. Good. That's
the thing I was scared of: that fixing the middle would throw away the last one. It didn't. I can
see the third step sitting there with new numbers, so I believe it.

One thing: the third step's count moved and nothing tells me 'this moved because you turned off
step 2'. Here it's obvious because I just did it. In a list of eight steps I'd want that said."

**Changing the middle step instead of turning it off.**

"The moderator said 'fix' it, not 'turn it off'. If the real mistake was the number -- should
have been 3, not 5 -- I want to edit it. I click the row text. It highlights. Nothing else. I
double-click, because that's what I'd do in Excel, and I get an editor: 'Step 2: Filter to
degree >= 5', a Filter to / Filter out switch, three boxes -- degree, >=, 5 -- then 'Scope: After
step 1: 60 characters' and 'Result: took out 20, 40 left'.

The 'Scope: after step 1' line is actually the useful bit. It tells me this step only sees what
step 1 left. That's the thing people get wrong in Power Query and then can't explain why the
count is off.

I change 5 to 3. The Result line changes as I type. OK.

But now I'm nervous: the list is gone. The editor replaced it. Where's my step 3? I have to trust
it's still there. There's a little '< Filter steps' at the top -- I click it, the list comes back,
three rows, step 3 still ticked, counts updated. Fine. But for about ten seconds I didn't know.

I didn't find the row menu on my own. There are three dots that only show when you hover; on a
still picture I'd never know they were there. If double-click hadn't worked I'd have tried
right-click, and I'm told that gives the same menu, with 'Edit rule...', 'Turn off step' and
'Delete step'. I'd never go looking for keyboard shortcuts."

**Checking the result.**

"The right panel says 'Characters 27 of 77, in the filtered graph' -- well, whatever the new
number is -- and the table header says 'Filtered graph: ... characters'. So the statistics follow
the filter and say so. Good, because the first thing my VP asks is 'is that all suppliers or just
the ones you picked?'

On the first screen it said 'nodes' and on this one it says 'characters'. Same app, same
data? Pick one. For me it would be 'suppliers'."

## Single Ease Question

**5 of 7.** I got it done and I never lost the third step, and the counts on each row are the
best part -- that's what I'd screenshot. It's a 5 and not a 6 because: 'degree' is a word I had to
guess at; the grey 'Filter to / Filter out' is hard to read; the editor hides the list, so I lost
sight of step 3 while fixing step 2; the row menu is invisible until you hover; and the first
screen opened with a message about a selection I never made.

## Would I use this instead of my current tool?

"For this part -- narrowing down, step by step, and seeing what each step threw away -- it beats a
Power BI filter pane, which never tells you how many rows each filter took out. It's about as good
as Power Query's Applied Steps, and better in one way: it recounts everything below as I change
a step, instead of me refreshing and hoping.

But no, not instead. Instead of what? My VP looks at Power BI. Nothing on these screens tells me
whether I can get this filtered list out into something Power BI reads, and nobody's told me
whether IT will sign off on it or where my supplier list goes when I load it. Until I know those,
this is a side tool I'd use on a Tuesday afternoon to find something, then rebuild the answer in
Excel for Thursday."

## What she did, in short

- Went straight to the filter chip ("27 of 77 ... 3 steps"); deliberately avoided Ctrl+Z,
  because in her tools undo removes the last action, which here is the step to keep.
- Unticked the middle step first as the safe move; saw step 3 stay and recount; trusted it.
- Found the editor by double-click (Excel habit); did not see the hover-only row menu.
- Edited the value; lost sight of step 3 while the editor replaced the list; came back through
  "< Filter steps" and confirmed it.

## Problems she ran into

1. "Degree" is a graph-theory word she does not use; she guessed its meaning from the table and
   the "neighbors" line. (Moderate: she would not click an unexplained term in a menu.)
2. The editor replaces the steps list, so while fixing step 2 she could not see that step 3 was
   still there. (Moderate: the task's whole worry.)
3. The row menu's three dots appear only on hover; she found editing only through double-click.
   (Minor to moderate.)
4. "Filter to" / "Filter out" are the faint half of each row, but they are the half that says
   whether a step keeps or removes. (Minor; worse on her laptop.)
5. A downstream step's count changed with no word on why. (Minor here; she expects it to matter
   in longer lists.)
6. The first screen leads with "Selection cleared (18 nodes) -- Bring it back", about a selection
   she never made; it pulled her attention away from the task. (Minor.)
7. The same count says "nodes" on one screen and "characters" on the next. (Minor.)
