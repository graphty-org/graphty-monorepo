# Weekly update: bring the project up to date and explain the group count -- Jordan, marketing analyst

**Participant:** Jordan, a growth-marketing analyst who "does the network stuff" one or two days a
week in Gephi and a listening suite, and whose real output is a slide and a shortlist.

**Task as given:** "This week's export arrived. Bring last week's project up to date without losing
your styles and notes, and explain why the group count changed."

**Screens used:** Replace data and apply a recipe (states 1 to 6: the File menu, the load step, the
binding step, replaying, the replay report, the re-run), then Version history (the list with April
selected, and March opened beside it). The mocks carry a fraud team's transfer network with a
monthly March-to-April refresh; Jordan was asked to read "March" as last week and "April" as this
week, and "accounts" as her audience accounts.

**Renders the participant saw** (in `shots/`): `screens__replace-and-recipe.png`,
`r3-jordan-weekly-replace-full.png` (states 2 to 6), `screens__version-history.png`,
`version-history--s2.png`.

**Outcome:** success with difficulty. Bringing the data in was easy and the styles visibly stayed.
Explaining the group count was not: the screens say the count went up and which groups are new,
but never why, and three places give three different counts.

**Single Ease Question:** 3 of 7.

---

## Transcript

### 1. The project, as I left it

> OK, "Mule ring review". That's... not my project, but fine, pretend it's my creator network.
> Transfers, March, 3,000. Styles: Risk color, Size by PageRank, the ring thing. So those are the
> styles I'm not supposed to lose. Notes -- there's a Notes button on the left. I'll trust they're
> in there, I'm not clicking it yet.
>
> Oh, and it says "Assistant: Off. Nothing is sent." Right on the rail. OK, that's the first
> thing legal would ask me, so, good. Doesn't say where the file itself lives, but fine.
>
> So, new export. In Gephi I'd just open the new file and redo everything, which is the whole
> afternoon. I want the button that swaps the data and keeps my stuff. Hamburger, File...

### 2. The File menu

> Open, Add data, Add as another graph, Join, Replace data. "Replace data -- 1 slow result will
> wait for Re-run." OK, Replace is the one. "Replace" sounds a bit scary, like it's going to wipe
> my styles, but "Add data" would probably double everything up, and "Open" is definitely the
> start-over one. I'll take Replace. If it eats my styles I'll hit undo.
>
> "1 slow result will wait" -- fine, whatever that is. I like that it tells me before, actually.

### 3. The load step

> Replace data with transfers-2026-04.csv. Format CSV, detected. Mapping, source, target -- fine,
> it found my columns. Issues: "2 attributes differ from March: riskScore is missing; flagged
> now reads as categories." Yeah, that's the vendor. They rename a column every other export. At
> least it's telling me instead of silently dropping it. Brandwatch would just give me a blank
> column and I'd find out in the meeting.
>
> Counts: nodes 3,093, was 3,000. Edges 8,370, was 9,113. Hm. More accounts but fewer
> connections. That's... less conversation this week? I'll remember that. That might matter for
> the group thing.
>
> "39 March accounts are not in this file and 132 are new." OK.
>
> Continue to binding.

### 4. The binding step

> "riskScore needs numbers -- risk_score, matched by hand." It already picked risk_score for me.
> Good, that's obviously the renamed one. "Left unbound, both switch off" -- so if I got this
> wrong the styles would just turn off, not disappear. Fine.
>
> flagged, "Y is yes, N is no." Yes. Obviously. Apply.
>
> "One undo step." Good. I'm the person who needs that.

### 5. Replaying

> Canvas is still this grey honeycomb thing. PageRank running, Louvain queued. There's a bar at
> the bottom, "Replaying 4 results". It's moving, so I'm not worried.
>
> Data panel on the right now says April, 3,093 nodes, 8,370 edges... components: 27, weakly.
> Twenty-seven? Last week it said 1. OK so the thing fell apart into 27 pieces. That's probably
> my answer to the group question, right? If the network is in 27 bits, you'd get more groups. I
> think. I'd want someone to tell me that, though.

### 6. The replay report

> "Data replaced: 4 of 5 results replayed." Show report.
>
> Accounts found by id, 2,961 of 3,000. New in April 132. Not in April 39, and there's a List
> link, nice, I'd want that list -- those are the people who went quiet.
>
> "Sets and notes: Mule ring: 14 of 14 members in April... 2 notes carried over by id." OK, so my
> notes are there. It doesn't say which notes, or whether a note about someone who left is now
> hanging on nothing. Two notes, fine, I'll believe it. Styles -- the Styles list didn't change,
> Risk color, Size by PageRank are all still there. So that part of the task is done. Honestly
> that part is better than what I have.
>
> Now the groups. Left panel: "Louvain communities: current. Replayed; 12 communities, was 11."
>
> Wait. Twelve, was eleven? The data panel told me 27 components a second ago. How do you have 27
> separate pieces and only 12 groups? And look -- right above it: "Weakly connected components:
> Replayed; unchanged: 1 component." Unchanged? The Statistics box literally said 27. So which
> one is it?
>
> This is exactly my Talkwalker problem. The dashboard says 4,000 and the download says 3,100 and
> I'm the one who has to pick which number goes in the report.
>
> Anyway, the task says explain why it changed. It says "12, was 11". It does not say why. There's
> no "why". I'd guess the new 132 accounts formed a group, but I'm guessing.

### 7. Re-run the slow one

