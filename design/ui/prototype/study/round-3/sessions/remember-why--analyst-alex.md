# Remember why -- Analyst Alex

Participant: Analyst Alex, intermediate graph analyst at a logistics company (see
`../../personas/analyst-alex.md`). Uses NetworkX for the numbers and Gephi for the picture.

Task as given by the moderator, and nothing more: "Leave yourself what you would need next week to
remember why you kept these accounts."

Screens used: the Notes panel mock (`screens/notes-panel.html`, states 1 to 9) and the Inspector
mock (`screens/inspector.html`: a set, several nodes selected). Renders the participant saw, in the
study view with design notes hidden:

- `shots/r3-alex-remember-np-s1.png` (Notes panel, empty), `-s2` (hover), `-s3` (a note opened),
  `-s4` (a note's menu), `-s7` (out of date), `-s8`, `-s9`
- `shots/r3-alex-remember-ins-set.png` (a set selected), `shots/r3-alex-remember-ins-several.png`
  (three nodes selected)

Outcome: success with difficulty. Alex found where a note goes and what a finished note looks like,
but the mock never showed him the moment of writing one, and the word "accounts" did not match
anything on screen.

## Transcript (think-aloud, in Alex's words)

**Start: Notes panel, empty.**

> "OK. 'Accounts.' This is... Human protein interactions. There are no accounts in here. There are
> proteins. So I'm going to assume 'these accounts' means some bunch of nodes I kept aside. Fine.
> In my world it'd be suppliers, same idea."

> "Left side says Notes, and it says 'No notes yet. Add a note about the selection.' And an Add
> note button. Right. Before I click that -- 'Notes are saved in the project and travel in project
> files and findings reports.' Good, that's the thing I'd ask. If it lives in a sidecar file that
> gets lost, it's useless. It says it's in the project. I'll believe that when I reopen it."

> "'About the selection.' I haven't selected anything. So what does Add note do right now, with
> nothing selected -- note on the whole graph? I'm going to go find the accounts first."

He clicks the Graph button on the left rail.

**Inspector, a set selected.**

> "There we go, left side: Sets and paths. 'DNA repair, rule, 30' and 'TP53 partners, fixed, 33'.
> So those are my kept things. 'Fixed' -- fixed like... repaired? Or fixed like it doesn't change?
> I think it means frozen, since the other one says 'rule'. OK, 'rule' is the one that
> recalculates, 'fixed' is the list I picked by hand. I had to think about that for a second."

> "Say the 33 TP53 partners are 'the accounts I kept'. I click DNA repair to see what a set looks
> like on the right... right side has 'Rule: module = DNA re...' cut off, and 'Created from: Same
> value as TP...' also cut off. Huh. So it already remembers HOW I made it. That's actually half of
> what I'd forget. In Gephi I'd have a filter I didn't save and next week no idea how I got these 30."

> "But the 'why' isn't the how. The why is 'these are the ones the ops director asked about after
> the lane closure'. That's the note."

> "Down here: Notes, plus 'Add a note'. OK, so the note is on the set. That's where I'd click."

He clicks "Add a note" in the Inspector.

> "...Nothing on this page shows me what happens. I'm guessing a little text box opens. I can't
> tell whether it's going to stick the note to the set, or to the whole graph, or to whatever I
> happen to have selected. It says 'Add a note' under the set, so I'd assume the set. I'd type:
> 'Kept these 33 because they're all one hop from TP53 -- the knockdown panel. Check if count
> changes after next refresh.' And hope."

(Moderator note: the mocks show the Notes panel and a finished note, but no state where a note is
being written. Alex had to imagine the editor.)

**Back to the Notes panel, with notes present (hover, opened).**

> "OK, so here's what one looks like after. 'About TP53 neighborhood, 33 proteins', 2h. And it
> says 'Cites Betweenness, full graph'. And when I open it: 'Cites: Betweenness, full graph' and
> 'Quotes: TP53 betweenness 0.114'. Oh, that's nice. It kept the number I wrote down, next to the
> text. That's exactly the thing I'd lose -- I write 'betweenness 0.114' in a slide and next month
> I don't know which run that came from."

> "The hover tooltip gives the exact time, Sep 28, 10:14. Fine. '2h' is fine for today, useless
> next month, so good that the date is there."

> "And the right side, when I click the note, shows the set: 'Created from Neighbors of TP53',
> 33 proteins, 59 interactions, members by degree. So next week I click the note, I get the set
> back. That's what I actually want."

> "The little '1' bubbles on the canvas near CDK1 and TP53 -- those are notes on the picture? OK.
> I'd have missed them if you hadn't shown me the list."

**Row menu.**

> "Three dots: Edit note, Delete note. That's it. Where's 'go to the set' or 'select these'? I
> guess clicking the row does that. Fine."

**Out of date.**

> "Now this one's interesting. 'Earlier run -- Add current value'. So I reran betweenness and the
> note knows its number is old. That's the thing that burns me: stale numbers in the deck. Good.
> Though 'Add current value' -- does that replace the old number or put both? I'd want both. I
> want to see 0.114 then and whatever now."

> "And the bottom one: 'About DNA repair, 30 proteins -- Detached -- Restore set. The set this
> note pointed to was changed.' Hmm. Detached. So I changed the set and the note let go of it? If
> I changed the rule on purpose, I don't want to 'restore' it, I want the note to come along. And
> if I didn't change it on purpose, who did? This scares me a bit. Restore set sounds like it'll
> undo my change. I wouldn't click it without knowing what it puts back."

**Filtered and view-only.** He glances and moves on: "View only, no plus buttons, OK, that's
someone else's copy."

## After the task

**Single Ease Question: 5 out of 7.**

> "What took longest was figuring out what 'these accounts' were -- there's nothing called
> accounts -- and then the 'fixed' versus 'rule' thing. Once I found the set, the note was right
> there. I never actually saw the box I type into, so I'm trusting it goes on the set."

**Would he use this instead of his current tool?**

> "For this part, yes, probably. Right now my 'why' lives in a text file next to the GEXF, or in
> the speaker notes of a slide, and it never has the number or the run in it. This keeps the set,
> how I made it, and the number I quoted, and tells me when the number went stale. That's more than
> Gephi does -- Gephi doesn't even keep my filter. I'd still keep the SQL for the refresh in
> Python. But if next week I click the note and the 33 light up, that's the thing I'd come back
> for. The 'Detached / Restore set' bit needs to tell me what it'll do before I trust it."

## Problems found

1. **No writing state.** The mocks show "Add note" and "Add a note" but never the editor that
   opens, so the participant could not see where the note attaches (set, selection, or graph) or
   confirm it attached before leaving. Severity 3.
2. **"Fixed" next to a set name reads as "repaired".** Alex worked out "frozen list" only by
   contrast with "rule". Severity 2.
3. **"Detached -- Restore set" is ambiguous and sounds destructive.** He could not tell whether
   Restore undoes his own deliberate change to the set. Severity 3.
4. **"Add current value" does not say whether it replaces or keeps the quoted number.** He wants
   both, old and new. Severity 2.
5. **Rule and "Created from" values are truncated in the Inspector** ("module = DNA re...", "Same
   value as TP..."), which is exactly the text he would want to read next week. Severity 2.
6. **Empty-panel copy says "about the selection" when nothing is selected**, leaving him unsure
   what a note would attach to. Severity 1.
7. **Row menu has only Edit and Delete** -- no visible "select these" / "show on graph"; he guessed
   that clicking the row does it. Severity 1.

## What worked

- "Notes are saved in the project and travel in project files" answered his first worry up front.
- A set remembers how it was made ("Created from Neighbors of TP53", its rule), so the "how" is
  already recorded and the note only has to hold the "why".
- The note keeps the quoted number and the run it came from ("Quotes: TP53 betweenness 0.114",
  "Cites Betweenness, full graph").
- The out-of-date flag ("Earlier run") on a note whose number changed.
- Opening a note brings back the set in the Inspector.
