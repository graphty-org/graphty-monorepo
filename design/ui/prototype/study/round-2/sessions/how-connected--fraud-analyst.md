# Session: how is this account connected to that one? -- Sarah, fraud investigator

**Participant.** Sarah, a complex-case financial crime investigator at a mid-size bank (see
`../../personas/fraud-analyst.md`). Simulated participant.

**Mode.** Not mandated. First-impression patience: about five minutes and one real task before
she decides whether this is demo-ware.

**Task as given.** "How is this account connected to that one?"

**Screens used.** The inspector page (twelve states) and the Find page (ten states). Renders read:
`shots/screens__inspector.png`, `shots/record/r2-flagged-ia--inspector-two.png` (two nodes selected,
Paths between open), `shots/record/inspector-path.png` (a found path), `shots/record/inspector-cap.png` (the
March transfers file, 7,495 selected), `shots/record/find--s1a.png` (Find just opened),
`shots/record/r2-flagged-ia--find-s10.png` (an account id with no match), `shots/record/find--s7a.png` (past
the drawing limit).

**Note on the mock.** Most inspector states are drawn on a protein network and most Find states
on Les Miserables. The only account data is the March transfers file, and it is shown only as a
large selection drawn as density. Sarah had to read the protein states as stand-ins for her
accounts; where she says "I'm guessing it would show amounts here", the mock did not show it.

---

## 1. First screen -- the inspector at rest

> What is this, proteins? "Human protein interactions." OK, I'll pretend TP53 is an account.
> Where's the search box? I'd paste the account number first thing.

She scans the top of the left column. There is no search field, just "Human protein
interactions" and "Full graph".

> No search box. There's a funnel -- "Full graph" -- that's a filter, not a search. I'll try
> Ctrl+F. If that gives me the browser's find, I'm annoyed.

(The Find page note says Ctrl+F or the Find icon on the Graphs header opens Find, replacing the
left lists. She would not have found the icon; she found it by Ctrl+F, which is her habit.)

## 2. Find -- pasting the account number

**Find just opened.** A field that says "Name, id or value" and a long black tooltip.

> "Name, id or value." Fine. I'm not reading that tooltip, it's five lines.

(The tooltip says a list of ids can be pasted to find them all. She did not read it.)

She pastes the first account number.

**The id-with-no-match state.** "0 results in all 77 nodes", "0 matches for ACC-365386".

> Zero matches. Is my account not loaded, or did it strip something? ... "all 77 nodes". Seventy-
> seven? Our March file alone is thousands of accounts. OK so I have the wrong thing open. At
> least it told me how many it looked through -- that's how I worked out it's the wrong file.
> It didn't say "wrong file", though. An L1 would sit there retyping the number.

> Good that it didn't offer me a "closest match". A near-miss account number is a different
> customer. If it had suggested ACC-365388 I'd have stopped trusting it.

She switches (in her head) to the March transfers file, the only account data in the mock.

## 3. The transfers file -- where are the accounts?

**Inspector state 11.** "Transfers, March 2026", 3,000 nodes, a grey honeycomb, "Accounts as
density", 7,495 selected, table below with ACC-393859, merchant, US, degree 907, riskScore 0.

> That's a heat map, not a link chart. Where are the lines? I can't see who paid who in a
> honeycomb. The table's useful -- account ids, merchant, country -- that I understand. "degree
> 907" I don't. Riskscore 0 on the top merchant, fine, no reason given, so I ignore it.

> "Mule ring, fixed, 14" on the left. Someone already built a ring. "flagged 13 of 14". Which one
> isn't flagged? That's the one I'd look at.

She pastes both account numbers into Find, one after the other (she does not know it takes a
list).

**Past the drawing limit (Find state 7, patent data).** Three hits, the inspector says "Not
drawn: the graph is past the drawing limit. Counted everywhere." and Path and Note are off.

> Hang on. "Not drawn." And the path thing is greyed out "because they act on drawn nodes"? --
> no, that's the pink designer note, I can't see that in the real thing. What I see is the
> button greyed and a line saying it isn't drawn. So on a big file I can find my account but I
> can't ask how it connects? That is the question. That's the only question.

> There's "Narrow the graph..." in the bottom corner. I suppose I'd have to filter down to
> something small first. How do I know what to filter to when the whole point is I don't know
> what's between them yet?

