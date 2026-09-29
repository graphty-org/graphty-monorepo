# Session: trace dated money from the flagged account -- Sarah, fraud investigator

Participant: Sarah, level-2 financial crime investigator (persona: ../../personas/fraud-analyst.md).
Mode: moderated, not mandated. She keeps going because the moderator asked, not because her
manager bought the tool.

Task as given by the moderator: "Trace money that moved during March 2026 from the flagged
account and tell whether the route could really have happened in that order."

Screens, in the order she met them: the filter chip screen, the sets and paths screen, the
bottom table screen. What she saw is in the renders listed at the end.

## Transcript

**Filter chip screen, top.**

> "Les Miserables. Valjean, Fantine, Javert. OK, somebody loaded a novel. Where's my case?
> The task says March 2026 and a flagged account, and this is 77 characters from a book.
> Degree greater than or equal to 2, degree greater than or equal to 5, filter out group 8 --
> I don't know what degree is in this sense and I don't care. Nothing on this screen is money."

She looks for a search box to paste an account number. The only magnifier is next to
"Graphs", which searches graphs, not accounts. She does not click it.

> "No search for an account. OK. I'm scrolling, because the top of this is a toy."

**Filter chip screen, below the fold: the time window.**

> "There. 'The March transfers, 3,000 accounts, 9,113 transfers.' That's my data. A slider
> that says Mar 8 to Mar 14, a bar chart of transfers per day, and a date rule. Fine -- that's
> a date filter. The date rule is the one I'd use: timestamp, between, two dates. I'd type
> Mar 1 and Mar 31."

She reads the result line under the date rule: "took out 1,148, 1,852 left" and "keeps only
the 2,065 transfers in the window and the accounts that sent or received one."

> "That's the part I actually like: it tells me what it threw away in accounts AND in
> transfers. I can write that in the file. But hang on -- the file is only March. The histogram
> runs Mar 1 to Mar 31. So 'March 2026' is the whole file and the filter does nothing. I'd
> have spent two minutes making a step that changes nothing, and I only know that because I
> read the axis."

> "And if I'd left their default week on, Mar 8 to Mar 14, I'd lose everything before the 8th.
> Does it warn me that a route I'm tracing starts outside the window? I'll find out."

She does not touch the chip-width section or the "counting" section. "That's for the
developers."

Time so far: about four minutes, and she has not seen an account yet.

**Sets and paths screen, first state.**

> "Now we're talking. March transfers, 3,000 nodes -- accounts. Flagged, rule, 14. High risk,
> 143. 'Paid ACC-893168', 37. Legend: flagged true 14, false 2,986."

> "Which flagged account? The task says 'the flagged account'. There are fourteen. The table
> is sorted by risk score and the top one is ACC-233575, 98, flagged true. I'll take that one
> -- the reviewer would ask me why, and my answer is 'it was on top', which is not a great
> answer."

The canvas: a grey honeycomb with rings on it.

> "That's a hairball in a hexagon costume. I can't read a single transfer off that. I'm going
> to the table."

She looks for a way to say "start here and follow the money out". The inspector for the
"Paid ACC-893168" set says "Neighbors of ACC-893168, Follow: In". She reads it twice.

> "Follow In. So there's an In. Is there an Out? I'd guess yes, but I can't see where I'd set
> it for my account. There's no 'where did the money go from here' button. In i2 I'd expand
> the node outbound, one hop at a time."

**Sets and paths screen, path tool.**

She clicks the third tab, "Path tool". From: ACC-271813, To: ACC-233575.

> "Right, a from-and-to. So I have to already know where the money ENDS to ask where it went?
> That's backwards. I'm tracing it because I don't know where it went."

The yellow warning: "From is outside the filtered graph. Set Scope to Full graph to search it."

> "At least it tells me instead of silently finding nothing. Fine. Full graph."

She notices the direction.

> "Wait. From 271813 TO 233575. 233575 is my flagged account. This is money going INTO the
> flagged account. The moderator said FROM the flagged account. The tool gave me the only
> example it had, and it's the wrong way round."

**Found path.**

She reads the inspector: "Found path (unweighted), 3 hops. Query: shortest path. Weight: amount
(unknown role). Paths ignore amount: hops were counted, not dollars. Direction: follows
transfers. Ties: 1 of 2 as short."

> "'Hops were counted, not dollars.' Honest, at least. 'Follows transfers' -- good, it respects
> direction, sender to receiver. 'One of two as short' -- so there's another route it's not
> showing me here."

She reads the table under the canvas: step 1 ACC-271813 to ACC-946224, $3,530.28; step 2
ACC-946224 to ACC-242954, $9,782.05; step 3 ACC-242954 to ACC-233575, $9,616.72.

