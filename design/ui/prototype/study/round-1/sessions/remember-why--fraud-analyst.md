# Session: "Remember why you kept these accounts" -- Sarah, fraud investigator

Participant: Sarah, level-2 financial crime investigator (persona: study/personas/fraud-analyst.md).
Mode: moderated task, not mandated by her manager -- she gives the tool her usual few minutes but
keeps going because the moderator asked.
Screens: the Notes panel mock (all nine states) and the Inspector mock (one node, a set).
Task as given: "Leave yourself what you would need next week to remember why you kept these
accounts."

Note for readers: the mocks show a protein-interaction graph, not accounts. Sarah was told to
treat the dots as accounts. Her reactions to the sample data are recorded, not edited out.

## Transcript (think-aloud)

**Opening screen (Notes panel, empty).**

> "OK. 'Human protein interactions.' So I'm pretending these are accounts. Fine. Which ones did
> I 'keep'? Nothing is highlighted. Nothing on the left. I clicked something called Notes on the
> left strip and I get... a title and a blank white column. No 'you have no notes', no button,
> nothing. Is it loading? Is it broken?"

She waits, then scans the right-hand side.

> "Right side: Nodes 300, Edges 1,262, Density, Connected components -- that's for the data
> science guy. Down here: 'Notes' with a plus. OK, that plus is probably it. But notes about
> what? The whole thing? I don't want a note on the whole file, I want a note on the eight
> accounts I'm keeping."

Expectation: the plus opens a text box attached to whatever she has selected. She has nothing
selected, so she hesitates.

> "I'm not clicking that yet. If I write it here and it's on the whole file, next week I won't
> know which accounts it meant."

**Looking for a way to 'keep' accounts.** She looks at the bottom toolbar: an arrow, a
connector-looking icon, a page with a folded corner, a lightning bolt, a square.

> "The page with the folded corner -- is that a note? Sticky note? No label. I'll hover it in
> real life and hope the tooltip says something. The lightning bolt I'm not touching."

She then finds, on the Inspector mock, the left panel section "Sets and paths" with "TP53
partners -- fixed -- 33" and "DNA repair -- rule -- 30".

> "'Fixed.' OK, that I get -- a fixed list, somebody picked those. That's what I'd call 'the
> accounts I kept.' 'Rule' is presumably 'everything matching some criteria'. So step one is
> make a fixed set, step two is put the note on the set. That's two things I have to know
> about, and nothing told me either one."

**Opening a set (Inspector, set).**

> "Click 'DNA repair'. Right side changes: Rule, From 'Same value as TP53', Statistics --
> edges inside 105, edges out 42 -- members by degree. Where's the note? I scroll... Appearance,
> Used by, Export. No Notes section on this one at all."

On the other shot of the chosen state (Notes panel state 3) the fixed set 'TP53 neighborhood'
does show "Notes 1" with a plus in the inspector.

> "So on some things there's a Notes section and on some there isn't until there's already a
> note? That's how I lose the thread. I'd go looking for it on Monday and it wouldn't be where it
> was."

**One account (Inspector, one node).**

> "Clicked one account -- TP53. Attributes, degree 32, '#2 of 300', betweenness, pagerank.
> Neighbors 32. Memberships: it's in 2 sets. Good, that bit is actually useful, I'd want to see
> 'this account is in the ring I kept'. But no Notes on the account either. Maybe it's in the
> three dots. I'd try the three dots."

She checks the dots on the Notes panel row menu state: only "Edit note" and "Delete note".

> "Those dots are on a note, not on the account. So for the account I'm guessing."

**What a finished note looks like (Notes panel, 'With notes' and 'Chosen').**

> "Now this is more like it. Left side: a list, newest first, each one says what it's about --
> 'About TP53 neighborhood, 33 proteins', '2h', then the text, then 'Cites Betweenness, full
> graph'. Click one and a card opens on the chart: About, when, the text, CITES and QUOTES
> 'TP53 betweenness 0.114'. And there's a little '1' bubble on the chart where the note is."

> "The 'Quotes' thing -- if that means it stamps the actual number at the time I wrote it, that
> is exactly what I need. Next week the data's refreshed, and I need to know what I saw on the
> day I decided. That's audit trail."

> "What's missing: who. It says 'Dr. Chen'. Fine, but in my world it's the case number. I'd
> want to write 'Case 2026-0412, kept these 8, shared device and same beneficiary, 9,800 of
> 10,000 out within 26 hours.' There's no case field, no disposition. I'd type the case number
> into the text and search for it with that 'Find in notes' box."

**Out of date (state 7).**

> "'Earlier run -- Use current.' So it knows the number I quoted came from an older run.
> Good, it's telling me, not silently changing my note. I would NOT click 'Use current' on a
> note I've already put in a case -- that's rewriting history. I'd want it to keep the old one
> and show me both."

**Filtered (state 8) and view only (state 9).**

> "'Filtered out, Neighbors of TP53' on one note, greyed. OK, it didn't delete my note just
> because I filtered. Good. View only -- the pluses are gone. That's my reviewer's copy
> presumably. Fine."

**Getting it out.** She looks for a way to put the note in the case file.

> "Export at the top right. Does the export include the notes? Nothing says. If I can't get
> 'these 8 accounts plus why' out as a CSV or into Word, I'm writing it in the case system
> anyway, and then this note is a second copy that will drift."

**Wrap-up.**

> "Where I'd end up: I'd pick the accounts, figure out how to make them a 'fixed' set -- I
> think it's the plus next to 'Sets and paths' but I'd be guessing whether it uses what I
> selected -- then find the plus under Notes on that set, and type the why. Then I'd screenshot
> it and paste it into the case notes anyway, because I don't trust that it'll be here Monday
> or that my reviewer can see it."

## Single Ease Question

**3 of 7.** "Reading notes is easy. Making one about the right accounts I had to work out by
elimination."

## Would she use this instead of her current tool?

> "Not instead. Today 'why I kept these' is a paragraph in the case system and a highlighted
> tab in my Excel workbook. This could be better than both if the note sticks to the accounts
> and stamps the numbers on the day -- that 'Quotes' line is the best thing here. But the empty
> screen told me nothing, the Notes section comes and goes, and I can't see how the note leaves
> the tool. Until it goes into the case file with the account list, it's a nice extra, not my
> record."

## Workarounds she said she would use

- Type the case number into the note text, then use "Find in notes" to find it.
- Screenshot the note card with the chart and paste it into the case system.
- Keep the account list in Excel as the record, because export of notes is not shown.

## Problems observed

1. Empty Notes panel is a blank column: no hint how a note is made; she thought it was loading
   or broken. (severity 3)
2. The Notes section in the inspector is missing on a single account and on a rule set, and
   present on another set -- she cannot predict where to add a note or where to find it later.
   (severity 3)
3. "Keeping" accounts requires first making a fixed set, then noting the set; nothing connects
   the two steps, and whether "+" next to Sets and paths uses the current selection is not shown.
   (severity 3)
4. Unlabelled toolbar icons; the note tool is a guess. (severity 2)
5. No sign whether Export includes notes or the accounts they are about. (severity 3)
6. "Use current" on an out-of-date note reads as rewriting a note she has already relied on.
   (severity 2)
7. No place for a case reference or a disposition; she would overload the free text.
   (severity 2)
8. Sample data is proteins, not accounts; she had to translate throughout. (severity 1, study
   artefact)
