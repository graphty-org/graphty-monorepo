# Session: did the ring really change, or did the tool just group it differently? -- Sarah, fraud investigator

**Participant.** Sarah, a complex-case financial crime investigator at a mid-size bank
(persona: study/personas/fraud-analyst.md). Eight years in; lives in Excel pivots, uses i2 a few
times a year. Reads numbers, dates and IDs closely; skims prose and legends.

**Task, as the moderator gave it.** "April's transfers replaced March's in your case project, and
the ring's group looks different now. Tell me whether the accounts really changed, or whether it
only came out differently this time."

**Mode.** Not mandated. Her own initiative, but it is her own open case, so she stays with it
past the first few minutes.

**Screens seen, in order** (study view, design notes hidden): the Louvain result's Compare with...
picker; the comparison surface, March against April, with Community 33 selected; the follow-up
on the 7 new accounts and their transfers; the Data panel's Versions list with What changed open;
the PageRank comparison between the same two months, for how a saved comparison ends.
Renders: shots/record/r6-sarah-rcn-compare-pick.png, shots/record/r6-sarah-rcn-compare.png,
shots/record/r6-sarah-rcn-compare-tall.png (the same state, taller, down to the lost groups),
shots/record/r6-sarah-rcn-followup.png, shots/record/screens__version-history-study.png,
shots/record/screens__comparison-versions--study.png.

---

## Think-aloud

### 1. Where do I even ask this?

> The question is "did the ring change". So first I look for my ring. Legend on the canvas:
> "Community 1, 2, 3, 5, 4, 7, 6, Other, 58 communities." My ring isn't in the top seven, it's
> in "Other". Under that: "19 carried on from March's 8 to 35, 39 new." I read that three times.
> Nineteen what carried on from March's eight? Oh -- groups 8 to 35 from March, nineteen of them
> kept their names. Fine. That's a line for a statistician, not for me.

> Left panel, Results: Degree, Louvain communities "65 groups", Modularity. March had 35 groups,
> I remember. Now 65. So either the ring blew apart or the thing is making it up. That's exactly
> my question.

> I'd normally right-click the Louvain row. There's a little two-arrows icon on the right end of
> the highlighted row. I hover it... it opens "Compare Louvain communities with". OK. I wouldn't
> have known that icon means compare if it hadn't been the only thing on the row. I'd have tried
> right-click first, and I'm told that's there too.

### 2. The picker

> "Earlier runs: March data, Apr 3 -- 35." Good, that's the one. First in the list, highlighted.
> Then "Partitions on April data: Weakly connected components 27, kind (attribute) 3." I don't
> know what a partition is and I'm not comparing my ring to an attribute. Ignoring those.

> Footnote: "Both runs keep the 5 seeded re-runs made with them (seeds 12 to 16); the comparison
> reads those and runs nothing." Seeds 12 to 16 means nothing to me. "Runs nothing" -- good, it's
> not going to sit there for twenty minutes. I pick March.

> Hang on -- Apr 3. In the Data panel the March version says Apr 2. Which is it? The run was the
> 3rd and the data loaded the 2nd, maybe. If I'm writing "as of" dates in a case file I need to
> know which date is which. Nobody labels it.

### 3. The comparison surface -- the top of the right panel

> Two pictures side by side, March and April, with black rings on things. Hairball times two.
> I'm not reading dots. Going to the numbers on the right.

> "35 groups in March, 65 in April: 39 new, 9 lost." Then: "26 of the new groups are single
> accounts with no April transfers." OK, that's useful straight away. Twenty-six of the thirty new
> "groups" are accounts that went quiet in April -- dormant, closed, whatever. A one-account group
> isn't a group. So most of the jump from 35 to 65 is dead accounts, not new rings. I could have
> found that in a pivot -- accounts with zero April rows -- but it's nice it says so up front.

### 4. "Agreement"

> "3 in 10 pairs of accounts that shared a group in March still share one in April, on the 2,961
> accounts in both." Three in ten. That sounds like everything moved.

> "without the 26 silent in April: 3 in 10." So the dead accounts aren't what's doing it.

> "two runs on March's data: 6 in 10." ...Wait. Two runs on the SAME March data only agree six in
> ten? So if I'd pressed the button twice in March, four in ten of my pairs would have landed in
> different groups? Nobody told me that in March. I built a watchlist off this.

> "two runs on April's data: 7 to 8 in 10."

> So -- let me get this right, because this is the whole question. The tool, on the same data,
> agrees with itself six to eight in ten. March against April agrees three in ten. Three is well
> below six. So more moved between the months than the tool wobbles on its own. That's "really
> changed", for the overall grouping. I got there. But I had to line up three rows and do it
> myself. There is no line that says "this is bigger than the tool's own noise" or "this is
> within it". The comparison I actually needed is between two numbers, and the screen hands me
> both and leaves the sentence to me. My L1s would read "3 in 10" and write "network restructured"
> in the case notes without ever looking at the next row.