> "Where are the dates? The whole question is whether this happened in that order, and the
> path table has step, source, target, amount -- and no timestamp. The step number is the order
> of the hops on the picture, not the order in time. Those are two different things and the
> table makes them look like one."

> "Also look at the money. $3,530 goes into 946224 and $9,782 comes out. That's not the same
> money. Either 946224 had six grand sitting there or something else came in. A shortest path
> doesn't know that. It just joined dots."

She glances at state 5, "What amount means", with "similarity: larger = closer".

> "Similarity? It's dollars. I'm not choosing whether a bigger amount is 'closer'. Close."

**Bottom table screen.**

She scrolls to the edge lists. The Edges tab for the full graph has from_account, to_account,
timestamp, amount.

> "OK, this is what I wanted: the time right after the two accounts. And the CSV has it too --
> from_account, to_account, timestamp UTC, amount USD. That I can pivot."

She finds the table opened from "3 hops, on a path row": Selected: 5 edges on 2 paths.

| from | to | time (UTC) | hop | amount | on paths |
|---|---|---|---|---|---|
| ACC-271813 | ACC-946224 | 2026-03-04 18:23 | 1 | 3,530.28 | 2 of 2 |
| ACC-946224 | ACC-242954 | 2026-03-07 13:27 | 2 | 9,782.05 | 1 of 2 |
| ACC-946224 | ACC-670564 | 2026-03-07 00:11 | 2 | 9,468.23 | 1 of 2 |
| ACC-242954 | ACC-233575 | 2026-03-08 20:29 | 3 | 9,616.72 | 1 of 2 |
| ACC-670564 | ACC-233575 | 2026-03-09 10:57 | 3 | 9,399.31 | 1 of 2 |

She reads the dates down the column, one route at a time, with a finger on the screen.

> "Route one: the 4th, then the 7th at 13:27, then the 8th at 20:29. In order. Route two: the
> 4th, the 7th just after midnight, the 9th. Also in order. So yes -- both routes could have
> happened in that order. But I worked that out. The tool didn't tell me. If hop 3 had been on
> the 5th I'd have had to spot it myself, and on a ten-hop route at five in the afternoon I
> wouldn't."

> "And the two routes are mixed in one table. Hop 2 of route one and hop 2 of route two sit
> next to each other. I'd have to split them by hand to write it up."

> "What I'd write: 3,530 in on the 4th, then 946224 sends out about 19,250 across two
> transfers on the 7th, and both legs land in 233575 by the 9th -- about 19,016. That's fan
> out and fan back in, within five days. That's a real pattern. The tool showed me the dots;
> the story is mine, and the gap -- 3,530 in versus 19,250 out -- the tool never mentioned."

> "And still: this is money INTO the flagged account. What the moderator asked -- what left
> 233575 in March and where it went -- I never got. I'd go to the Edges tab, filter
> from_account equals ACC-233575, sort by timestamp, export, and do the next hop in Excel.
> Which is what I do today."

## After the task

**Single Ease Question: 2 of 7.**

> "Two. I got a dated route out, and the dates are right next to the accounts, which is more
> than some tools manage. But I didn't get the route I was asked for, I had to check the order
> by eye, and the path finder doesn't know that money has to arrive before it leaves."

**Would she use it instead of her current tool?**

> "Not for this. For a time-ordered trace I'd still use the statement export and a pivot, and
> i2 for the chart the prosecutor sees. What would change my mind: I type the flagged account,
> say 'money out, March, three hops', and it walks forward only through transfers that happen
> after the one before -- and it tells me in words '3 hops, $9,616 of $9,782 moved on within
> 31 hours', and flags any hop that goes backwards in time. Plus that table, split by route,
> exported. Then I'd use it on the big cases. Right now it's a nice table with a hairball on
> top."

## Workarounds she named

- Read the axis to learn the whole file is March, so the March filter was pointless.
- Picked "the flagged account" by taking the top row of a table sorted by risk score.
- Checked chronological order by reading the timestamp column hop by hop, by eye.
- Split the two equal routes apart by hand.
- Worked out the in-versus-out gap at the middle account in her head.
- Would do the outbound trace from the flagged account as a filtered Edges export in Excel.

## Renders she saw

- ../../../shots/r3-dated-trace-fraud--filter-chip-full.png (the filter chip screen with the time window below it)
- ../../../shots/screens__sets-and-paths.png, sets-and-paths-s3.png, sets-and-paths-s4.png, sets-and-paths-s5.png
- ../../../shots/r3-dated-trace-fraud--table-dock-edges.png (the path's hops as dated rows, and the Edges tab)