## 4. Two accounts selected -- "Paths between..."

Back on the protein states, which are drawn. She reads state 6: two nodes selected, TP53 and
SMAD3.

> OK, how did she get two selected? Shift-click I assume. From Find I don't know -- can I click
> both results? Ctrl-click? It doesn't say. I'd try Shift-click in the list.

**Inspector with two selected.** "2 selected", a full-width button "Paths between...", and a
panel "Paths between" with From TP53, To SMAD3, a swap arrow, "Weight by: None: count hops",
"Every shortest path is found and drawn together", Run.

> "Paths between". Yes. That is literally my question, and it's a button with words on it, not an
> icon. Good. From and To already filled in. Good.

> "On: full graph, 300 nodes. Undirected." Undirected. So it doesn't care who sent money to who?
> If A paid B and C paid B, it'll tell me A is connected to C "in 2 hops". That's not a flow of
> funds, that's two people who both paid the same landlord. I need it to follow the money in the
> direction it went. And I'd want to choose: money only, or money plus shared phone and device.
> Those are different questions and I'd write them up differently.

> "Weight by: None: count hops." Fine, hops is what I want to start with. I wouldn't touch
> weight -- weight by amount? What does that even mean for a path, bigger transfers are
> "shorter"? I'd leave it.

> "Shortest" also bothers me. The shortest route isn't the one that matters. The one that
> matters is the one where the money moved in order: in on Tuesday, out on Wednesday. A path
> that goes backwards in time isn't a path.

She presses Run.

## 5. The found path

**Inspector state 9.** "Found path, 3 hops, 1 of 12", From "Shortest path run", then a list:
TP53, confidence 0.82, MSH2, confidence 0.53, UBB, confidence 0.82, SMAD3. Chevrons on the drawn
path, a start and end badge.

> "3 hops." Said in plain words. Good. And a list, top to bottom, start to end, with something
> on each link. I'd need amount and date where it says "confidence". If it shows "$9,800, 12
> March" on each link, that is exactly the chain I write in the narrative. I'm guessing it would
> -- this screen doesn't show me money.

> "1 of 12." Twelve equally short routes. So which one is the real one? I'd page through all
> twelve with those little arrows? For a ring that'd be forty. I want them all at once, as a
> list I can paste, with the accounts they go through counted -- "7 of 12 routes go through
> account X" -- that's my hub.

> "Create path" -- keeps it. OK. Would I remember to press that? The note says it's gone at the
> next run otherwise. That's the sort of thing I'd lose at 5 pm and then redo in the morning.

**Kept path (state 10).** It becomes "TP53 to SMAD3 path" in Sets and paths.

> Right, it's in the list on the left now, named after both ends. Fine. That's how I'd find it
> tomorrow.

## 6. Getting it out

She goes to Export at the foot of the inspector: a copy icon and a plus.

> Copy -- copies what? The list? The picture? I'd click it and paste into Word to find out. If it
> pastes the account list with amounts and dates, fine. If it pastes a picture only, I still have
> to rebuild the table in Excel. "Export files..." up top, probably the picture and CSV. I'd need
> both before I'd put this anywhere near a case file.

---

## After the task

**Single Ease Question: 3 of 7.**

> On a small file, once I'd found both accounts, "Paths between" was one button and it gave me
> a hop count in words. That part was quick. Getting to two selected accounts from the search
> wasn't obvious, and on a file the size of ours it greys out the one thing I came for. And it
> treats money as if it goes both ways.

**Would she use it instead of her current tool?**

> Not yet. Today I'd do this in Excel: filter the statement for the first account, look at the
> counterparties, VLOOKUP them against the second account's statement, go round again. It's
> slow, but I trust every row. i2 would draw it if I could be bothered with the import.
> This would beat both if it did three things: follow the direction of the money, put amount and
> date on every link in that list, and work on the real file, not a filtered-down one. The "Paths
> between" button is the right idea. Right now it's answering "are these two in the same
> network", and I need "did the money get from here to there, and when".

## Workarounds she said she would need

- Filter the file down before she can ask for a path at all, without knowing what to filter to.
- Page through twelve equal routes one by one, writing down which accounts recur.
- Copy the walk list into Excel to add amounts and dates, if the list does not carry them.
- Check each route's dates by hand to throw out routes that run backwards in time.
