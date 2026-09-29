# Get back to where you were, the Ctrl+Z-restores version -- Morgan, screen-reader analyst

**Participant:** Morgan, senior analyst on a public-health research team, blind, works with NVDA
in Chrome and a 40-cell braille display, keyboard only, screen curtain on. Uses Python and
NetworkX for network work and knows networks from numbers, never from pictures.

**Task as given by the moderator:** "After your last few actions the numbers changed in a way you
did not expect. Get back to where you were."

**Version tested:** the version where Ctrl+Z restores a cleared selection first. When a selection
is cleared, the one-line notice above the toolbar says "Selection cleared (18 nodes)" with Bring it
back. While nothing undoable has happened since, the first Ctrl+Z brings the selection back and
nothing else, leaving Redo as it was, and the line then reads "Selection restored (18 nodes)". The
next Ctrl+Z undoes the last filter step as usual.

**Where Morgan was, in their own memory (the moderator's setup):** the Les Miserables sample,
narrowed with "at least 2 connections" and "leave out group 8, the students at the barricade",
with Valjean and the 17 characters beside him selected and being read in the table. Morgan did
not knowingly add a third filter. Done means: 47 of 77 nodes, 2 of 3 steps (the stray "degree at
least 5" step off, group 8 on), and the same 18 characters selected again.

**Order effect:** Morgan did the line-only version earlier in this round, where the same spoken
sentence named Ctrl+Z and Ctrl+Z undid a filter step instead. Morgan came to this session
remembering that, and says so. Read this session's first minute with that in mind.

**Screens used:** the undo screen in participant view, this version (`screens/undo.html#study`),
driven by keyboard only; the steps list its line opens (the filter chip's own list, as in
`screens/filter-chip.html` and `screens/filter-steps-and-undo.html`).

Renders looked at by the moderator (Morgan had the screen curtain on):
- `../../../shots/screens__undo-notice.png` (the start: "Selection cleared (18 nodes)", Bring it back, 27 of 77, 3 steps)
- `../../../shots/round-6-fc-undo-restore.png` and `../../../shots/screens__undo-restore.png` (after the first Ctrl+Z)
- `../../../shots/screens__undo-list.png` (the steps list opened from the line after one Undo)
- `../../../shots/flows__undo-and-ways-back.png`

Severity scale used below: 1 cosmetic, 2 slows me down, 3 I needed a workaround or help,
4 stopped the task.

## Think-aloud

**The moment it happened.** "I was on the drawing, I pressed something, and it said 'Selection
cleared, 18 nodes. Ctrl+Z brings it back.' ... I've heard that sentence before. Last time I
believed it and it ate my group 8 filter. So no, I'm not pressing it yet."

"NVDA+Tab: 'Les Miserables, 27 of 77 characters drawn after 3 steps, application.' Twenty-seven.
Three steps. I made two and I was reading forty-something. So two problems again: selection gone,
and a step I don't know about."

**Checking before trusting.** "Before I press anything, I want the menu to tell me what Ctrl+Z
does. Shift+Tab to the top... 'Main menu, button.' Enter."

"Nothing. NVDA says nothing, and NVDA+Tab says 'document'. Down arrow: nothing. Right arrow:
nothing. So it opened something, or it didn't. NVDA+Space, browse mode, and I read down the page
like a web page, which is not how a menu is supposed to work."

"Browse mode: 'Quick actions, Ctrl+K. File. Edit. View...' and under that 'Undo Restore selection,
18 nodes, Ctrl+Z. Redo, Ctrl+Shift+Z. Undo history.' ... All right. That's the sentence I wanted.
'Undo Restore selection.' The menu and the announcement agree this time. I had to go into browse
mode to read a menu, and I'm writing that down, but the answer is the one I needed."

*Moderator's note: Enter on the main menu opens it, but focus stays on the page body and the arrow
keys do not move into it; Morgan read it only in browse mode. Severity 3.*

"I'm leaving the menu. Not with Escape. Last time Escape threw away five minutes of work. I'll
click the menu button again with Enter in browse mode." *The menu closes.*

**First reach: Ctrl+Z, now that two things agree.** "Back to the drawing. Ctrl+Z."

"'Selection restored, 18 nodes.' Good. Short, the important word first, and it's the word I was
promised. NVDA+Tab: 'document'. Focus fell off the drawing again. I pressed one key in the place I
was and now I'm nowhere. That's the same complaint as last time and it's still true."

"Table. I go down by heading-less arrowing until I hear the scope: 'Selected: 18 of 27 nodes.
Sorted by degree.' Valjean first. That's my 18. Half the task, one key, and the key did what the
sentence said. I'll say that plainly because I don't get to say it often."

"And it says nothing about Redo, which is right. I didn't ask for Redo. Ctrl+Shift+Z, just to see
if restoring ate anything." *Presses Ctrl+Shift+Z.* "Silence. Nothing to redo, I assume, because
there was nothing to redo before either. I'd rather hear 'Nothing to redo' than silence; silence is
what broken sounds like. But the selection's still there, 18 of 27, so it didn't clear it again."

**The numbers.** "Now the step I didn't make. Ctrl+Z again, because that's what undo is for."

"'Undone: Filter out group 8. Show in steps.' ... Hm. Group 8 is mine. That's the one I wanted to
keep. OK, that one's on me: undo undoes the last thing, and the last thing was group 8, not the
thing I didn't make. At least it said which step, first, so I heard it in the first two words and
didn't press again. Table: 'Selected: 18 of 40 nodes.' The selection survived the undo. Good."

"I'm not pressing Ctrl+Z a third time to get to a step in the middle; that takes group 8 and the
bad one both and I'd have to put one back. I want the list. Focus is on 'document' again. Tab."
*Two Tabs.* "'Show in steps, button.' Close. Enter."

"'Step 3 of 3: Filter out group 8, off.' Focus on a row, and the row is the one the line named.
Space." *Presses Space.* "'Step 3 of 3: Filter out group 8, took out 13, 27 left.' Back on. Up."

"'Step 2 of 3: Filter to degree at least 5, took out 20, 40 left. Keeps only nodes with at least
5 neighbors among the 60 it reads.' There it is. That's the stray one. Space."

"'Step 2 of 3: Filter to degree at least 5, off.' Down: 'Step 3 of 3: Filter out group 8, took out
13, 47 left.' Forty-seven. Tab out of the list, not Escape. Table: 'Selected: 18 of 47 nodes.'"

"That's where I was. Selection, filters, count. First attempt."

**Something that sounded different for the same thing.** "One small one. When I Tabbed past the
filter button at the start it said '27 of 77 nodes, 3 steps'. After the restore, same state, it
said 'Filtered: 27 of 77 nodes, 3 steps'. Nothing changed, and it's saying a different sentence.
When a sentence changes I assume something changed, and I go looking for what. Don't make me do
that for nothing."

**Checking twice.** "Reset it. Once is a rumour." *The moderator resets.*

"'Selection cleared, 18 nodes. Ctrl+Z brings it back.' Ctrl+Z. 'Selection restored, 18 nodes.'
Twice now. The key does what it says. I'll give it that."

"This time I'll go to the filters by the filter button instead of undoing group 8 first. Tab
to '27 of 77 nodes, 3 steps, button.' Enter."

"Nothing said. 'Document.' Tab... skip link, main menu, the rail, the filter button again, the
graphs, the drawing, the toolbar, the table... I've gone twenty-five Tabs and never reached a step.
If a list opened, it isn't in the Tab order. That's a dead end, and it's the same dead end as last
time."

"Fine. Ctrl+Z to undo group 8, then Show in steps, which I know works. Same route as the first
run: Space, Up, Space. 'Selected: 18 of 47 nodes.' Done, second time, same route, same numbers."

## Where Morgan ended

Both runs reached the intended end state: 47 of 77 nodes, 2 of 3 steps (degree at least 5 off,
group 8 on), Valjean and 17 others selected. The first Ctrl+Z restored the selection as the
announcement said; the second undid group 8, the step worth keeping, which Morgan put back through
the line's Show in steps before turning off the stray step. The filter button's own list was
unreachable by keyboard on the second run, so the line's action was the only way into the steps.

## Single Ease Question

**5 of 7.** "It told me a key, and the key did that. Twice. That's the whole difference from the
other version, and it's the difference between a 2 and this. The steps list is still the best part
of the tool: 'took out 20, 40 left' is my print statement. It's not a 6 because focus fell off
after every key I pressed, the menu only reads in browse mode, and the filter button opens
something I can't get into. And the second Ctrl+Z took my good step before the bad one. That's how
undo works, and the line told me which step it took, so I'm not blaming it much. But I'd have
liked a way to reach the middle step without taking a good one out first."

## Would Morgan use this instead of their current tool?

"Instead of my scripts, no. My scripts don't have stray clicks, so they don't need a way back. But
if I'm handing a colleague a filtered subgraph from this thing, and a click in the wrong place
throws my selection away, this version gives it back with the key every other program uses. That's
the one I'd want. If focus stayed where I left it and the filter button opened its list with focus
in it, I'd use it for exactly that job: building the subset with a sighted colleague and not losing
my place while they talk."

## What Morgan would still take away

- Focus lands on the page body after Ctrl+Z (both the restore and the undo), after Enter on the
  main menu, and after Enter on the filter chip. NVDA says "document". Only Show in steps puts
  focus somewhere useful. (severity 3)
- The main menu opens with Enter but the arrow keys do nothing; its Edit items ("Undo Restore
  selection (18 nodes)") are readable only in browse mode. (severity 3)
- Enter on the filter chip opens nothing a keyboard user can reach: no announcement, focus on the
  body, and the step rows are not in the Tab order. Show in steps is the only keyboard route into
  the list. (severity 3)
- After the restore, the next Ctrl+Z undoes Filter out group 8, the step worth keeping; the stray
  step sits in the middle and undo cannot reach it without passing through a good one. The line
  names the step first, which made it recoverable. (severity 2)
- Ctrl+Shift+Z with nothing to redo is silent. (severity 1)
- The filter chip's name is "27 of 77 nodes, 3 steps" at the start and "Filtered: 27 of 77 nodes,
  3 steps" after the restore, for the same state. (severity 1)
- In a step row the word that changed ("off", "47 left") still comes last. (severity 1)
- Esc in the participant view still reloads the page to its start (test page, not the design);
  Morgan avoided it on purpose because of the earlier session.

What worked twice: the announcement at the moment of loss names Ctrl+Z, and Ctrl+Z restores
exactly that selection; the restore said "Selection restored (18 nodes)" and nothing more; the
selection survived a later Undo and both ticks; Edit > Undo names the restore before it happens;
Show in steps is two Tabs from where focus fell and lands on the named row; the step rows say what
each step took out and what is left.

## Moderator's notes (not heard by the participant)

- Checked by driving the page in a browser with the keyboard only and logging, after each key, the
  focused element, the line's text, the chip's text and the table's scope line.
- The announcement and the key now agree in this version, and that alone moved Morgan from a
  first-attempt failure in the line-only version to a first-attempt success here. Morgan ran the
  other version first; the carried-over distrust made Morgan read the Edit menu before pressing
  Ctrl+Z, which a first-time participant would likely skip. The comparison between versions should
  count that.
- The spoken text at the moment of loss ("Ctrl+Z brings it back") differs from the visible button
  ("Bring it back"). Morgan never needed the button in this version. A sighted colleague and Morgan
  would describe the same line in different words ("press Ctrl+Z" against "click Bring it back");
  that did not come up in this task.
- Redo being untouched by the restore could not be observed: in this setup there is nothing to
  redo before or after, so Ctrl+Shift+Z is silent either way. A task that starts with a Redo
  waiting is needed to test that claim with a participant.
- The line is a live region rebuilt from scratch on every change; a real screen reader may not
  announce a region that appears already filled, so the "heard" lines above are what the design
  says will be spoken, not what NVDA was shown to say.
- The filter chip's disappearing "Filtered:" prefix is a mock rendering difference between the
  first draw and later ones; it is audible to a screen reader because it is the button's name.
