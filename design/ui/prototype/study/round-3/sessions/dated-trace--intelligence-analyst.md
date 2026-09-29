# Session: trace the March money and check the order -- Marcus, criminal intelligence analyst

Participant: Marcus, 44, criminal intelligence analyst at a state fusion center (persona in
study/personas/intelligence-analyst.md). Works bank subpoena returns and money-service transfers
in i2 Analyst's Notebook and Excel; builds timelines as i2 theme lines.

Task, as the moderator gave it: "Trace money that moved during March 2026 from the flagged
account and tell whether the route could really have happened in that order."

Screens used, in the order he met them: the filter chip and its steps (with the time-window
parts below it), sets and shortest path on the March transfers (all seven states), and the
table dock (the Edges tab with the two found paths, and the full Edges tab of the file).

## Think-aloud transcript

**Filter chip screen, top.**

> Les Miserables. Okay, that's the book. Cosette, Valjean. That's not my case. The task says
> March money, flagged account. Nothing on this screen is money. I'll look at the chip anyway
> since that's where you narrow things. "27 of 77 nodes, 3 steps." Filter to degree two or
> more, took out seventeen, sixty left. Then five or more. Then filter out group 8. Fine, I get
> it -- it's like stacking criteria in a pivot. The "took out 17, 60 left" on every line is
> actually nice. Excel doesn't tell me that, I have to count.

> Bottom left, under the menu, "Assistant. Off. Nothing is sent." Good. That's where I'd look.

**Filter chip screen, scrolled down: the time window.**

> Here's something. "timestamp, transfers per day." A bar chart, March 1 to March 31, a week
> in blue. "Filter to Mar 8 to Mar 14." There's a little slider with a play button. I hit play
> on the Gephi one once and nothing happened, so I'm not expecting much from a play button.

> The step says "Filter to timestamp Mar 8 to Mar 14 -- took out 1,148, 1,852 left -- keeps
> only the 2,065 transfers in the window and the accounts that sent or received one." Okay, so
> it drops the transfers outside the window AND the accounts that did nothing in it. That's
> the right behaviour. I'd want the whole of March, though, and from the axis it looks like
> this file IS March, 1st to 31st. So for my task I don't need a window at all. Good to know
> the step exists; I'd use it for "before and after the shooting".

> Where's the flagged account? Nothing here says flagged. Moving on.

**Sets and paths, first state: "Two sets focused".**

> "March transfers," 3,000 nodes. There we go. Left side: "Flagged, rule." Legend: flagged
> true 14, false 2,986. Fourteen. The moderator said "the flagged account", singular. Which one?
> I've got fourteen. Top of the table is ACC-233575, riskScore 98, flagged true. I'll take the
> top one. In real life the sergeant would give me the account number off the SAR.

> The picture in the middle is a honeycomb. Grey hexagons. I don't know what the hexagons are.
> Density, I guess, from the shading. Three thousand accounts, I wouldn't want to see them all
> anyway, so fine. But it's not a link chart. No little bank icon, no arrows until I zoom.

> "Paid ACC-893168, fixed, 37", created from "Neighbors of ACC-893168, Follow: In." So I can
> grab who paid an account. Follow "In". That means I could do Follow "Out" off my flagged
> account and get who it paid. That's step one of following money. I don't see Out in this
> state, but the word "Follow" tells me it's a choice. I'd try that first. Is there a way to
> just keep going -- who did THEY pay, then who did they pay? One hop at a time is what I'd do
> in i2 with "expand". Here I'd be making a new set every hop.

**Path tool, state 3.**

> Path tool. From, To, Run. From ACC-271813, To ACC-233575. Wait -- To is the flagged one.
> The money's going INTO the flagged account in this one. I was asked from. And the From
> account, over on the right: flagged false, riskScore 1. That's somebody's normal account.

> Yellow warning: "From is outside the filtered graph. Set Scope to Full graph to search it."
> Okay, that's a clear message, I can read that back. Somebody filtered riskScore 20 or more
> and my start account has a 1. It tells me what to do. Fine.

