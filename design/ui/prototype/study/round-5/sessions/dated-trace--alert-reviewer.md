# Session: dated trace -- alert reviewer (Nadia)

Participant: Nadia, level-1 transaction monitoring analyst (study/personas/alert-reviewer.md).
Fourteen months in, works the alert queue, has never used a graph tool. Patience: the length of
one alert, about ten minutes.

Task as given, and nothing more: "Money arrived in the flagged account in early August. Follow
where it went next and tell me whether the order of the transfers makes sense."

Material worked from: the alert triage screens for the August transfers (the project opening,
finding ACC-365386, the Neighbors menu, one hop drawn, the account's own transfers in time order,
the export menu, and the level-2 Path tool screen she was shown last), plus the inspector,
table-dock and sets-and-paths pages. Renders were read; page HTML was read only to see what a
menu offers when opened.

## Think-aloud

**1. The project opens.** (shots/alert-triage/open.png)

"OK. August alerts. There's a grey blob with orange diamonds, and a table at the bottom that's
my queue -- alertId, account, scenario, riskScore. That table I understand. The blob I don't.

'The flagged account.' Which one? There are fifty flagged accounts, they're all flagged. You
didn't give me an alert number. ... I'm going to guess. Money came in and then went out -- that's
either 'money out within 24 hours of money in' or the structuring one. AL-40122, ACC-365386,
structuring, risk 92. If you're asking me about the order of transfers, it's that one. If it's
AL-40116 or AL-40120 I'm wrong and you tell me."

(Moderator note: the moderator did not correct her. ACC-365386 is the account the level-2 script
uses for the same task.)

**2. Find the account.** (shots/alert-triage/seed-find.png)

"First search box. Top left, a magnifier. Paste ACC-365386. One hit, 'personal, US; in
Alerts'. Click it. The diamond gets a ring, and the right side fills in.

Right side: riskScore 92, and it says that's the bank's rating, not something this thing made
up. Good, QA would ask. alertTime Aug 7 02:17. Scenario: three or more transfers of 9,000 to
9,999 out in thirty days. Connections: '8 neighbors, In 3, Out 5'.

I want the transfers. Not neighbors, transfers. 'In 3 Out 5' -- can I click that? It's grey
text, it doesn't look clickable. The '8 neighbors' row has nothing after it. So where are the
transfers? ... There's a big button 'Neighbors' at the top. I'll try that."

**3. The Neighbors menu.** (shots/alert-triage/seed-menu.png)

"I clicked the little arrow by it first, by accident. 'Hops from ACC-365386.' 1 hop, 9 nodes,
13 edges. 2 hops, 283 nodes -- 'mostly through a pharmacy and a streaming service.' OK, that one
I would never click, 283 is the whole town. 3 hops, 2,122, no.

'Follow ... All', with an arrow. Follow what? Follow the money? All what -- all accounts, all
transfers? If that's 'money in and money out' I want out only, because you said 'where it went
next'. But I'm not opening a submenu I can't read to find out. Skipping it.

Then 'Filter to neighbors, 1 hop' and 'Select neighbors, 1 hop'. What's the difference?
Filter... hides everything else? Select just highlights? I don't know which one changes
anything. I'll take the blue one, it's the default."

(Moderator note: the Follow submenu's contents are not drawn in these screens. She did not open
it and did not ask.)

**4. One hop, drawn.** (shots/alert-triage/seed-hop1.png)

"OK, now it's a normal picture. Nine dots. Up top it says 'Filtered: 9 of 3,000 nodes'. So I
hid stuff. Did I delete it? There's an Undo on the black bar, so I assume it's just the view.
I'm going to trust that.

Five of the nine are orange. So five alerted accounts in one little group. That's already not
tuition.

The table switched to Edges. Source, target, time, amount. 'Sorted by amount, largest first.'
I need it by time, not by amount -- you asked about order. And it's thirteen transfers but these
aren't all my account's -- ACC-274887 to ACC-465572, that's not mine. So this is everybody's
transfers among the nine. I'd click the time header to sort. I think that sorts it."

