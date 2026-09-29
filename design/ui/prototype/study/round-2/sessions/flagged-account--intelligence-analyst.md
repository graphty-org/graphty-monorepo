# Flagged account -- Marcus, criminal intelligence analyst

Simulated usability session, round 2. The participant is the composite persona in
`study/personas/intelligence-analyst.md`: a state fusion-center analyst who lives in i2 Analyst's
Notebook and Excel. He worked the task on five static mocks in order -- Find, the inspector, the
filter chip, the notes panel and the export dialog -- looking at renders and treating each mock's
visible controls as clickable.

**Task, as the moderator gave it:** "An alert flagged account ACC-365386. Decide whether to clear
it or refer it, and keep what you would need to justify that."

**Outcome:** failed. He never reached the account on a graph. The only place ACC-365386 showed up
was one row in someone else's evidence-file preview, in a report section that is marked as not
built yet. He made no decision and kept nothing.

**Single Ease Question:** 2 of 7.

Renders he looked at (fresh this session): `shots/r2-flagged-ia--find-s1.png`,
`shots/r2-flagged-ia--find-s10.png`, `shots/r2-flagged-ia--find.png`,
`shots/r2-flagged-ia--inspector-cap.png`, `shots/r2-flagged-ia--inspector-edge.png`,
`shots/r2-flagged-ia--filter-chip.png`, `shots/r2-flagged-ia--notes-panel.png`,
`shots/r2-flagged-ia--notes-s3.png`, `shots/r2-flagged-ia--export-dialog.png`.

---

## Transcript (think-aloud)

### Find -- just opened

> OK. Alert on an account. First thing I want is the account itself and whatever it's touching.
> Top left says "Les Miserables". That's... a book. That's the case? Whatever, it's a demo.
> There's a box that says "Name, id or value", with a tooltip. Tooltip says it finds nodes, edges,
> sets, paths... "Paste a list of ids to find them all." OK, that's actually useful -- I'd paste the
> whole alert batch in there on a real day. Typing the account number.

### Find -- ACC-365386 typed

> "0 results in all 77 nodes." "0 matches for ACC-365386."
>
> Fine. So it's not in here, and it didn't try to hand me some other account that's one digit off.
> Good -- the last tool I used did that and I almost pulled the wrong subpoena. But it also doesn't
> tell me where the account IS. Seventy-seven nodes of Les Miserables. I don't have the right file
> open, is what that's telling me, if I squint.
>
> So how do I get to the transfers? Title has a little down arrow next to "Les Miserables". I'd
> click that. [clicks] Nothing happens. [mock: the project menu is not wired] OK. Hamburger top
> left -- maybe that's File, Open. Nothing there either.
>
> Left rail says Graph, Results, Notes. And there's "Assistant -- Off. Nothing is sent." Good. I
> read that. That's the first thing I'd have asked. Keep that.
>
> Also the side panel on the right says 28 nodes and the header says 77. The chip says "Filtered:
> 28 of 77 nodes, 3 steps". Somebody filtered this before I got here. On a real case I'd want to
> know who and when. Anyway.
>
> Moderator, I can't open the account's data from here. Can I just go to the next screen?

*Moderator moves him to the inspector mock.*

### Inspector -- different graph each frame

> First frame is proteins. TP53? That's a gene, my wife would know. Skipping. There's one with
> accounts -- "Transfers, March 2026". That's my world, sort of. 3,000 nodes, and somebody has
> selected 7,495 things and there's a big black outline around a blob of gray dots. That's the
> hairball. That's exactly the thing I don't want. I want the thirty accounts around my guy.
>
> Table at the bottom: id (account), kind, country, total degree, riskScore, flagged. That's
> readable. "flagged: false" all the way down, sorted by degree, merchants on top. Is my account in
> this list? I'd scroll... it says rows 1 to 7 of 1,863. There's a search magnifier on the table.
> I'd search there. It's not a live table so I can't. None of the seven I see is mine.
>
> riskScore. 62, 43, 50. Out of a hundred? Out of what? Who computed it -- the bank, the vendor,
> this thing? That's the "point three seven of what" problem. If I'm referring somebody I'm quoting
> that number to a supervisor and I have to say where it came from. Nothing on this screen says.
>
> Let me look at a line. The edge frame -- it's proteins again, "TP53 -- BRCA1", confidence 0.71.
> If that were a transfer, I'd want: amount, date, which statement it came off, the reference
> number. It gives me one attribute and "Add a note". So a link here is whatever columns I loaded.
> In i2 I can pull up the source on a link. I don't see where I'd do that.
>
> I do like the "Select neighbors, 1 hop: 33 nodes" tooltip on the protein one -- telling me how
> many I'm about to get before I click. If that works on accounts, that's how I'd grow out from the
> flagged guy. One hop, see who he paid and who paid him. That's the first move on any money case.
> But I never got my guy on the screen to try it.

### Filter chip

> Back to the book characters. "Filter steps": Filter to largest component, filter to degree 5 or
> more, filter out group 8. Three dropped below degree 5 because of the group step -- OK, that's
> honest, it tells me the steps interact. Checkboxes to turn each one off. I can follow it.
>
> Below that there's a transfers one: "Filter out kind = merchant", "Filter to riskScore >= 20". So
> somebody can cut the merchants out and keep the risky ones. That's something. But I want a date
> window -- "the ten days before the alert fired" -- and the page says the time step isn't drawn
> yet. That's the one I'd use most. Every alert has a date on it.
>
> Also "2.9K of 3K" on the little chip. Don't round my counts. If a sergeant asks how many, I'm not
> saying "two point nine K".

### Notes panel

