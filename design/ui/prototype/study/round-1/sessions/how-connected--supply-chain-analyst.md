# How is this account connected to that one? -- supply chain risk analyst

Participant: Dana Okafor (composite persona: supply chain risk analyst, Excel and Power BI, not a
network scientist). Moderator task, given with nothing else: "How is this account connected to
that one?"

Screens used: the inspector mock (screens/inspector.html, renders shots/screens__inspector.png,
shots/record/inspector-path.png, shots/record/inspector-cap.png) and the Find mock (screens/find.html, renders
shots/screens__find.png, shots/record/find--s8a.png, shots/record/find--s9a.png).

Outcome: failure. She could not start a "how are these two connected" question herself. When
shown the finished path in the inspector she could read it, mostly, but did not trust or
understand several of its words.

## Transcript (think-aloud)

**1. First screen, the inspector page.**

> "OK. There's a big grey paragraph at the top. I'm not reading that. ... 'Human protein
> interactions'? TP53? This is biology. Which account am I supposed to be looking at? In my
> world an account is a vendor account in SAP -- a supplier number."

She scrolls. Stops at the hairball in the middle.

> "Nice hairball. Right side says TP53, 'degree 3', 'betweenness 0.113, #2 of 30' -- the
> numbers are cut off on the right, I can't see the end of them. Betweenness I've heard of, that's
> the chokepoint score. Fine. But nothing here says 'connected to'."

She notices the tooltip "Select neighbors, 1 hop: 33 nodes".

> "Neighbors. 1 hop. Is a hop one tier? So neighbors are the suppliers directly attached to this
> one? That's not what I asked though. I asked how A gets to B."

**2. Looking for a search box.**

> "I'd type the account name. Where's the search? Left panel: Graphs, Sets and paths, Styles,
> Views. No search box. ... Oh, 'Sets and paths'. Paths! That sounds like what I want."

She reads the rows: "DNA repair -- rule -- 30", "TP53 partners -- fixed -- 33".

> "Neither of those is a path. It's two lists. What does 'rule' mean, what does 'fixed' mean?
> There's a plus next to 'Sets and paths'. I'd probably click the plus and hope it asks me
> 'from where to where'. In this mock it doesn't do anything."

**3. The accounts screen (state 9 on the inspector page).**

> "'Transfers, March 2026', ACC-393859, merchant, US, riskScore. OK, these look like accounts.
> This is fraud, not supply chain, but fine, accounts."

She looks at the canvas: a grey blob of hexagons with an outline and "7,495 selected".

> "What is this? It's a honeycomb. I can't see any single account in there, let alone a line
> between two of them. I didn't select 7,495 things, somebody did. The table at the bottom I
> understand -- ids, kind, country, degree, riskScore. That's the part I'd use."

> "I'd click one row, ACC-393859, then control-click another one and hope the right side says
> 'these two are connected through X'. But the right side just says 'Statistics' and totals."

**4. The Find page.**

She switches to the Find mock.

> "There's the search. 'thenard' -- two results, Thenardier and Mme.Thenardier. Good, it found
> the partial spelling, I like that, our supplier names are spelled five ways. It tells me
> 'group 4, degree 11'. Right side: Thenardier, Appearance, Color -- Group color... I don't care
> about the colour. Memberships: 'In no sets'."

> "So I found account A. Now how do I say 'and account B'? I'd type the second name in the same
> box. That replaces the first one. Hm."

She looks at the icons on the right side next to Thenardier: a branching icon with a caret,
a funnel, a pin, three dots.

> "Funnel's a filter, pin I get. The branching one -- that's the 'Select neighbors' from before.
> Three dots, maybe 'find path to...' is hiding in there. I'd click it. I don't know what's in it."

**5. The toolbar at the bottom of the canvas.**

> "Arrow, a squiggle thing, a sticky note, a lightning bolt, a square. The squiggle looks like a
> route on a map, two dots and a curvy line. I'd hover. ... Nothing, no label. I don't click
> unlabeled icons on a tool that has our supplier data in it. Maybe I would here, because it's
> the only thing that looks like 'route'. If it's a route tool, why is it an icon with no word?"

The mock gives the route icon no label, no tooltip and no action.

**6. The lightning bolt (Quick actions).**

She sees the render where someone typed "who matters most" and got Degree, Betweenness,
Closeness, PageRank, Eigenvector, Katz.

