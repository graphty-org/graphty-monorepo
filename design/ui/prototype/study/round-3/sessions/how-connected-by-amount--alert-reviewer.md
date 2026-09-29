# Session: how two accounts are connected, weighted by amount -- Nadia, level-1 alert reviewer

Simulated think-aloud session. The participant is the composite persona in
`study/personas/alert-reviewer.md`: a transaction monitoring analyst fourteen months in, no graph
tools, measured on minutes per alert and on what QA accepts in the alert file.

**Task as read by the moderator:** "Starting from two selected accounts, find how they are
connected, weighted by amount, and get the transfers with amounts and dates out."

**Screens used, in order:** the inspector mock (two nodes selected, Paths between...), the sets and
paths mock (path tool, found path, what amount means), the bottom dock table mock (a path's hops as
rows, Export table as CSV...).

Renders looked at: `shots/r3-dana-howconn-inspector-two.png`, `shots/r3-dana-howconn-inspector-path.png`,
`shots/sets-and-paths-s3.png`, `shots/sets-and-paths-s4.png`, `shots/sets-and-paths-s5.png`,
`shots/r3-nadia-howconn-sp-s1.png`, `shots/r3-nadia-howconn-table-out.png`.

---

## Transcript

**1. The first screen (inspector, two selected).**

> "OK, two selected. It says '2 selected' up on the right. ... These aren't accounts though. TP53,
> SMAD3 -- what is this, 'Human protein interactions'? Is this the right file? I thought you said
> accounts."

Moderator: "Pretend they are the two accounts."

> "Fine. So I've got two things selected and there's a button, 'Paths between...'. That's the only
> thing that sounds like 'how are they connected', so I click that."

The popover opens: From TP53, To SMAD3, Weight by "None: count hops", Run.

> "From, To, good, it filled them in. I didn't have to copy the numbers across, which -- honestly,
> that's half my day. 'Weight by: None: count hops.' You asked for weighted by amount. I open the
> dropdown... there's nothing about amount here because it's proteins. So I can't do the amount part
> on this screen. I'd run it as is and see."

She picks Run and looks at the found-path render.

> "'Found path, 3 hops, 1 of 12.' Twelve? Twelve what -- twelve paths? One of twelve and it's
> showing me one. And 'edge confidence 0.82', 'log2FoldChange'... none of this is mine. 'The path
> counts hops; edge confidence is shown, not used.' OK so it tells me it didn't weight. I'd have
> missed that if I wasn't reading slowly. Let me go to the one with money in it."

**2. Sets and paths, the March transfers.**

> "Right, this is more like it. ACC numbers, 'Flagged', 'High risk', 'Paid ACC-893168'. That's a
> scenario name basically."

She looks at the path tool bar (state 3).

> "So here it's a different thing -- a bar along the bottom, From, To, Scope, Weight. On the other
> screen it was a popup from the right side. Is this the same button? I'd expect the same button.
> ... 'Weight: amount (unknown role)'. Unknown role? What role? It's the amount. It's dollars. I
> don't know what a role is. And there's a yellow warning: 'From is outside the filtered graph. Set
> Scope to Full graph to search it.' OK, at least it tells me what to click. I'd set Scope to Full
> graph. Did that change the filter for everything, or just this search? I don't know. I'd hope just
> the search."

She moves to the found path (state 4).

> "'Found path (unweighted).' I picked amount! It says Weight 'amount (unknown role)' and then right
> under it 'Paths ignore amount: hops were counted, not dollars.' So picking amount did nothing. That
> is -- if I'd screenshotted this into the file, QA would read 'weighted by amount' in my rationale
> and the tool says it wasn't. That's a finding against me."

> "The path itself -- 271813 to 946224 to 242954 to 233575. Three transfers, $3,530, $9,782,
> $9,616. Under ten thousand, twice. OK, that's the pattern I'd actually care about, just-under-ten.
> Good, the amounts are right there in the table at the bottom. But no dates. I need dates."

> "'Ties: 1 of 2 as short.' So there's another path it's not showing me. Which one's the real one?
> They're both real, I guess. I'd want both."

She clicks the Weight row (state 5, "amount: what it means").