> And honestly the six-in-ten bothers me more than it helps. If the grouping itself is that
> loose, I'm not putting "Louvain community" in a SAR. An examiner asks "why is this account in
> the ring" and my answer is "the algorithm put it there four times out of five"? No.

### 5. Community 33 -- my ring

> The table under the pictures: "Grew", sorted by change. Community 33 is highlighted: March 22,
> April 32, change +10, +45%, new 7, "holds in April's re-runs 1.00". And on the right:
> "Community 33. March to April 22 to 32. new in April 7. Watchlist members in it 7 of 9. holds in
> April's 5 re-runs 1.00."

> Watchlist 7 of 9 -- that's how I know it's my ring. Good, it ties to my set. I'd rather it said
> "your watchlist" up top so I didn't have to hunt the row, but fine.

> "holds in April's 5 re-runs 1.00." I take that to mean: run it five times on April and these
> 32 always end up together. That's the number that matters for the ring, more than the 3 in 10
> for the whole graph. So the ring itself isn't the tool being random -- in April. What about
> March? Did the 22 hold in March's re-runs? It doesn't say. If March's 22 was a loose group
> that happened to come out that way, then "22 to 32" is comparing a real thing to a fluke.
> I want the same number for the March side.

> Now the arithmetic, because I always do it. 32 in April, 7 of them brand-new accounts. That
> leaves 25 that existed in March. But only 22 were in the group in March. So at least 3 came in
> from other March groups -- and I don't know if any of the 22 left. Could be 25 joined and 15
> left, could be 3 joined and none left. That's the actual answer to "did the accounts change",
> and it isn't on the screen. I want four numbers: stayed, left, joined from other groups, new
> accounts. I'd get that from two exports and a VLOOKUP in Excel in ten minutes.

> The canvas: "Only on one side -- only in March 39, only in April 132, in both: unmarked." The
> half-rings. I can't tell a left half-ring from a right half-ring at this size, and I'm certainly
> not going to in grayscale on a printout. I'm ignoring the pictures. At least it's a shape and
> not just a color.

### 6. The 7 new accounts

> I select the 7 new accounts and go to the table, Edges. "Selected: 7 nodes. 26 edges with an end
> in it. Sorted by amount." Top rows: $9,889.06, $9,834.51, $9,833.55, $9,813.95... personal
> accounts into ACC-893168, a merchant, and into other personal accounts. Sum $228,362.79.

> That's it. That's the answer, and it's not a statistics answer. Seven new accounts, each moving
> just under ten thousand at a time into the same merchant. That's structuring into a cash-out
> point. Those accounts really joined the ring -- because of what they DO, not because of what
> the grouping says. I'd have found this faster by filtering April transfers to ACC-893168 in
> Excel, but I didn't know to look there until the comparison pointed me at the 7.

> Inspector: "transfers in 12, $112,916.36; transfers out 14, $115,446.43." In roughly equals out.
> Pass-through. Good -- and those are numbers I can trace to rows.

> "Louvain, March and April: only in April." That attribute line is fine. I'd rename it but I
> understand it.

### 7. Keeping it

> Top right: "Save comparison" outlined, "Done" solid blue. Solid blue is the button you press
> when you're finished. I'd press Done. I'm told Done keeps nothing. So the normal "I'm finished"
> button throws away the thing I just worked out, and the quiet one saves it? That's backwards.
> And the PageRank comparison screen has it the other way round -- "Save comparison" is the blue
> one there. Pick one.

> No Export on this surface that I can see. There's a "..." over the table; maybe it's in there.
> For the case file I need a picture of Community 33 before and after and a CSV of the 32 with
> "new / stayed / joined". Without that I'm screenshotting and cropping.

### 8. Checking the Data panel

> I go to Data, Versions, to see what it thinks changed. "April data current, May 4." May 4?
> The status panel on the other screen said the April files were imported "Today 09:14". And the
> project is called "Payments network review" here, not "Case 0314". Maybe that's just the mock.
> Moving on.

> "65 communities (was 35) -- ! large change." A yellow warning. "26 are single accounts with no
> transfers in this version." So this panel flags it as a large change, full stop -- and it's the
> same kind of number the comparison just told me is partly the tool's own wobble. If I only ever
> looked here I'd take the yellow badge at face value. The re-run agreement isn't here at all.
> There is a "Compare with..." at the bottom, which is where I'd have gone if I'd started here.

---

## Her answer to the moderator

> "Both. The overall grouping moved more than the tool moves on its own -- three in ten across
> the months against six to eight in ten run to run -- and a lot of the jump from 35 to 65 groups
> is 26 accounts that went quiet in April. For my ring: it went from 22 to 32 accounts, 7 of them
> brand-new, and in April it comes out the same in every re-run, so it's not a fluke this month.
> The 7 new ones are real: they're moving just under ten grand at a time into ACC-893168, about
> $228k between them. What I can't tell you is how many of March's 22 left, or whether the March
> group was solid in the first place -- the screen doesn't give me either. And I'd put the
> transfers in the SAR, not the community number."

Confidence: "Fairly sure on the 7 accounts, because I read their transfers. Medium on 'the
grouping really changed', because I had to work out the noise comparison myself and nothing
checked my reading."