> Weight: "amount (unknown role)." Unknown role? It's dollars. I don't know what role a dollar
> plays. I'd leave it.

**Found path, state 4.**

> Found path, three hops. Start at the bottom, 271813, to 946224, to 242954, to 233575, the end.
> Arrows on the lines, start and end tags. That I can read.

> Right side: "Paths ignore amount: hops were counted, not dollars." Okay, honest. "Direction:
> follows transfers." Good -- money only goes one way, it should follow the arrows. "Ties: 1 of
> 2 as short." There's another route the same length and it's showing me one. Which one did it
> pick and why? I'd want both, and I don't see a way to get the other from here. I tried to
> click "1 of 2" -- it doesn't look like a link. Nothing.

> Table down the bottom: step, source, target, amount. $3,530.28, then $9,782.05, then
> $9,616.72. That's the question the moderator asked and it's the one column not there: WHEN.
> I have amounts and no dates. I can't tell you if this happened in that order from this
> table. This is the screen where I'd expect the answer, and it's not here.

> Also -- three and a half grand goes in, nearly ten grand comes out. That's not the same money
> unless 946224 had other money coming in. In a real return I'd pull 946224's full statement.
> The tool calls this "the path" like it's the flow. It's a chain of transfers, not proof the
> dollars moved.

**Weight popover, state 5.**

> "amount: what it means. A bigger amount means: similarity, larger = closer. Read as a
> distance by 1/w, so a path prefers big transfers." One over w. I'm not touching that. I don't
> want a path that "prefers" anything; I want the one that happened. Closed it.

**No path, state 6.**

> Here it's the other way round: From ACC-233575, the flagged one, To 271813. "No directed
> path; one exists ignoring direction." And a button "Ignore direction". Well that's my actual
> task -- money FROM the flagged account -- and the answer to that pair is "no". Good that it
> says so plainly instead of drawing a line anyway. I would NOT click Ignore direction on
> money. That would put a route in front of a prosecutor that money can't travel. That button
> scares me a little, sitting right there.

> So, from the flagged account, all these screens give me is "not to that guy". There's no
> "show me everywhere the money from this account went in March". I'd have to guess a target
> first. I don't know the target, that's why I'm tracing.

**Frozen copy, state 7.**

> "28 Sep: High risk and Paid ACC-893168, fixed, 16, frozen on 28 Sep 2026." Okay, a snapshot
> of a list with a date on it. That I like for case notes -- "as of this date, these sixteen."
> Not my task though.

**Table dock, the Edges tab on the two paths.**

> Now THIS is the table I wanted. "Selected: 5 edges on 2 paths." from_account, to_account,
> timestamp, hop, amount, on paths. Both routes at once.

> Hop 1: 271813 to 946224, March 4, 18:23. On 2 of 2 paths -- both routes start with it.
> Hop 2: 946224 to 242954, March 7, 13:27. Or 946224 to 670564, March 7, 00:11.
> Hop 3: 242954 to 233575, March 8, 20:29. Or 670564 to 233575, March 9, 10:57.

> Let me check it the way I would on paper. Route one: 4th, 7th afternoon, 8th evening. In
> order. Route two: 4th, 7th just after midnight, 9th morning. In order. So yes, both routes
> could have happened in that order. Money lands in 946224 on the 4th and leaves in two pieces
> on the 7th, one around midnight, one after lunch, both around nine and a half grand, both end
> up in the flagged account by the 9th. That's a pattern I'd flag. Structuring-looking.

> But I did the checking. My eyes, row by row. The tool sorted by hop, which is good, but
> nothing on the screen says "in time order: yes". If one hop were out of order I'd have had
> to spot it. With three hops, fine. With nine hops at 2 in the morning, I'll miss it.

> UTC. My bank returns are in local time, sometimes the bank's time zone. I'd need to know this
> is converted, or a midnight transfer lands on the wrong day. The 00:11 one is exactly the
> kind that flips days.

