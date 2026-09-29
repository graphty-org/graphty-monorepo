# Session: follow the August money and check its order -- Marcus, criminal intelligence analyst

Participant: Marcus, 44, criminal intelligence analyst at a state fusion center (persona:
study/personas/intelligence-analyst.md). Works in i2 Analyst's Notebook and Excel; not a
programmer; reads bank subpoena returns for a living.

Task as the moderator gave it, and nothing more: "Money arrived in the flagged account in early
August. Follow where it went next and tell me whether the order of the transfers makes sense."

Pages looked at, as a participant sees them (design notes hidden): the alert triage storyboard,
the alert triage screens on the August transfers, the sets-and-paths flow, the sets-and-paths
screen, the inspector screen and the table dock screen. Renders:
shots/storyboards__alert-triage.png, shots/r4b-marcus-dated-alert-triage.png (every alert triage
state, one under the other), shots/flows__sets-and-paths.png, shots/screens__inspector-path.png,
shots/r4b-marcus-dated-table.png.

## Think-aloud transcript

**The storyboard, top of the page.**

> Long page. Paragraph about Nadia and Sarah, skip. There's a table: "Question as read", "The file
> opened". OK -- transfers-2026-08.csv, accounts, and the monitoring system's alerts. The flagged
> account is ACC-365386, alert AL-40122, "Structuring: 3 or more transfers of 9,000 to 9,999 USD
> out in 30 days", raised Aug 7 02:17. That's my subject. Good that it tells me which one, because
> the first screen has fifty orange diamonds on it and you said "the" flagged account.
>
> Frame list says frames 15 to 21 are "where did the money go". That's what I want. But I'll start
> where the account is found.

**Alert triage: the account found (the right panel).**

> ACC-365386, personal, US, riskScore 92. And under it: "From accounts-2026-08.csv. riskScore is
> the bank's customer risk rating as delivered; not computed by graphty." Good. That is the
> sentence I need when defence asks who said this guy is a 92. Alert time Aug 7 02:17 UTC, from
> the alerts file. Connections: "8 neighbors, In 3 - Out 5." So three sources of money in, five
> places it went out. That's the first thing on this whole page that talks my language.

**The Neighbors menu.**

> Hops from ACC-365386. 1 hop, 9 nodes, 13 edges. 2 hops, 283 -- "mostly through a pharmacy and a
> streaming service". Fine, I don't want the pharmacy's customers. 3 hops, 2,122, no.
>
> Then "Follow ... All" with an arrow. What's "Follow"? Follow what? I'm guessing that's direction.
> I want OUT. Where the money WENT. It's sitting on "All", and I only know that's direction because
> the panel above said In 3, Out 5. I'd have left it on All. Which means my "where did it go"
> would also pull in who PAID him. That's the wrong question with the right button.

**One hop, the Edges tab.**

> Nine accounts drawn. Lines between them -- no arrows on the lines. I can't tell from the picture
> who paid who. In i2 there's an arrowhead and a label on the link, "9,260.78 - 06/08". Here I have
> to go to the table.
>
> Table: source, target, time (UTC), amount. Source and target, fine, I'll read that as from and
> to. Sorted by amount largest first. That's not what I asked for. I need it by time.

**The account's own transfers, sorted by time.**

