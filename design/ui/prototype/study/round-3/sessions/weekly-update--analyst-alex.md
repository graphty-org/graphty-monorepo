# Weekly update -- Analyst Alex

**Participant:** Analyst Alex, a data analyst in operations analytics at a logistics company.
He computes his metrics in Python (NetworkX), draws the picture in Gephi, and redoes the Gephi
half by hand every time the data refreshes.

**Task, as the moderator gave it:** "This week's export arrived. Bring last week's project up to
date without losing your styles and notes, and explain why the group count changed."

**Screens used:** Replace data and apply a recipe (twelve states), then Version history (the list,
an old version opened, a project with one entry). The prototype's project is a transfers network
(accounts and transfers), not Alex's supplier data; he was told to treat it as his own.

Renders the participant saw: `shots/r3-alex-wu-01-s-menu.png` to `shots/r3-alex-wu-12-s-style-applied.png`,
and `shots/r3-alex-wu-vh-s1.png` to `shots/r3-alex-wu-vh-s3.png`.

**Outcome:** success with difficulty. He got the new file in with styles, sets and notes intact
in about five clicks. He could say WHAT changed in the groups but not WHY; the answer he gave
for "why" was his own guess, and a contradiction between two component counts made him
distrust it.

**Single Ease Question:** 4 of 7.

---

## Transcript

### 1. Finding where to put the new file

> OK. Project's open, "Mule ring review", it's last week's. New file's in my Downloads. I don't
> want Open, Open is going to give me a blank project and I lose everything -- that's exactly the
> Gephi thing. Let me look in File.

He opens the menu. Reads the list top to bottom.

> Open, Add data, Add as another graph, Join... Replace data. "1 slow result will wait for
> Re-run." OK, Replace data is literally the thing. Good, that's the word I'd have used. I don't
> know what "Join" does and I'm not touching it.

> The "slow result will wait" -- I like that it tells me before I click. Which one's slow? It
> doesn't say which. Probably the cycles thing. Fine.

Clicks Replace data... and picks transfers-2026-04.csv.

### 2. The load step

> Right, this is the part where things usually go wrong. Counts. Nodes read 3,093, March 3,000.
> Edges 8,370, March 9,113. Rows dropped 0.

He pauses on the edges.

> Hang on, edges went DOWN? Seven hundred fewer transfers but more accounts. OK, that could be
> real, it's a different week. I'd check that against SQL before I did anything else. It's nice
> that it puts March next to it, I don't have to remember.

> "2 attributes differ from March: riskScore is missing; flagged now reads as categories Y, N."
> Yeah, somebody renamed a column upstream, that happens every other month. At least it caught it
> instead of just leaving my colours grey. "39 March accounts are not in this file and 132 are
> new. Sets keep missing members, marked." Good. That's the kind of sentence I'd put in the email.

> Bottom line: "4 results replay at once; Cycles up to 6 transfers waits for Re-run (a few
> minutes)." OK, so that's the slow one. A few minutes I can live with.

Clicks Continue to binding.

### 3. Binding the renamed columns

> riskScore, needs numbers, it picked risk_score, "matched by hand". Did I match it? I didn't do
> anything. I guess it guessed and wants me to confirm. "Matched by hand" is a weird label for
> something I didn't do. I'd have expected "suggested" or something.

> "Used by: High risk (rule set); Risk color (style layer). Left unbound, both switch off." --
> OK, that's useful, that tells me what breaks if I get it wrong. I'd never have remembered that
> the risk colour came off that column.

> flagged: "Y is yes, N is no", Y 14, N 3,079. Fine. Six matched by name, 2,961 of 3,000 accounts
> found by id. "One undo step." OK, good, so I can back out.

Clicks Apply. Counts clicks aloud:

> File, Replace data, pick the file, Continue, Apply. Five. For a weekly thing that's... fine,
> honestly. Gephi is about forty.

### 4. Watching it replay

> Replaying 4 results, there's a bar and a Cancel. PageRank running, Louvain queued. Good, I can
> see it's alive. The dots on the picture didn't move, which I guess is good, it kept my layout?

> Statistics on the right: nodes 3,093, edges 8,370, matches what it said. Components 27, weakly.
> Twenty-seven? March was 1. That's a big jump. Hm. Hold that thought.

### 5. The replay report

> "Data replaced: 4 of 5 results replayed. Show report." Yeah, show me.

He reads the report on the right and the Results list on the left.

> Mule ring 14 of 14 members in April. Flagged and High risk re-evaluated. "2 notes carried over
> by id." OK -- good, my notes are there. Where? I'd want to click that and see them. It's just
> text. I'll trust it for now but I'd go check the Notes tab.

> "Positions: Kept; 132 new accounts placed beside their neighbors." Oh, nice. So the picture in
> the deck doesn't jump around every week. That's actually the thing I care about most.

Then the Results list:

> PageRank "3 of the top 10 changed" -- which three? Can I click that? Doesn't look like a link.
> Weakly connected components: "Replayed; unchanged: 1 component."

He stops.

> No. No no. The panel on the right literally says components 27. And this says unchanged, 1
> component. One of these is wrong. That's the kind of thing that ends up in a report wrong. Which
> one do I believe? If it's 27 then the groups changing is obviously because the graph fell apart
> into bits, and if it's 1 then I don't know.

