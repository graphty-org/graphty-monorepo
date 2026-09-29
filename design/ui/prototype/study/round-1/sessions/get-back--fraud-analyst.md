# Session: getting back after a wrong step -- fraud analyst (Sarah)

Participant: Sarah, complex-case fraud investigator at a mid-size bank (simulated; persona in
study/personas/fraud-analyst.md).
Mode: first impression, not mandated.
Task as given: "After your last few actions the numbers changed in a way you did not expect. Get
back to where you were, without losing work you meant to keep."
Planted problem: of her three filter steps, the MIDDLE one is the mistake. She wants to keep the
first and the third.
Screens, in the order she met them: Undo and ways back (starting state: three steps applied,
hand-built selection just lost), then Filter chip and its steps.
Material: renders taken from the mock pages in their participant view, and the page code read
only to see what a click or a key would do.

## Transcript (think-aloud)

### 1. The starting screen

She looks at the table first, then the top left.

> "Still the novel. Fine, pretend Valjean's my mule account. Top left: 'Filtered: 28 of 77
> nodes, 3 steps.' The table says 'Selected: none, showing the previous selection.' So I had
> something picked and now I don't. Two things went wrong, not one."

> "Twenty-eight of seventy-seven. I don't remember it being that low. The degree column says
> 18 for Valjean with 36 greyed next to it -- OK, the grey is the whole graph. At least it tells
> me both, I'd have assumed the 18 was a mistake otherwise."

### 2. Ctrl+Z, because that's what you do

> "Ctrl+Z."

The chip changes to "Filtered: 41 of 77 nodes, 2 steps". The picture grows a blue cluster.
Nothing else says what happened -- no message, no banner.

> "OK, it undid something. What? It went from three steps to two. Which two? I'm not supposed to
> guess which of my steps it threw away. In Excel at least I can see the cell change."

She does not open the chip. She assumes Undo took off "the bad one" and presses again, because
the numbers still don't look like what she remembers.

> "Ctrl+Z again."

Chip: "Filtered: 76 of 77 nodes, 1 step". The picture is back to nearly everything.

> "No, that's too far. That's basically the raw file. Now I've lost something I wanted."

### 3. Looking for what she lost

She clicks the chip (she guesses it's the filter because it has a funnel on it). A small list
opens, "Filter steps": one row, "Filter to Largest component, 76".

> "One step. Where did 'Filter out group 8' go? That one was right. I wanted the middle one
> gone, not the last one. Undo doesn't know that, obviously, it just peels off the top."

She opens the main menu (three lines, top left), then Edit. It reads "Undo Filter to Largest
component, Ctrl+Z" and "Redo Filter to degree >= 5, Ctrl+Shift+Z". "Undo history" has one entry.

> "Good -- at least the menu tells me what the next one will do. Should have looked here before
> I pressed anything. Redo twice, then."

Ctrl+Shift+Z twice. Chip back to "28 of 77 nodes, 3 steps". She checks the filter list: three
rows with counts 76, 41, 28.

> "Right. Seventy-six, forty-one, twenty-eight. That's a funnel -- that's the thing I'd build in
> a pivot. And there it is: the degree step is the one that took me from 76 to 41. That's my
> bad step."

> "So Undo can't do it. Undo can take away the last thing, or the last two things. It can't
> take away the middle thing. I'd have got here faster ignoring Ctrl+Z entirely."

### 4. The lost selection

The table line still says "Selected: none, showing the previous selection" with two plain
buttons, "Previous selection" and "Show filtered graph".

> "Previous selection. That's literally what I want."

Click. The table reads "Selected: 19 of 28 nodes", the rows highlight, the right side shows
"19 nodes".

> "Good. Nineteen, that's the number I had. And the rows never left the table while it was gone,
> so I could have copied them out anyway. That's fine. That's actually fine."

### 5. Turning off the middle step

On the undo screen she tries to untick "Filter to degree >= 5" in the Filter steps list. The
checkbox does not respond on this screen. The moderator moves her to the filter chip screen,
same graph, same three steps.

> "Why does the box look tickable if it isn't? ... OK, other screen."

She opens the chip and unticks the middle row.

The chip reads "63 of 77 nodes, 2 of 3 steps". The degree row goes grey with no count, the
"Filter out group 8" row now says 63. A tooltip "Turn on step" sits over the start of the
next row's label.

> "There. Middle one off, the other two still on, and it says 2 of 3 so I know one's parked
> not deleted. That's what I wanted in the first place. The tooltip is sitting on top of the
> row I'm trying to read, but whatever, I move the mouse."

She hovers the row and opens its "..." menu: Edit rule, Turn off step, Move up, Move down,
Create rule set from step, Delete step.

> "Turn off versus delete, both there. Good -- I'd turn it off, not delete it. If my reviewer
> asks why the degree cut isn't in the SAR picture, I want to show I tried it and dropped it."

She tries Ctrl+Z (the tick comes back on: 28 of 77, 3 steps), then Ctrl+Shift+Z to put it back
off. Nothing happens.

> "Undo worked, redo didn't. And on Windows I press Ctrl+Y for redo, I don't know anyone who
> uses Shift+Z. So now I untick it again by hand. Fine."

End state: selection of 19 restored (undo screen), middle step turned off with the other two
kept (filter chip screen). Task complete, by a long way round.

## After the task

Single Ease Question: 4 of 7.

> "I got there. But I got there by breaking it worse first. Ctrl+Z is the first thing anyone
> presses, and here it quietly peeled off the step I wanted to keep and didn't tell me which
> one it took. If that list with the tick boxes had been open, or if Undo had said 'undone:
> Filter out group 8', I'd have stopped after one press."

Would she use it instead of her current tool?

> "Instead of Excel, no -- Excel isn't where I do this, Excel's where I total things. Instead of
> i2 for the link chart on a big case, maybe. The step list with a count on every line is
> better than anything i2 gives me; I can see what each cut did and switch one off without
> rebuilding the chart. I can't tell from this whether turning a step off gets recorded
> anywhere my reviewer can see. If it's not in an audit trail, I'm writing it in my notes by
> hand, same as always. And none of that matters until IT says I can put customer data in it."

## Problems observed

1. Undo gave no feedback naming what it reversed (left panel open, steps list closed), so she
   pressed it twice and lost the step she wanted to keep. Frustration 3.
2. Undo is linear: there is no way to reverse only a middle step with Undo; the Undo history
   submenu lists only backward steps and would have removed the newer, wanted step too. The
   real fix (untick the middle step in the Filter steps list) is not suggested anywhere near
   Undo. Frustration 3.
3. She did not think to open the filter chip before pressing Ctrl+Z; the per-step counts that
   would have shown her the bad step are hidden behind it. Frustration 2.
4. Redo is only Ctrl+Shift+Z; on the filter chip screen it did nothing after an Undo. Windows
   users expect Ctrl+Y. Frustration 2.
5. The "Turn on step" tooltip covers the start of the next row's label right after she unticks
   a step. Frustration 1.
6. On the undo screen the Filter steps checkboxes look tickable but do not respond (the two
   mocks disagree). Frustration 2.
7. No sign that turning a step off, or undoing, is recorded for a reviewer. Frustration 2.

## What worked

- The table kept the lost 19 rows and put "Previous selection" right where she was reading.
- Edit menu items name what Undo and Redo will do ("Undo Filter to Largest component").
- Per-step counts (76, 41, 28) read as a funnel and pointed straight at the bad step.
- "2 of 3 steps" on the chip and Turn off versus Delete in the row menu: a step can be parked.
- "degree, filtered" beside "full graph" explained why the numbers moved.