> Empty one says "Notes are saved in the project and travel in project files and findings
> reports." Travel where? If "findings reports" means something leaves the building, I need to
> know. I'd hover it and look for where it goes. Nothing. It says nothing is uploaded somewhere else
> -- on the export dialog -- so I'll give it that.
>
> Chosen note: "About TP53 neighborhood, 33 proteins", a date and time, text, then "Cites:
> Betweenness, full graph" and "Quotes: TP53 betweenness 0.114". OK. So a note can pin the number it
> was based on and when. That's closer to what I need than I expected. What it doesn't have: source
> of the underlying data and a grade. Where did this transfer come from -- which bank return, which
> Bates number -- and how reliable. In our shop that's a 2x2 or a 4x4 grade on every entry. A
> free-text note isn't that. I'd end up typing "Source: Chase subpoena return 03/14, B2" in the text
> box every time and nobody could filter on it.
>
> Who wrote the note? It says 2h, 1d, Sep 24. There's no name on it. When I hand this to the next
> analyst they need to know which notes are mine.

### Export dialog -- the evidence file

> Now this is interesting. "The evidence file." "Sarah refers the mule-ring case." Scope: filtered,
> 14 nodes, "in Mule ring suspects". Page 1, Boundary, table of accounts... ACC-233575,
> ACC-782213... ACC-365386. There he is. Personal, GB, riskScore 92, degree 8.
>
> So the only way I found my account was by opening an export box on somebody else's case. That's
> backwards. I would never have gone looking in Export for him.
>
> And what it tells me: he's one of 14 in a "mule ring" somebody put together, risk 92, eight
> connections. Refer or clear? On this I'd lean refer -- he's in a ring with thirteen other
> high-score accounts and eight counterparties. But I can't see the eight. I can't see a single
> transfer, an amount, a date. I'd be referring on a vendor score and somebody else's set. I won't
> sign that.
>
> Findings report is greyed out with a pink tag: "waits on graphty-element: findings report". I
> don't know what graphty-element is. To me that says "doesn't work yet". The file name says
> "(file format: the owner's decision)". So I can't actually keep this.
>
> What I CAN export: figures, a nodes table, an edges table, a PNG. And the footer says "1 file
> goes to your Downloads folder. Nothing is uploaded." That's the best line in the whole thing. I'd
> read that to IT.
>
> Methods: "transfers-2026-03.csv: 3,000 accounts, 9,113 transfers, directed. PageRank, exact, on
> the full graph." Good, it names the file and the method. PageRank -- is that the middleman one? I
> say betweenness. If the report ranks by PageRank I need one line telling me what it measures, or
> I can't repeat it on the stand.

*Moderator ends the task.*

---

## After the task

**Did you decide?** No. "I found out he's in somebody's mule ring with a score of 92. I never saw
his transfers. You don't refer a man on a score."

**What would you keep to justify it?** "The fourteen-account table, the transfers between them
with dates and amounts, the source of each transfer, and my note saying why. I could get the
table out as a CSV. I couldn't get the rest."

**SEQ:** 2. "It was hard because the account wasn't where I was. I typed it in the one box that
said it finds ids, it said zero, and nothing told me how to get to the file he's in."

**Would you use this instead of i2 and Excel?** "Not yet. Two things I'd come back for: it says
nothing is uploaded and the assistant is off -- that gets me past IT -- and the neighbors button
that tells you how many before you click. But I need to open the account from the alert, see his
one-hop, see each transfer with its date, amount and which bank record it came from, grade it, and
walk out with a file I can put in the case jacket. Today I'd do that in Excel with a pivot on
sender and receiver in about ten minutes. This didn't get me to the account."

---

## Problems observed

1. **Find, "0 matches" gives no way out (severity 3).** The miss is honest and does not offer a
   near-miss id, which he liked, and the header names the graph searched. But nothing in the result
   offers to look in another graph or file, and the project name's menu did nothing. He read "0" as
   "the account doesn't exist" before he worked out he had the wrong graph open.
2. **No way to switch to the right data from where he was (severity 3).** The title menu and the
   hamburger were dead in the mock. He could not open the transfers graph from Find.
3. **The account only appears inside Export (severity 4).** The one sighting of ACC-365386 was a
   row in another case's evidence-file preview. Nothing in Find, the inspector or the table led him
   there. For an alert-triage task this is the whole task failing.
4. **No transfer-level detail or source on a link (severity 3).** The edge inspector shows the
   loaded columns only (one attribute on the mocked edge). He wants amount, date and the record it
   came from on every link, and a way to open that record.
5. **Scores with no provenance (severity 3).** riskScore in the table has no scale, no source and
   no definition; PageRank is named in the methods with no plain-words meaning. He will not repeat
   either to a supervisor.
6. **Notes lack source, grade and author (severity 3).** Notes cite a measure and a quoted value
   and carry a time, which he liked, but have no author, no source-record field and no reliability
   grade. He would type them into free text, where nobody can filter on them.
7. **The evidence file is disabled with a developer label (severity 3).** "waits on
   graphty-element: findings report" means nothing to him; he read it as "broken". The one export
   that matched his job could not be made.
8. **No time window (severity 2).** The filter page says a date step is not drawn yet; every
   alert has a date and his first cut is "the days before it fired".
9. **Rounded counts on the chip (severity 2).** "2.9K of 3K" -- he wants exact counts he can
   quote.
10. **Unexplained inherited filter (severity 1).** The graph opened already filtered to 28 of 77
    with no sign of who filtered it or when.

## What he liked

- "Assistant -- Off. Nothing is sent." in the rail, and "Nothing is uploaded." in the export
  footer. Both answer his first question before he asks it.
- Find does not suggest a different account as "closest" to an id.
- The neighbors command states the size of the hop before he clicks.
- Filter steps say which step dropped what ("3 dropped below degree 5 by ...").
- A note pins the value it quotes and the time it was written.