---

## Single Ease Question

**4 of 7.** "I found it and I got an answer. But the answer to 'real or noise' was two rows I had
to put side by side myself, the ring's own before-and-after was missing who left, and the button
I'd press at the end throws it away. Middle of the road."

## Would she use it instead of her current tool?

> "Not instead of. Alongside, if IT approved it. The who's-new, who-left part I do in Excel with
> two exports and a lookup, and I'd still do that, because the reviewer reads Excel. What Excel
> can't tell me is whether the tool's grouping is stable -- and the re-run numbers are genuinely
> new to me; I've never had that in i2. But the main thing it did for me was point me at seven
> accounts, and then the evidence was plain transfers. If it gave me stayed / left / joined / new
> for my ring and a CSV of it, it'd save me the lookup. Right now it saves me knowing where to
> look, which on this case was worth maybe an hour."

---

## Problems observed

1. **No verdict sentence for real-versus-noise.** The comparison shows the cross-month agreement
   (3 in 10) and the run-to-run agreement (6 in 10, 7 to 8 in 10) on separate rows with no
   statement of which is larger or what that means. She reached the right reading by lining them
   up herself and said a less careful reader would stop at "3 in 10". Severity 3.
   Quote: "The comparison I actually needed is between two numbers, and the screen hands me both
   and leaves the sentence to me."
2. **The ring's membership change is not broken down.** Community 33 shows 22 to 32 and 7 new,
   but not how many of March's 22 stayed, how many left, and how many joined from other groups;
   the numbers given do not reconcile on their own (25 accounts existed in March, 22 were in the
   group). This is the literal question she was asked. Severity 3.
   Quote: "I want four numbers: stayed, left, joined from other groups, new accounts."
3. **Stability shown for April only.** "holds in April's 5 re-runs 1.00" has no March
   counterpart, so she cannot tell whether the March group she is comparing against was itself
   stable. Severity 2.
   Quote: "If March's 22 was a loose group that happened to come out that way, then '22 to 32' is
   comparing a real thing to a fluke."
4. **Done is the primary button and discards the comparison.** She would press the solid blue
   Done to finish and lose the work; the PageRank comparison screen makes Save comparison the
   primary instead, so the two comparison surfaces disagree. Severity 3.
   Quote: "So the normal 'I'm finished' button throws away the thing I just worked out."
5. **The run-to-run figure undermines trust in the earlier work.** Learning that two runs on
   March's data agree only 6 in 10 made her doubt the watchlist she built in March and ruled out
   citing the grouping in a SAR. The information is correct and valuable, but it arrives with no
   guidance on what it means for a group she already acted on. Severity 2.
   Quote: "Nobody told me that in March. I built a watchlist off this."
6. **The Versions panel's "large change" badge ignores run-to-run noise.** "65 communities (was
   35) -- large change" is flagged as a data change with no mention that the grouping also
   varies on the same data; a reader who stops there reads it as real change. Severity 2.
   Quote: "If I only ever looked here I'd take the yellow badge at face value."
7. **The compare entry point is an unlabelled icon on the result row.** She found it only because
   it was the one icon on the highlighted row; she would have tried right-click first.
   Severity 1.
8. **Dates and names disagree across screens.** The March run is "Apr 3" in the picker and the
   March version "Apr 2" in Versions; April data is "May 4" in Versions and "Today 09:14" in the
   status panel; the project is "Case 0314" in one place and "Payments network review" in the
   other. She reads dates for the case file and noticed each one. Severity 2.
   Quote: "If I'm writing 'as of' dates in a case file I need to know which date is which."
9. **Half-rings for "only in March / only in April" are unreadable at canvas size and in
   grayscale.** She ignored both pictures and worked from the tables. Severity 1.
10. **No visible export from the comparison.** She wanted a before-and-after picture of the ring
    and a CSV of its members with their status for the case file; she saw neither (the table's
    "..." menu was not explored). Severity 2.
11. **Legend line "19 carried on from March's 8 to 35, 39 new" is hard to parse.** Took three
    reads. Severity 1.

## What worked for her

- "26 of the new groups are single accounts with no April transfers" answered half the jump
  from 35 to 65 in one line, in her terms.
- The run-to-run agreement is information she has never had in any tool, and once decoded it let
  her answer the question for the whole grouping.
- "Watchlist members in it: 7 of 9" tied the abstract group to her own set of accounts.
- "holds in April's 5 re-runs 1.00" was the single number she trusted for the ring itself.
- Selecting the 7 new accounts and reading their transfers, amounts and sum, gave her the
  evidence she would actually cite: just-under-$10k transfers into one merchant.
- The picker put the March run first and said it would run nothing new.

## Note outside the session

The flow page for this task (flows/compare-versions.html) still describes the agreement as
"AMI 0.45 against 0.76" and its route as "differ more than re-runs do?", while the screen now
shows "3 in 10 / 6 in 10 / 7 to 8 in 10" and has no such decision on it. The flow and the screen
disagree on both the numbers and whether the verdict is stated.
