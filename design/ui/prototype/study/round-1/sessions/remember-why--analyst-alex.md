# Session: remembering why -- Analyst Alex

Participant: Analyst Alex, operations data analyst at a logistics company. Uses NetworkX for the
numbers and Gephi for the picture; keeps his reasoning in a Jupyter markdown cell or a sticky note.

Task as given by the moderator: "Leave yourself what you would need next week to remember why you
kept these accounts."

Screens used: the Notes panel mock (nine states) and the Inspector mock (the protein graph plus
the "Transfers, March 2026" graph with a "Mule ring" set of 14 accounts).

## Transcript (think-aloud)

**1. First screen, Notes panel, empty.**

> "OK. 'Human protein interactions'. Accounts? There are no accounts here, these are proteins.
> TP53, MYC... Fine, I'll pretend the proteins are my accounts, or -- is there another graph?"

Looks at the left panel. It is blank under the graph name: no list, no sentence, nothing.

> "Notes is highlighted on the left, so this is the notes place, I guess. And it's... empty.
> Not even 'no notes yet'. Is it still loading? Is it broken?"

Scans the right column. Sees "Notes" with a plus, between Statistics and Export.

> "There's a Notes with a plus over there. That's probably it. But it's under 'Graph', so that's
> a note about the whole graph, not about the accounts I kept. I want the note on the accounts."

Looks at the toolbar at the bottom: arrow, a sliders-ish icon, a page icon, a lightning bolt, a
square.

> "The page icon looks like the Notes icon on the left. Maybe that's 'add a note'. No label, no
> tooltip when I hover. I'm not clicking a mystery button on my first minute."

**2. Goes to the inspector page to find accounts.**

> "The moderator said accounts, so let me find the one with accounts."

Finds the "Transfers, March 2026" graph: 3,000 nodes, a set called "Mule ring, fixed, 14". The
state shown has 7,495 things selected with a table of ACC- ids, merchant, riskScore.

> "OK, this is closer to my world. 'Mule ring', 14 accounts, that's what I 'kept'. Flagged 13 of
> 14 -- so one of them isn't flagged, and that's exactly the thing I'd forget by next week."

Reads down the right column for the selection: Statistics, Attributes, Memberships, Appearance,
Export.

> "Where do I write why? There's Statistics, Attributes, Memberships, Appearance, Export. No
> Notes. On the protein screen there was a Notes section on the right. Here there isn't. So
> notes are only for the graph? Or only for proteins?"

Tries the "..." next to "7,495 selected" (More actions). The prototype shows nothing.

> "Dead. OK. There's a 'Create set' icon up there -- but the set already exists, it's 'Mule ring'.
> I'd click the Mule ring on the left and hope it has somewhere to type."

The mock has no Mule ring inspector. The closest is the protein set "DNA repair": Rule, From,
Layout, Statistics, Members, Appearance, Used by, Export.

> "Still no Notes on a set. 'Used by: nothing yet' -- I don't know what that means. So on this
> screen I can't write a note on the set. I'd honestly just put it in the set name. 'Mule ring --
> 13 flagged + ACC-xxx via shared device'. That's what I do in Gephi, I abuse the label column."

**3. Back to the Notes panel, looking at the states with notes.**

Moderator allows him to look at what the panel looks like once notes exist (states 3 and 7).

> "Oh, OK. So once there are notes, it's a list. 'About TP53 neighborhood, 33 proteins, 2h'.
> 'Cites Betweenness, full graph'. So a note is attached to a set. Good, that's what I wanted.
> But I still don't know how that one got made. Somebody made it from somewhere I didn't find."

Looks at the set inspector in state 3: now there is "Notes 1" with a plus, and the note text.

> "There it is -- on this set the Notes section exists. On the DNA repair set a minute ago it
> didn't. So it only shows when there's already a note? That's backwards. The first note is the
> one I need to find the button for."

Clicks the row. The note opens in a small card: About, time, the text, "CITES Betweenness full
graph", "QUOTES TP53 betweenness 0.114".

> "OK, this I like. It remembers the number I quoted and which run it came from. That's the
> thing I lose. In my notebook I write '0.114' and next month I have no idea if that was weighted
> or not."

State 7 ("Out of date"): the rows show "Earlier run -- Use current" and one says "Detached --
Restore set".

> "'Earlier run'. So it tells me the number in my note came from an older run. Nice. That's the
> 'did I rerun it' question, answered. 'Use current' though -- does that change my note's number?
> I don't want it quietly updating what I wrote. The note was true when I wrote it."

> "'Detached, Restore set' -- I deleted the set but the note stayed. Good. Gephi would have just
> eaten it."

State 8 ("Filtered"): CDK1 note marked "filtered out, Neighbors of TP53".

> "Fine, it doesn't hide my notes when I filter. Good."

**4. Wrap-up questions he asks out loud.**

> "Where does this get saved? There's no Save and no 'saved' anywhere. If I close the tab, is it
> gone? That's the Gephi thing again. I need to see it's saved."

> "And can I get the notes out? If the note says why these 14 accounts are kept, that sentence
> has to go in the CSV or at least next to the set when I export. Export is right there, but
> nothing says notes go with it."

> "Next week I'd open the Mule ring and I'd want the note right there on the set. From what I saw
> it's there only if it already exists, and I couldn't make the first one on the accounts screen."

## Outcome

Partly done. He understood what a note looks like and how it ties to a set, a run and a quoted
number, but on the accounts graph he found no place to write the first note: the selection and
set inspectors show no Notes section, the empty Notes panel gives no way in, and the toolbar's
note button has no label or tooltip. He fell back to "I'd put it in the set name".

## Single Ease Question

**3 of 7.**

> "Once a note exists, it's good -- better than my notebook. Making the first one, I couldn't
> find how. That's the part I'd do every week."

## Would he use it instead of his current tool?

> "For remembering why, maybe, yes -- if it saves and if the note comes out with the export. The
> 'this number came from an earlier run' thing is the first time a tool has done that for me. But
> today I keep the why in a markdown cell next to the code, and that always works. If I can't find
> how to write the note on the accounts I kept, I'll keep doing that."

## Problems observed

1. **No way in from the empty Notes panel** (severity 3). The panel is blank; no command, no hint.
   "Is it still loading? Is it broken?"
2. **No Notes section in the selection or set inspector on the accounts graph** (severity 4). The
   Notes section appears on a set only once it has a note; the Mule ring accounts had nowhere to
   write. "The first note is the one I need to find the button for."
3. **Note tool on the toolbar is unlabeled and has no tooltip** (severity 3). "I'm not clicking a
   mystery button on my first minute."
4. **No sign that notes are saved** (severity 3). "If I close the tab, is it gone?"
5. **Nothing says whether notes go out with Export** (severity 2). "That sentence has to go in the
   CSV."
6. **"Use current" is ambiguous about rewriting the note** (severity 2). "I don't want it quietly
   updating what I wrote."
7. **"More actions" on a selection opens nothing in the prototype** (severity 2).
8. **Task wording and the sample data do not match** (severity 1, moderator issue): the Notes mock
   uses proteins, the task says accounts.