> And I still can't see which bank record each line came from. There's no transaction number,
> no reference column. If defense asks "show me the record for hop 2", I've got a from, a to,
> a time and an amount. That might be enough to find it in the return. Might not.

**How I got to the table (as he'd tell it).**

> The paths screen said "1 of 2" and gave me one route with no dates. The table showing both
> routes with dates is on a different screen. I only found it because I kept scrolling. If the
> path screen's table just had the timestamp column, I'd have been done ten minutes ago.

## Answer he gave the moderator

> In the data you gave me, the only chain I could find involving the flagged account runs INTO
> it, not out of it: ACC-271813 to ACC-946224 on March 4, then out on March 7 through either
> ACC-242954 or ACC-670564, then into flagged ACC-233575 on March 8 or 9. Both versions are in
> date order, so yes, it could have happened that way. From the flagged account outward I got
> "no directed path" to the one account I tried, and nothing that lets me follow its money
> forward without knowing where it went. And the amounts don't match -- $3.5K in, two lots of
> about $9.5K out -- so this is a chain of transfers, not the same money. I'd need 946224's
> full statement before I'd put this route in a report.

## After the task

**Single Ease Question: 3 of 7.**

> Three. I got an answer, but I had to find it on a second screen and check the dates by hand,
> and I never actually traced OUT from the flagged account, which is what you asked.

**Would he use it instead of his current tool?**

> Not instead. Next to, maybe. The path with "follows transfers" and "no directed path" is
> better than what I do now, which is hand-tracing in Excel with a highlighter. The filter
> steps telling me what each one took out -- I like that. But i2 gives me a timeline with the
> account rows and the transfers on them in order; I'd see the order without reading dates.
> Give me the dates on the path, a flag when a hop goes backwards in time, a way to follow
> money forward from one account without naming the end, and the bank reference on each line,
> and then we're talking.

## Problems observed

1. The found path's table (step, source, target, amount) has no timestamp column, so the
   question "could it have happened in that order" cannot be answered on the path screen.
   Severity 3.
2. Nothing checks or states time order. The analyst compared dates row by row himself; a hop
   earlier than the one before it would only be caught by eye. The shortest path counts hops
   and does not look for a route that respects time. Severity 3.
3. No way to trace money forward from one account without naming a destination: the path tool
   needs both ends, and the neighbors set is one hop at a time. The task's "from the flagged
   account" could not be done as asked. Severity 3.
4. "1 of 2 as short" is not clickable on the path screen; the second route (and both routes
   with dates) is only on the table-dock Edges tab, which he reached by scrolling. Severity 2.
5. The only mocked route runs into the flagged account, not out of it; with 14 flagged
   accounts, "the flagged account" had no obvious pick. Severity 2.
6. "Ignore direction" sits one click away on a money graph; the analyst reads it as a way to
   produce a route money cannot travel. Severity 2.
7. Weight "amount (unknown role)" and the "similarity, larger = closer, 1/w" popover mean
   nothing to him; he left it alone. Severity 2.
8. Timestamps are UTC with no local-time option; a transfer at 00:11 UTC may fall on a
   different local day. The path rows show minutes, the file rows show seconds. Severity 2.
9. No transaction or record reference on a transfer row, so a hop cannot be tied to a line in
   the bank return. Severity 2.
10. The filter chip screen opens on Les Miserables; the March time window is below the fold in
    loose pieces, so the first screen offered nothing for a money task. Severity 1.

## What worked for him

- "Assistant: Off. Nothing is sent." visible without asking.
- "From is outside the filtered graph. Set Scope to Full graph to search it." -- plain, tells
  him what to do.
- "Direction: follows transfers" and "Paths ignore amount: hops were counted, not dollars" --
  honest labels he could repeat.
- "No directed path; one exists ignoring direction" -- a real no, not a made-up line.
- The Edges tab on the paths: both routes, hop number, timestamp, amount, "on paths 2 of 2".
- Filter steps that say what each one took out and what is left.
- A frozen set with a date on it, for case notes.