> "Oh, so you can type a question. That's nice. 'Betweenness -- who sits between groups.' OK,
> that little sentence helps, I'll give you that. Katz? Eigenvector? No. I'd type 'how is A
> connected to B' or 'path'. I have no idea if it would understand. The other example typed
> 'marius' and got 'No commands match' then 'Find marius'. So I'd get sent back to search."

**7. The moderator scrolls her to the "Found path" state (inspector, state 7).**

> "Now THIS is closer. 'Found path. 3 hops. 1 of 12.' From TP53, to SMAD3. Then a list: TP53,
> MSH2, UBB, SMAD3, in order. That's the answer -- A goes through two middlemen to reach B. The
> list in order is what I'd paste into an email."

> "But how did I get here? It says 'From: Shortest path run'. I didn't run anything. What made it
> pick TP53 and SMAD3? I never saw a place to type two names."

> "'1 of 12' -- there are twelve equally short ways? Then which one is real? If I show my VP one
> and there are eleven others, he'll ask why this one. The little arrows to step through them are
> tiny."

> "'Weighted by: hops, no weight.' I don't know what that means. 'Confidence 0.82' in between
> each one -- confidence of what? That the link exists? In my data the Tier 2 links are a survey
> answer with a company name. I'd want 'source: supplier survey, 2025' there, not 0.82."

> "'Create path to style.' What? Style? I want to keep it, or export it. There's an Export row at
> the bottom with a copy icon and a plus. Copy what -- the picture? Can I get the list as a CSV?"

> "Layout: Force-directed. Is that page layout? Why is it on my answer?"

**8. Wrap-up aloud.**

> "Honestly, for my data this question mostly has one answer: supplier A is a Tier 1, B is a
> Tier 2 we got off a survey, and they're linked because A told us so. Anything more than one
> step back -- where do I get that Tier 2 data from? I have it for maybe fifteen percent of
> spend. If I have it, this path list would be useful for a 'why does the typhoon hit us' slide.
> If I don't, it's a picture of a rumour."

## Single Ease Question

**2 of 7.**

> "I couldn't do it. I found one account fine. I never found where you say 'and this other one,
> how do they connect'. When you showed me the answer screen I could mostly read it, but I'd have
> got stuck before that."

## Would she use this instead of her current tool?

> "Not for this. Today, 'how is A connected to B' for me is a VLOOKUP from the survey sheet into
> the supplier master, or I ask the risk platform, which already shows me a sub-tier map for the
> suppliers that answered. This could beat both if I could type two supplier names and get the
> chain as a table I can export to Power BI, with where each link came from. It doesn't show me
> how to start that, and I'd still need IT to tell me where my supplier list goes when I load it."

## Problems observed

1. **No visible way to ask "how are these two connected".** Neither the inspector nor Find
   offers a from/to entry. Find selects one thing at a time and a second search replaces the
   first. Severity 4.
2. **The route tool is an unlabeled icon.** It is the only candidate on screen and has no word
   and no tooltip; she avoids unlabeled icons on a tool that holds supplier data. Severity 3.
3. **"Sets and paths" promises paths but shows only lists**, with unexplained "rule" and
   "fixed", and a "+" whose outcome is not stated. Severity 2.
4. **The found path explains little about where it came from.** "From: Shortest path run", "1 of
   12", "weighted by hops, no weight", "confidence 0.82" and "Layout: Force-directed" are either
   jargon or say nothing about the business source of each link. Severity 3.
5. **"Create path to style" reads as a formatting command, not "keep this".** She wanted
   keep or export-as-table. Severity 2.
6. **Export of the path as a list is not obvious.** The Export row shows a copy icon and a plus,
   not "table / CSV". Severity 2.
7. **Right-column values are cut off at the edge** on the first inspector state (betweenness,
   pagerank, rank "of 30..."). Small grey 11px rank text is hard for her to read. Severity 2.
8. **Large selection drawn as grey hexagons with a count** tells her nothing about individual
   accounts; she fell back to the table. Severity 2.
9. **Quick actions answers "who matters most" but it is unclear it would answer a connection
   question**; a name typed there is bounced back to Find. Severity 2.

## What she liked

- Search matches a partial name ("thenard" finds both Thenardiers), which matters with supplier
  names spelled several ways.
- The one-line plain-language explanation next to each measure in Quick actions ("who sits
  between groups").
- The found path as an ordered list of members, A then middlemen then B -- that is the answer
  she would paste into an email.
- The table under the canvas; tables are where she works.