**5. The account's own transfers.** (shots/alert-triage/seed-own.png)

"I clicked the diamond for ACC-365386 again and the table changed: 'Edges of the selection,
ACC-365386: 8 of 13 edges. Sorted by time.' OK! That's what I wanted from the start. That's my
core banking statement, basically, just the transfers to other customers.

Reading it top down:

- Aug 3, out, 90.81 to ACC-597001. Small. Ignore.
- Aug 5 09:09, IN, 3,479.70 from ACC-916833. That's your 'money arrived in early August'.
- Aug 6 15:21, out, 9,260.78 to ACC-274887.
- Aug 6 15:44, out, 9,662.37 to ACC-898028.
- Aug 6 17:42, out, 9,139.58 to ACC-465572.
- Aug 17, in, 9,863.99 from ACC-796219.
- Aug 24, in, 9,326.81 from ACC-228299.
- Aug 30, out, 168.28. Small.

So. Three outs, each just under ten, inside about two and a half hours on Aug 6. That's the
structuring rule, fired Aug 7 at 2 in the morning. That matches.

Does the order make sense? No. Three and a half thousand came in, and the next day twenty-eight
thousand went out. (Adds on her phone calculator: 9,260.78 + 9,662.37 + 9,139.58 = 28,062.73.)
The money that 'arrived' can't be the money that left, it's an eighth of it. So either she had
a balance sitting there from July -- which I can't see here, there's no balance column -- or the
money came in some way that isn't in this file. Cash. Another bank. And then the big money comes
IN after the big money went OUT, on the 17th and the 24th. Backwards. You pay out first, and
then two other people pay you nearly ten each. That's not how a normal person's month looks.

I'd need the core banking screen for the July balance and any cash deposits. This picture
doesn't have them."

**6. Where it went next.** (back to shots/alert-triage/seed-hop1.png, the thirteen transfers)

"Now 'next'. Where did the 28k go after those three accounts? I don't want to press 2 hops,
283 accounts. So I go back to the table of thirteen and read it by eye, because the mock is still
sorted by amount.

- ACC-274887 got 9,260.78 from us on Aug 6. On Aug 19 it sent 9,815.97 to ACC-465572.
- ACC-898028 got 9,662.37 on Aug 6. On Aug 21 it sent 9,707.38 to ACC-465572.
- ACC-465572 got 9,139.58 straight from us on Aug 6.

So all three roads end at ACC-465572. That one's grey, not alerted. Everything goes there. And
the amounts going on are bigger than what they got from us -- 9,815 out of a 9,260 in. So again
it's not the same money exactly, it's topped up.

Also -- wait. ACC-796219: Aug 17 12:43 it paid us 9,863.99, and at 13:35, fifty minutes later,
it paid ACC-465572 9,782.28. ACC-228299: Aug 24 13:28 paid us, 14:09 paid ACC-465572. Same
pattern twice, same payer, same afternoon, both to us and to 465572. I only saw that because I
was hunting for 465572 in the list. The table doesn't tell you that, you have to line up
times across rows yourself.

Order of the second hop: 13 and 15 days after, not 'next day'. It's in order -- the forward
transfers are later than what came in -- but it's slow. If this were a pass-through I'd expect
days, not two weeks.

And the list says 13 edges, I can see about seven without scrolling. I'd scroll. I don't know
what the other rows are.

One more thing: if I click ACC-274887 to see where IT sent money, do I see all its transfers
or only the ones inside my nine? The heading said '8 of 13 edges in the filtered graph' for my
account. So I think for 274887 I'd only see the ones inside this little group. If it sent money
somewhere else, I wouldn't know from here. That's a problem for 'where did it go next'. You'd
need the 283 thing, and I'm not doing that."

**7. The export test.** (shots/alert-triage/seed-own.png, the Export menu)

"Plus next to Export on the right. 'Export the selection's edges -- 8 transfers: time and
amount.' That goes in the alert file. Plus a screenshot of the nine dots. That's what QA wants:
what I looked at and when. Fine.

Can I write the sentence 'outflows exceed inflows, inflows arrive after outflows' anywhere and
have it come out with the picture? I didn't see where. I'd type it in the case system anyway."