> "'Applies to every result that reads amount.' Every result? I just want this one search. 'A bigger
> amount means: similarity: larger = closer.' ... 'Read as a distance by 1/w, so a path prefers big
> transfers.' I don't do one over w. I'd guess this is the one I want because big transfers are what
> I'm looking at -- the under-ten ones. So I'd leave it on 'larger = closer'. But I'm not sure that's
> what 'weighted by amount' means. Honestly if a tool asks me a maths question I escalate."

> "And then -- it doesn't show me what happened after. Does the path change? Does it say
> '(weighted)' now? I'm looking at the same picture. I can't tell I did anything."

Moderator: "What would you do next?"

> "Get the transfers out. There's 'Export files...' in blue at the top right, that's what I'd click
> first, it's the big button."

Reading the prototype: the table mock says Export files... no longer offers tables.

> "So that doesn't give me the table? Then where. ... Oh, down on the table there's 'Export table as
> CSV...' on the right. OK. That's two exports, and the big blue one is the wrong one for me."

**3. The table, a path's hops as rows.**

She looks at the "3 hops" state in the rows-out render.

> "Now this is what I want. 'Selected: 5 edges on 2 paths.' from_account, to_account, timestamp,
> hop, amount. Dates! 2026-03-04 18:23 ... 2026-03-09 10:57. And it put both paths in. 'on paths:
> 2 of 2' on the first row, '1 of 2' on the rest -- I think that means the first transfer is on both
> paths. Took me a second."

> "How did I get here though? It says I clicked '3 hops' on a path row in Sets and paths. I wouldn't
> have clicked a hop count. I'd have looked at the table under the path. And on the found-path screen
> the table didn't have dates, it had step, source, target, amount. So depending how I get here the
> dates are there or not? That's the bit that worries me."

> "The CSV: from_account, to_account, timestamp (UTC), amount (USD). UTC -- our case system is local
> time, so I'd have to say that in the note. But it says UTC, so at least I'd know. That goes in the
> file fine. Then I'd want one picture of the path for the file and I'd put it next to it."

**4. Wrap-up.**

> "I got the transfers out, with dates. I did not get it weighted by amount, or if I did, nothing on
> the screen told me. If QA asks 'did you weight by amount' I can't say yes."

---

## Single Ease Question

**3 of 7.**

> "Finding the path and getting rows out was OK once I found the table. The amount part I couldn't
> do, or couldn't tell if I did."

## Would she use this instead of her current tool?

> "Not for clearing. For clearing I don't need a picture, I need the one transfer and the customer.
> For the ones I'm going to escalate, maybe -- the table with both paths and the dates is better than
> me building it in a spreadsheet, and Sarah would get a cleaner file. But it has to be the same
> button every time, it has to say in plain words that it used the amounts, and the dates have to
> be there without me hunting. If it takes longer than the case system I go back to the case system.
> It's day twenty-nine somewhere, always."

---

## What went wrong, for the designers

1. **Choosing amount as the weight has no visible effect.** The path tool offers "amount (unknown
   role)", and the found path still says "(unweighted)" and "hops were counted, not dollars". After
   she answers "what amount means", nothing shows the path was re-run or that it is now weighted.
   She could not tell whether the task was done. Severity 4.
2. **"What amount means" asks a maths question.** "similarity: larger = closer", "a distance by
   1/w", "applies to every result that reads amount". She guessed, and was not sure whether she
   changed the data or one search. Severity 3.
3. **Two different path controls.** The inspector's Paths between... opens a popover with "Weight
   by: None: count hops"; the toolbar path tool is a bar with "Weight: amount (unknown role)".
   Different labels and different defaults for the same job. Severity 2.
4. **Dates missing from the found path's table.** The found-path table (step, source, target,
   amount) has no date; the dates appear only in the rows opened from the "3 hops" count, which she
   would not have clicked. Severity 3.
5. **The prominent Export files... button is the wrong one for rows.** She reached for it first;
   the table's own Export table as CSV... is the route. Severity 2.
6. **"1 of 12", "Ties: 1 of 2 as short", "on paths 2 of 2".** Three ways of counting paths; she
   worked out the last one, not the first. Severity 2.
7. **Scope warning.** "From is outside the filtered graph" was clear and told her what to press,
   but she did not know whether Full graph changed the filter for everything. Severity 1.

## What worked

- From and To were filled in from the selection: no copying account numbers.
- The rows-out table: both equal paths, time right after the accounts, amounts, CSV with zone and
  currency in the headers -- "that goes in the file fine".
- The found path spelled out, in words, that amount was not used, even though that exposed the gap.
