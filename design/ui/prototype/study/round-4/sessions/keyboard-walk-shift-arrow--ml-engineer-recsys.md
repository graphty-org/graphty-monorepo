# Keyboard walk with Shift+Arrow -- Chris, ML engineer (recommendation systems)

**Participant:** Chris, senior ML engineer who owns candidate retrieval at an online retailer.
Lives in notebooks and VS Code; keyboard-heavy (command palette, Cmd+K). Uses a MacBook, Chrome,
1440 x 900. Gives an unfamiliar control about 30 seconds, then looks for search or a shortcut.

**Task as given by the moderator:** "Without a mouse, find Javert, move through the characters he is
connected to, and select two of them."

**What he worked on:** the interactive keyboard-walk screen in participant view (a project called
"Protein interactions", 33 of 300 nodes drawn), driven only with key presses; then a glance at the
Find screen (a Les Miserables project) and the keyboard storyboard.

Renders of what he saw, in order (`../../../shots/r4-chris-kwsa/`):
`01-load.png`, `02-cmdk-nofocus.png`, `04-tab1.png`, `05-skip.png`, `07-javert.png`, `08-jav.png`,
`b01-find-javert-enter.png`, `b03-cmdf-javert.png`, `10-tp53.png`, `11-at-tp53.png`,
`12-plain-right.png`, `13-shift-down.png`, `14-shift-right1.png`, `15-enter1.png`, `17-enter2.png`,
`18-alt-enter.png`, `20-esc-end.png`, `21-keysheet.png`. Also glanced at
`../../../shots/find--s1.png` and `../../../shots/storyboards__keyboard-only.png`.

## Think-aloud

**Page loads (01).** "OK, hands off the trackpad. First thing I do anywhere is Cmd+K." *Presses
Cmd+K.* "...Nothing. Cmd+F?" *Presses.* "Nothing either. So the palette only exists once something
has focus? In VS Code Cmd+Shift+P works the second the window opens. That's strike one, and it's
the first two seconds."

"Also -- 'Protein interactions'? The moderator said Javert. Javert is Les Mis. This is a PPI
network. Maybe the name search spans projects. Let's find out."

**Tab (04).** "Tab. 'Skip to the graph drawing. F6 moves between regions.' Fine, that's the
accessibility skip link. Enter." *(05)* "Blue outline around the canvas, and a little card: 'Start:
TP53, the walk starts here. Shift+Arrow: walk. Enter: select. ?: keys.' Terse. I like terse."

**Cmd+K, type Javert (07).** "Palette opens now. Type 'Javert'. It gives me one row: 'Find
"Javert" -- nodes, sets, styles and more, in Find'. No 'no match'. There's a footer, 'Enter: Go to
selects nothing. This mock lists the selection and set commands only.' -- I don't know what that
sentence means and I'm not reading it twice." *Tries "jav" (08).* "Same. No hit, no fuzzy match."

"Enter on the Find row (b01)." "'No nodes match "Javert".' OK, that's honest at least. But match
in WHAT? This graph? The 33 drawn nodes? All 300? Every project I have? That's the denominator
question and it doesn't answer it. If I search a user id in my real data and get 'no match', I need
to know whether it's filtered out, not drawn, or genuinely not there -- those are three different
bugs in my pipeline."

*Presses Cmd+F again to retype (b03).* "Ha -- 'JavertJavert'. Cmd+F again should select the text
in the box, like every browser and every editor. Small, but it's the kind of thing that makes me
reach for the mouse."

"So there is no Javert here. Either the moderator gave me the wrong dataset or the tool can't reach
other projects from search. From my seat it's the same thing: I can't find the node I was asked to
find. I'll do the walk on the node it's pointing me at, TP53, so the rest of the session isn't
wasted -- but I'm marking the find step as failed."

**Cmd+K, TP53 (10).** "'Go to TP53 -- DNA repair, degree 32.' Degree right in the result row. Good,
that's what I'd want for a user id: which one, and how connected." *Enter (11).* "Double ring on
TP53, card says 'Walking the drawing. TP53, start of the walk, degree 32, rank 2 of 300, nothing
selected.' Rank 2 of 300 -- over the whole graph, not the 33 drawn? I think whole graph, since it
says 300. OK."

**Plain Right arrow (12).** "Arrow keys first, that's what my fingers do." *Presses Right.* "The
whole drawing slid sideways. That's the camera, not the walk. The card did tell me 'Shift+Arrow:
walk', so fair enough -- I just didn't read it before my hand moved. I guess it's like panning in a
map. Left to put it back."

**Shift+Down (13).** "Shift+Down. Ring jumps to PALB2: '1 of 32 from TP53. Weight 0.98, degree 5,
rank 247 of 300.' OK, now we're talking. It enumerates the ego neighbourhood and tells me where I
am in it -- 1 of 32. That's the k-hop list I'd print in a notebook, but I can step through it."

"'Neighbors by Weight / Degree / Name, O.' So it's sorted by edge weight, highest first. Weight
of what though? The panel on the right says 'edge weight: confidence'. Then say 'confidence 0.98'.
In my data there'd be three candidate weight columns -- click count, dwell, recency-decayed -- and
'weight' tells me nothing about which one it's sorting by."

**Shift+Right (14).** "Next neighbour: RPA1, 2 of 32, weight 0.95. Shift+Right is 'next in this
list', Shift+Down is 'go one hop deeper'. That's a tree walk. Took me one guess. Fine."

**Enter (15).** "Enter selects. 'RPA1 selected, 1 selected on canvas.' Right panel flips to RPA1,
module DNA repair, degree 7, #172 of 300. And the table at the bottom scrolled to RPA1 and
highlighted it. That's the node-to-row link I always want -- I can see the row."