**8. The level-2 screen, shown last by the moderator.** (shots/alert-triage/case-path.png)

(The moderator showed the Path tool screen from the escalated case and asked whether it would
have helped.)

"From ACC-365386 To ACC-580664. I don't know what 580664 is. I'd never have had a 'To'. That's
Sarah's. Five hops... one line says 'Aug 4 13:56, earlier than the hop before'. Oh, OK -- so the
tool CAN tell you when a date goes backwards. Why didn't my table do that? That's exactly the
thing I worked out on the calculator: the money leaving before the money arriving. On mine I
had to do it in my head.

'Ignoring direction the shortest route is 2 hops, it is not a flow.' ... I don't know what
that means. Hops again. Two hops from what?"

## Her answer to the task

"The flagged account is ACC-365386, I think. 3,479.70 came in on Aug 5. The next day, Aug 6,
three transfers just under 10,000 went out, 28,062.73 in total, to ACC-274887, ACC-898028 and
ACC-465572. Two weeks later 274887 and 898028 each sent a bit more than they received on to
ACC-465572, so everything ends up at 465572.

The order doesn't make sense for one lot of money moving. What came in is an eighth of what went
out, and the bigger money -- about 19k from 796219 and 228299 -- came in AFTER the outflows, on
the 17th and 24th, from accounts that paid 465572 the same afternoon. Either there was a balance
I can't see, or this is a group of accounts passing round amounts under ten thousand. I'm not
clearing that. It goes up to level 2 with the eight transfers exported and a screenshot."

Time on task, her estimate: "Fifteen, twenty minutes. Most of it on the second hop and the
calculator."

## What worked for her

- Pasting the account into the first search box found it, one hit.
- The inspector saying riskScore and the alert came from the bank's files, not the tool.
- The alert's own attributes (scenario, alert time) sitting beside the account without opening
  another system.
- Clicking the account turned the table into its own transfers, sorted by time, with the time
  right after the two accounts: "that's my statement."
- Export of the selection's transfers, with the count, as the alert file record.
- The "Filtered: 9 of 3,000" chip plus an Undo on the notice told her the data was not changed.

## Where she stalled or guessed

- "The flagged account" with fifty flagged accounts: she guessed from the scenario names.
- "8 neighbors, In 3, Out 5" in the inspector is not a way into the transfers; she wanted to
  click "Out 5" and it does not look clickable.
- "Follow ... All" in the Neighbors menu: she could not tell what it follows or what "All" is,
  and did not open it. She wanted money out only.
- Filter to neighbors versus Select neighbors: she did not know which one changes the view.
- The step's thirteen transfers came sorted by amount; the question was about order. She read
  times across rows by eye.
- Nothing on her screens flagged that the outflows came before the inflows or were larger than
  them; she computed the total on a phone calculator. The "earlier than the hop before" mark
  she saw only on the level-2 Path screen.
- She suspected, correctly, that selecting a neighbor shows only its transfers inside the
  filtered group, so "where it went next" beyond the nine accounts is invisible without the
  2-hop step she refused (283 accounts).
- No balance column, so she could not tell whether the Aug 6 outflows were funded by an older
  balance. She would go to core banking for that.
- "Hops" and "2 hops ignoring direction" still meant nothing to her.

## Single Ease Question

"Four. Finding the account and getting its transfers in date order was quick, quicker than
core banking. But you asked where the money went NEXT and whether the order makes sense, and for
that I had a table sorted by amount, a calculator, and my own eyes lining up times. The tool
knew the dates. It didn't tell me anything about order. I did."

SEQ: 4 / 7

## Would she use it instead of her current tool?

"Instead? No. For ninety percent of my queue it's one transfer and the customer profile, and
this adds a minute to every one. For an alert like this one, where the counterparties matter --
yes, I'd want it next to the case system, because the one-hop picture and the sorted transfers
with an export are faster than building a pivot. But it doesn't have the balance, so I'd still
be in core banking. And it's not my choice anyway, somebody above Sarah picks the tools."