> Cycles up to 6 transfers -- out of date, a few minutes, Re-run. I don't know what that is for
> me, but it's the only yellow thing, so, Re-run. "Running; a few minutes" with Cancel. Fine. The
> badge went away. Good.

### 8. Version history -- looking for the "why"

> The report opened inside something called Version history, so I'll look there properly. April
> data, current, today 09:14. Opened 22 times? By who? Is that me? Whatever.
>
> "Results: Degree and Louvain communities replayed: 65 communities, was 35."
>
> Sixty-five?! OK, now I've got three answers. The results panel said 12, was 11. This says 65,
> was 35. The legend on the canvas says seven colors plus "Other, 58 communities, 2,070". So 65
> I guess matches the legend, 7 plus 58. But the other screen said 12.
>
> (Moderator notes the project in version history is titled "Payments network review", not "Mule
> ring review"; Jordan did not notice the name change and took both as her project.)
>
> "26 keep their March name and color by overlap; 39 are new, numbered 36 to 74."
>
> Thirty-nine new groups. And 39 accounts left. Is that the same 39? Did every account that left
> make a new group? That can't be right... but it's the same number, so. Hm. I would honestly
> say that in the meeting and then someone would ask me how that works and I'd have nothing.
>
> The legend: Community 1, 2, 3, 5, 4, 7, 6. Why is 5 above 4? Oh -- little grey text, "Names and
> colors kept from March data by overlap". So Community 3 is still last week's Community 3. OK,
> actually, that's good, that's the thing Gephi never did -- it renumbers everything every run and
> my colour key in the deck is wrong. I like that. But I had to read the small print to figure out
> why the numbers were out of order.
>
> And -- 2,070 accounts in "Other". So two thirds of my map is grey. That's the hairball again,
> just a grey hairball.

### 9. Opening March beside it

> March data, click. It shows March: 3,000 accounts, 9,113 transfers, components 1. So March has
> a components row. Go back to April -- no components row! It's the one number that I think
> explains this, and it's in the old one and not the new one.
>
> "Methods, one sentence per run." Louvain, "weighted by amount, direction ignored, resolution 1,
> seed 11... 35 communities, weighted modularity 0.688." April, "65 communities, weighted
> modularity 0.742." Copy methods text. OK, if my data-science colleague asks, I can paste that
> to him. That's fine. My VP is not reading "degree-preserving randomizations", though.
>
> So what's my explanation? My best guess: this week's export has fewer transfers, the network
> broke into more pieces, and small pieces become their own groups. 26 of last week's groups are
> still there. Plus the new accounts. That's my answer, and it's a guess stitched together from
> three screens, and I'm not sure which count to put on the slide.

---

## After the task

**Single Ease Question: 3 of 7.**

> The update part is a 6. It found the renamed column, it told me what it would lose before I
> clicked, my styles and notes stayed, and there's undo. Swapping the file and keeping everything
> is genuinely the thing I redo by hand every week.
>
> The "why did the count change" part is a 2. It tells me what changed, it never tells me why,
> and it gave me three different numbers -- 12 was 11, 65 was 35, and "1 component unchanged"
> next to "27 components". If a tool shows me two numbers that disagree, I stop trusting the
> ranking too.

**Would you use this instead of your current tool?**

> For the weekly refresh -- yeah, probably, over Gephi, because Gephi makes me redo everything and
> renumbers my clusters. Keeping the group names week to week is the best thing I saw today. But
> my VP's question every week is literally "why did it change", and this doesn't answer it. I'd
> still be opening a notebook or asking our data guy to explain the 65. And if the numbers
> disagree like that in the real thing, I'm back on Brandwatch by Friday, because at least there
> I know which number is wrong.
>
> Also -- I'd need the table. I didn't see a way to get this week's ranked list out, but that
> wasn't today's question.

---

## Problems observed

1. **The group counts disagree across screens (severity 4).** The Results panel says Louvain
   "12 communities, was 11"; Version history says "65 communities, was 35"; the legend adds up to
   65. Jordan distrusts the whole result because of it.
2. **Components contradict each other (severity 4).** The Results row reads "Weakly connected
   components: unchanged: 1 component" while the Statistics box reads "27, weakly".
3. **No "why" for a changed group count (severity 3).** The report states what changed (26
   kept, 39 new) but not the cause. The likely cause -- fewer transfers, the graph now in 27
   pieces -- is never connected to the count, and April's report has no components row though
   March's does.
4. **The coincidence of 39 misleads (severity 2).** "39 not in April" and "39 new communities"
   sit near each other; Jordan read them as the same 39.
5. **Notes carried over are only a count (severity 2).** "2 notes carried over by id" does not
   say which notes or whether a note on a departed account still points somewhere.
6. **Two-thirds of accounts are grey "Other" (severity 2).** 58 communities and 2,070 accounts
   in one grey swatch reads as the hairball.
7. **The out-of-order legend needs small print (severity 1).** Community 5 above 4 is explained
   only in secondary gray text; she understood it and then liked it.
8. **The project name changes between screens (severity 1).** "Mule ring review" in the replace
   flow, "Payments network review" in Version history. Not noticed by her, noted by the moderator.

## What delighted her

- Replace data kept styles, sets and notes, and said so in one report.
- The renamed column was caught and pre-matched before anything changed.
- Group names and colors stay the same week to week ("the thing Gephi never did").
- "Assistant: Off. Nothing is sent." visible without asking.
- One undo step stated before Apply.