> Louvain communities: "Replayed; 12 communities, was 11." OK so that's the group count. It says
> it changed. It doesn't say why. And that's the question I'm going to get asked.

### 6. Re-running the slow one

> Cycles up to 6 transfers, out of date, Re-run. It's pinned at the top with a yellow thing. Fine.
> Click Re-run. Running, a few minutes, Cancel. Good. I'd go get coffee.

He does not open the recipe or style-file screens:

> I don't need a recipe, my styles are already on it. Recipe is for when you start from scratch,
> I think? I'd look at that later.

### 7. Trying to explain the group change

> So, why is it 12 not 11. Nothing here tells me. Let me see if there's a history or a compare.
> Version history -- it was in the report header, April data, March data. Let me go there.

He opens Version history (the version-history screens; a different demo project, "Payments
network review", which the moderator told him to treat as the same idea).

> OK, April data, current. Accounts, transfers, found by id 2,961 of 3,000, new 132, not in April
> 39. Same numbers as the report. Then Results: "Degree and Louvain communities replayed: 65
> communities, was 35."

> Wait, 65? The other screen said 12, was 11. Oh -- different project, the moderator said. OK.
> But in this one it nearly doubled. 35 to 65. That's not a small change.

> "26 keep their March name and color by overlap; 39 are new, numbered 36 to 74." OK so this is
> actually really good -- Community 3 is still Community 3. In Gephi they'd all be reshuffled and
> the purple would be a different group. I'd have put the wrong group in the deck. So that part,
> yes.

> But this is WHAT changed. It's not WHY. Why are there 39 new groups? Is it the 132 new
> accounts? Is it the 700 missing transfers breaking things apart? Is it Louvain just being
> Louvain?

He scrolls the methods text.

> "Seed 11". OK, so it's the same seed as last time, so it's not the random thing. That rules one
> out, at least. I'd not have known to look for that if I didn't already know Louvain does that.
> Modularity 0.742, March was 0.688. Higher. Is that good? I don't know. I never know.

He opens March data from the list.

> March: accounts 3,000, transfers 9,113, components 1. Legend: Community 1, 297. April,
> Community 1, 359. So Community 1 grew by 62. OK. And Restore version up top -- I'm not going to
> press that, I don't want to go back.

> "Edit current version" -- so I'm in a read-only mode right now. OK, Done gets me out.

### 8. His answer

The moderator asks him to give the explanation he would send his manager.

> "We got 132 new accounts and 39 dropped out, and about 700 fewer transfers. Same settings, same
> seed, so it's the data, not the algorithm. Most of the new groups are small bits that split off
> because the network isn't all connected any more -- it went from 1 piece to 27." -- if the 27 is
> right. That last part I pieced together myself from two numbers in two different panels, and
> one of the panels disagrees with it. I wouldn't send that without checking it in NetworkX.

> What I actually want is one line that says: this many of the new groups are made of new
> accounts, this many are old groups that split, this many are the little disconnected bits. Then
> I just copy it. Right now I'm the one doing the detective work.

---

## After the task

**SEQ: 4 of 7.**

> The replacing part was a 6, honestly. Five clicks, counts next to last week's, it caught the
> renamed column, my notes came over, the layout didn't jump. That's the bit I hate doing in Gephi
> and it just did it. The explaining part was a 2 -- it tells you the number changed, it doesn't
> tell you why, and then two panels gave me different component counts. Average it out, a 4.

**Would he use it instead of his current tool?**

> For the weekly refresh, probably yes, if the numbers match NetworkX. That's the Gephi half of my
> week and this does it in a couple of minutes, and keeping the community names and colours from
> last week is something I have literally never had. But the "why did it change" I'd still do in
> Python, and the 1-versus-27 thing would stop me cold until somebody tells me which one is right.
> If I put 27 in a slide and it's actually 1, that's on me, not the tool.

---

## Problems observed

| Screen | What happened | Severity (1-4) |
|---|---|---|
| Replace data, replay report (Results list vs Statistics) | Weakly connected components row says "Replayed; unchanged: 1 component" while the Statistics panel on the same screen says "components 27, weakly" (March was 1). He could not tell which to believe and lost trust in the explanation he built on it. | 4 |
| Replace data, Results list and Version history report | The group count change is reported as a delta only ("12 communities, was 11"; "65, was 35; 26 kept, 39 new"). Nothing attributes it to new accounts, lost transfers, graph fragmentation or algorithm randomness. He assembled the "why" himself from four numbers in two places. | 3 |
| Replace data, binding step | "matched by hand" labels a match he did not make; he read it as the tool's guess awaiting confirmation. | 2 |
| Replace data, replay report | "2 notes carried over by id" and "3 of the top 10 changed" are plain text, not links; he wanted to click to see which notes and which accounts. | 2 |
| Replace data, File menu | "1 slow result will wait for Re-run" does not name the result; he only learned it was the cycles run on the next step. | 1 |
| Version history | Modularity 0.742 vs 0.688 shown with no reading of whether that is better or meaningful; he could not use it in his explanation. | 2 |
| Version history | Two demo projects with different community numbers (12/11 vs 65/35) made him double-take; a real user would not hit this, but it cost him time. | 1 |