> Now we're talking. "Edges of the selection, ACC-365386: 8 of 13 edges. Sorted by time."
>
> - Aug 3 07:21, out 90.81 to ACC-597001 (that's the pharmacy).
> - Aug 5 09:09, IN 3,479.70 from ACC-916833. There's my early-August money.
> - Aug 6 15:21, out 9,260.78 to ACC-274887.
> - Aug 6 15:44, out 9,662.37 to ACC-898028.
> - Aug 6 17:42, out 9,139.58 to ACC-465572.
> - Aug 17 12:43, in 9,863.99 from ACC-796219.
> - Aug 24 13:28, in 9,326.81 from ACC-228299.
> - Aug 30 07:44, out 168.28 to ACC-512219 (streaming).
>
> Hold on. 3,479.70 comes in. The next afternoon twenty-eight thousand goes out. Let me add it:
> 9,260.78 plus 9,662.37 plus 9,139.58 is 28,062.73. That's eight times what came in. So it is NOT
> "the money that arrived went out". Either he had a balance sitting there before August, or
> there's cash going in that isn't in a transfers file. The screen doesn't show me a balance,
> doesn't show opening balance, doesn't add up in versus out. Nadia's note on the next frame calls
> it "pass-through pattern". Pass-through of what? I'd get sent back by the sergeant for that.
>
> And then two big ones come BACK IN, Aug 17 and Aug 24, both just under ten grand, both from
> accounts he'd... no, from 796219 and 228299, which aren't the ones he paid. Money goes out on
> the 6th, money comes in on the 17th and 24th from other members. That's circular, not a straight
> line.

**Following it one more step (the 1-hop table again, and the two-hop table).**

> Now, where did it go NEXT. The tool doesn't have "next". I have to do it by hand: find each of
> the three receivers in the table and see what they sent after Aug 6.
>
> - ACC-274887 got 9,260.78 on Aug 6. Two-hop table: it sends 9,788.51 to ACC-640034 on Aug 19
>   15:09 and 9,815.97 to ACC-465572 on Aug 19 16:56. That's after, so the order's fine. But it's
>   thirteen days later and it sent out nineteen and a half thousand after getting nine. Same
>   problem again: doesn't balance.
> - ACC-898028 got 9,662.37 on Aug 6. Sends 9,707.38 to ACC-465572 on Aug 21 17:39. Fifteen days.
> - ACC-465572 got 9,139.58 on Aug 6. The table calls it a merchant, "Money transfer". That's a
>   money service business. The trail stops there for me; that's a subpoena to the MSB, not a
>   graph.
>
> So everything ends up at the money transfer service within about two weeks. That's the answer,
> but I built it the same way I'd build it in Excel: sort, scroll, write it down. The tool held the
> rows for me. It didn't trace anything.

**Frame 20, the Path tool, "Day 2: does ACC-365386 feed the rest?"**

> From ACC-365386 to ACC-580664, "Along transfers", Run. Five hops, all nine-and-change. Thick
> black line on the picture. Now the table: Aug 6, Aug 19, Aug 21, then "Aug 4 13:56 earlier than
> the hop before", then Aug 19.
>
> OK, I'll give them this: it TOLD me. In grey text, but it told me the fourth hop happened before
> the third. So this "path" is not a money trail. Money can't leave ACC-177247 on the 4th if it
> only got there on the 21st. And the side panel says "Ignoring direction, the shortest route is
> 2 hops, through ACC-465572. It is not a flow from one to the other." That's honest. That's the
> sentence I'd want if a junior analyst tried to put this on a board.
>
> But then why is it drawn as a big bold line on the chart like it's the answer? If I screenshot
> that for a briefing, the timing warning is gone and the line is still there. And why can't I tell
> it "only go forward in time"? That's the whole question. Every time.

**The sets-and-paths flow page, section 5, "Neighbors out of one account, in a date window".**

> Here we go. This is exactly my question, on somebody else's data -- March, ACC-233575. Direction
> Out. A date window, Mar 4 to 17. It tells you how many of his transfers fall outside the window.
> One line: out of this account, 3 transfers, $28,559.99, to 3 accounts; then 7 transfers out of
> them after the one that reached them; 2 transfers earlier than the hop before, not counted. And
> the table with a "time order" column: "in order", "earlier than the hop before (Mar 9, 19:47)".
> And on the chart the backwards one is dashed with a little clock.
>
> That's the thing. That's what I wanted on the August screen. If I'd had that, I'd have had the
> answer in one move and the count of the stuff that doesn't fit in the same line.
>
> But it's got pink dashed boxes all over it: "the window and the sizes: wait on the element",
> "the summary line: waits on the element". So... it doesn't exist? I read that as "coming soon".
> Vendor slide. I can't use a feature that's a dashed box.
>
> One more thing even this doesn't do: it says "$28,559.99 out" but it doesn't say how much came
> IN before it went out. My August account: 3,479 in, 28,062 out. The one-liner would say the 28
> and I'd still have to go find the 3.4 myself. The line that matters is "out was eight times
> in".

**The sets-and-paths screen, the inspector screen, the table dock.**

> Sets-and-paths screen is March transfers again, shortest path, "amount, not used yet". Not my
> case. Inspector is... proteins. TP53. I'm not reading that. Table dock is Les Miserables and a
> March ranking table. None of these has my August account on it, so none of them helps me with
> the order. I'd close these.

## The answer Marcus gave the moderator

> Money arrived in ACC-365386 on Aug 5 at 09:09 UTC: 3,479.70 from ACC-916833. The next afternoon,
> Aug 6 between 15:21 and 17:42, three transfers went out: 9,260.78 to ACC-274887, 9,662.37 to
> ACC-898028 -- both alerted personal accounts -- and 9,139.58 to ACC-465572, a money transfer
> service. The alert fired that night, Aug 7 02:17. Next: ACC-274887 paid ACC-640034 and the money
> transfer service on Aug 19; ACC-898028 paid the money transfer service on Aug 21. So it all ends
> at the money transfer service within about two weeks.
>
> Does the order make sense? The timing does, the money doesn't. In, then out the next day, is
> the right order. But 28,062.73 went out after 3,479.70 came in -- eight times more. The August
> deposit can't have funded it; there's a balance or cash deposits we don't have in this file.
> Same at the next hop: ACC-274887 got 9,260 and sent out about 19,600. And two more near-10,000
> transfers came back into ACC-365386 on Aug 17 and 24 from other ring accounts, after the money
> left. So it's a ring cycling money, not one sum moving down a line. And the tool's own five-hop
> path to ACC-580664 has a hop dated Aug 4, before the hop in front of it -- the tool flags that
> itself -- so that path is not the money trail and I would not put it on the chart.

## Single Ease Question

**3 out of 7.**

> I got there, but by sorting a table and doing the arithmetic on paper -- same as Excel. The one
> screen that answers the question in one move is marked as not built, and it's on March data, not
> mine. What I got for free was the time column right next to who-paid-who, and the tool saying
> out loud when a hop runs backwards. That's worth a point or two.

## Would he use this instead of his current tool?

> Not instead. Maybe beside it. The "not computed by graphty", "nothing is uploaded", and "that hop
> is earlier than the one before" -- that's more honesty than i2 gives me, and I'd trust it on the
> stand. But the chart has no arrows and no labels on the links, there's no timeline with a row per
> account, and it can't follow money forward in time, which is the question I get asked. When the
> Out-plus-date-window thing is real and it also tells me in versus out per account, I'd load a
> bank return into it. Today I'd do this in Excel with a pivot on from-account and a sort on date,
> and it would take me about the same ten minutes.

## Observations for the study (plain, for the designers)

1. The question "where did it go next, in time order" has no command on the August screens. The
   participant answered it by sorting the selected account's Edges tab by time and then looking
   up each receiver by hand. The designed command (Neighbors, direction Out, a date window, a
   summary line, backwards hops marked) appears only on the sets-and-paths flow, on the March
   data, drawn as "waits on the element". He read the dashed boxes as a promise, not a feature.
2. Direction is under "Follow: All" in the Neighbors menu. He did not recognise "Follow" as
   direction and would have left it on All, pulling in who paid the account when he asked where
   the money went. He found direction only because the inspector's "In 3 - Out 5" line put the
   idea in his head.
3. Nothing on screen compares money in against money out for an account over time. The largest
   finding of the session -- 28,062.73 out after 3,479.70 in, so the August deposit cannot have
   funded the outflow -- came from his own arithmetic. The designed summary line totals what went
   out but not what came in before it. Nadia's note in the storyboard calls this account
   "pass-through", which this arithmetic contradicts.
4. The Path tool's result is drawn as a bold route even when the table marks one hop as earlier
   than the hop before. He trusted the grey marking and the sentence "It is not a flow from one to
   the other", but pointed out that a screenshot of the canvas loses both. He asked for a way to
   tell the path search to follow time order.
5. Lines on the canvas carry no arrowheads or labels in the one-hop and ring views, so direction
   and date can only be read from the table. He compared this directly with i2 links labelled with
   amount and date, and asked for an i2-style timeline with one row per account.
6. The time column right after the two accounts, the provenance line on riskScore, the "nothing is
   uploaded" line in Export, and the "earlier than the hop before" marking were the parts he said
   he would trust in court.
7. The inspector and table dock pages in the task list show other datasets (proteins, Les
   Miserables, March transfers). He dismissed them as not his case; they contributed nothing to
   the answer.