**Shift+Right twice, Enter (17).** "Skip RAD50, go to RPA2, 4 of 32. Enter. '2 selected on
canvas.' Did it replace or add? It added -- both rings are on, inspector says '2 selected', lists
RPA1 7, RPA2 11. Good, Enter adds and doesn't clobber. In most tools a plain select replaces and
you need a modifier to add; here it just adds. I'll take it."

"Couple of things. The inspector says degree 'Mixed'. Mixed? It's 7 and 11. Say '7 to 11'. 'Mixed'
is what you say for strings. And in the Selection list, 7 and 11 are unlabeled -- I assume degree.
The table at the bottom is still parked on RPA1; RPA2 isn't highlighted anywhere I can see. So the
table followed my first pick but not the second."

"And '2 selected on canvas' is poking out past the right edge of the card. Cosmetic."

**Option+Enter (18).** *Found it on the key sheet later; tries it.* "Focus goes to the inspector,
shows RPA2 with a 'selected' tag. It dropped the '2 selected' view though -- now it's just RPA2.
Esc brings me back to the walk (19). OK."

**Esc (20).** "Esc: 'Walk ended at RPA2. 2 selected.' Selection survives ending the walk. Good --
if Esc had wiped my selection I'd have been annoyed. Key sheet says a second Esc clears it. That's
the VS Code pattern too, first Esc closes the thing, second one clears."

**? (21).** "Question mark: a proper key sheet. 'Everywhere: Cmd+F find, Cmd+K quick actions, F6
next region.' 'Graph drawing: Arrows move the view, Shift+Down walk into neighbours, Shift+Right
next, Shift+Enter back one step, Shift+Home back to start, O order...' This is exactly what I want
and it's read in ten seconds. If I'd pressed ? first I'd have been done in a minute. Would I have
pressed ? first? No. I pressed Cmd+K first and it did nothing."

"I didn't need Shift+Enter to go back, but it's there, and 'Shift+Up too'. Fine."

**Glance at the Find screen (find--s1).** "This one IS Les Mis -- Javert is in the table, degree
17. But it's a different-looking app: the search is a box in the left panel, the rail says
Assistant and Results instead of Data, there's an avatar and an Export button. The walk screen I
was on had none of that. Which one is the product? If Find lives in the left panel, the centred
popup I used is something else. I'd want one search."

**The keyboard storyboard.** *Scrolls, skims.* "Wall of text. Not reading it. The key sheet already
told me what I needed."

## After the task

**Did he complete it?** Partly. "I could not find Javert -- he isn't in the graph I was given and
search didn't reach anywhere else. On the node the tool offered, I walked its neighbours and
selected two without touching the mouse, in under two minutes once I was on the canvas."

**Single Ease Question (1 very difficult - 7 very easy): 4.**
"The walking and selecting is a 6 -- Shift+Down into the neighbourhood, Shift+Right along it,
Enter to add, and it tells me '4 of 32' the whole time. The finding part is a 2: Cmd+K dead on
load, no Javert, and a 'no match' that doesn't say what it searched. Averaged, 4."

**Would he use this instead of his current tool?** "For this job -- stepping through one node's
neighbours and picking a couple -- it beats networkx, where I'd print `list(G[u])` and squint. The
'n of 32, sorted by weight, press O to re-sort by degree' is the part a notebook doesn't give me
interactively. But my current tool for this is a notebook on my real data, and nothing here showed
me my data. And before I'd switch: search has to work the moment the page opens, 'no match' has to
say what set it searched, and the sort has to name my column, not 'weight'. Today, no; it's a nice
keyboard demo on someone else's graph."

## Problems observed

1. **The node the task names is not reachable.** "Javert" returns no match; the open project is a
   protein network, and search does not look beyond it or say it didn't. (Could not complete the
   find step.)
2. **Cmd+K and Cmd+F do nothing until the canvas has focus.** On page load both keys are dead; he
   only reached the palette after Tab and the skip link.
3. **"No nodes match" does not name the set searched.** Drawn nodes, the filtered graph, the whole
   graph and other projects are indistinguishable from the message.
4. **"Weight" does not name the column.** The walk card sorts by "Weight 0.98" while the graph panel
   says the edge weight is "confidence".
5. **Two selected nodes show degree as "Mixed".** A numeric attribute reads "Mixed" instead of its
   range (7 to 11); the Selection list numbers have no column label.
6. **The table follows only the first selection.** After the second Enter, RPA2 is not highlighted
   or scrolled to in the Nodes table.
7. **Cmd+F with Find open appends to the query** ("JavertJavert") instead of selecting the text.
8. **Two different Finds across screens.** The Les Miserables screen has a left-panel search box and
   a different rail (Assistant, Results, avatar, Export) from the walk screen's centred Find.
9. **"2 selected on canvas" overflows the walk card's right edge.**
10. **The inspector visit drops the multi-selection view.** Option+Enter shows only the focused node,
    not the two selected.

Note for the moderator (not a product finding): in the participant view, an Esc pressed before the
canvas has focus leaves the participant view and reloads the page with the facilitator bar; the
first attempt of this session was lost to it.

## What worked for him

- "1 of 32 from TP53", sorted by weight, with O to re-sort -- "the k-hop list I'd print, but
  steppable".
- Enter adds to the selection instead of replacing it.
- Esc ends the walk and keeps the selection; a second Esc clears it.
- The ? key sheet: short, grouped, one line per key.
- Go to TP53 shows the degree in the result row.
- The table scrolls to and highlights the first selected node: node to row, one step.
