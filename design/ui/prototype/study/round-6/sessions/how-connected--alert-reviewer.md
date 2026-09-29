# Session: "How is ACC-271813 connected to ACC-233575?" -- Nadia, level-1 alert reviewer

Participant: Nadia (study/personas/alert-reviewer.md), level-1 transaction monitoring analyst,
fourteen months in, no graph tools of her own. 1536 x 740 browser on a docked laptop.

Task as read to her: "How is ACC-271813 connected to ACC-233575?"

Screens she worked through, in the order she met them: Find and expand (find the account, the
inspector, the Neighbors menu), then Sets and paths (the Path tool, the found path, the reverse
run). Renders looked at: the find-and-expand states "Find the seed", "Inspect the hit", "See the
size before growing", "A hit the filter leaves out", "The step, grown"; the sets-and-paths
states "Path tool", "Found path", "What amount means", "No path"; for comparison, the inspector
page's "Path to..." and "two proteins selected" states and the find page's "An id not in this
project".

Outcome: success with difficulty. She got the right answer -- ACC-271813 paid ACC-946224, which
paid ACC-242954, which paid ACC-233575, three transfers between Mar 4 and Mar 8 -- in about eight
minutes, roughly three of them lost looking for how to ask the question.

## Transcript

**Opening.**

"OK. Two account numbers. So one's probably the alerted one and one's the counterparty
somebody's worried about. Normally I'd pull the transactions for the first one, look for the
second one in the list, and if it's not there I'm pulling transactions for everybody it paid.
That's the part that takes forever."

**1. The search box (Find and expand, "Find the seed").**

She pastes ACC-271813 into the box at the top left, the one that says "This graph" under it.

"First search box I see. Paste. ... It's showing me one result, the account, with a riskScore
next to it. Fine. 'Enter goes to it; Enter again selects it.' Why is that two things? Whatever.
Enter. Enter."

(The render shows ACC-233575 found this way; she assumes ACC-271813 behaves the same, which
the mock's data supports -- it is one of the 3,000 accounts.)

"It found it. There's a little dot on the grey honeycomb thing. I don't know what the honeycomb
is. 'Drawn as density.' Density of what? I'm going to ignore the picture."

**2. The inspector on the right ("Inspect the hit").**

"Right side has the account. flagged, riskScore, kind, country. 'Connections': Neighbors in 3,
out 5, all 8. Neighbors -- that's counterparties, I think? In is who paid it, out is who it paid?
I'm guessing."

She reads the panel top to bottom looking for the second account number or a word like
"connected", "link" or "trace".

"There's nothing here that says 'to another account'. There's a Neighbors button, a funnel, a
pin, three dots. None of them say 'find the connection to'. I'll try Neighbors, that's the
closest thing to counterparties."

**3. The Neighbors menu ("See the size before growing").**

"'Hops from' ... 1 hop, 9 nodes. 2 hops, 975 nodes. 3 hops, 2,356. Hop -- is that one transfer?
One hop from what? From this account I suppose.

Wait, it said 8 neighbours a second ago and now 1 hop is 9. Which is it? Is it counting itself?
That's the kind of thing QA circles.

So I guess I could do 1 hop, look for 233575, not there, do 2 hops, look again. But 975 accounts,
it's even warning me it's a third of the graph. I'm not reading 975 rows. And even if 233575
shows up in there, that tells me it's within two, it doesn't tell me through who. That's the
question."

She closes the menu without choosing.

"And 'Filter to neighbors' -- does that delete the others? Or just hide them? I don't want to
break the data before I've even started."

**4. Looking for another way (still Find and expand).**

"OK there's a bar at the bottom. Arrow thing, a squiggly thing with two circles, a page, 'Quick
actions', a square. Quick actions has words on it, I'll try that."

She thinks about typing "connect" or "path" into Quick actions, then hovers the squiggly icon
first because it is next to her pointer.

"Tooltip says 'Path'. Path. Like a path between two accounts? That's probably it. Why is the one
thing I need an icon with no words, and 'Quick actions' gets words?"

(Moderator note, not said to her: on the inspector page, a single selected node has a labelled
"Path to..." button and two selected nodes get "Paths between...". The transaction screens'
inspector shows neither, so the one place she looked had no route to the question.)

**5. The Path tool bar (Sets and paths, "Path tool").**

"From, To, Run. That's exactly the question. Good. From is already filled in with 271813 because
I had it selected, I think. I paste 233575 in To."

Run is greyed out. Under it: "From is outside the filtered graph. Set Scope to Full graph to
search it." Scope shows a yellow warning mark next to "Filtered graph". The top left says
"Filtered: 1,071 of 3,000 nodes".

"Outside the filtered graph? I didn't filter anything. Somebody filtered this before me. The
right side says 'Left out by riskScore 20 or more'. OK so this account's riskScore is 1 and
whoever set this up only kept the risky ones. That's actually a problem for me: the account I'm
asked about is a low-risk business in Mexico and the view hides it by default.

Fine, it told me what to do. Scope, Full graph. Does changing that change the filter for
everyone else, or just this search? I don't know. I'm doing it anyway."

She sets Scope to Full graph. Run lights up. She presses Run.

**6. The found path (Sets and paths, "Found path").**

"Oh. OK. There it is. Start 271813, then 946224, then 242954, end 233575. Three arrows. And the
table at the bottom switched to the transfers:

- Mar 4, 271813 to 946224, $3,530.28
- Mar 7, 946224 to 242954, $9,782.05
- Mar 8, 242954 to 233575, $9,616.72

That's the answer. That is literally what I'd have spent twenty minutes pulling from three
transaction screens. And -- 9,782 and 9,616. Both just under ten thousand, four days apart, and
the amount goes UP after the first hop. That's not tuition. That's going up to Sarah."

Then she reads the right panel.

"'Found path (unweighted)'. Unweighted, meaning what? '3 hops' -- OK, three transfers, I get it
now that I can see it. 'Weight: amount, not used yet.' Not used yet? Is it going to be used
later? Did I skip a step? 'Paths ignore amount: hops were counted, not dollars.' Fine, so it
found the shortest chain, not the biggest money. I can live with that, I'll write that down.

'Ties: 1 of 2 as short.' Hold on. There's another route that's also three transfers? Where is
it? It's showing me one. If QA asks 'were there other routes' and I say 'yes, one, I didn't look
at it', that's a finding against me. How do I see the second one?"

She clicks "1 of 2 as short"; in the mock nothing opens, and she does not find a way to step to
the second path.

"And 'outside filter' next to the start account, in a dotted box. Yes, I know, you told me."

**7. Checking the other direction (Sets and paths, "No path").**

"Did any money come back the other way? Round-tripping, that's a thing we look for. Swap them."

She puts ACC-233575 in From and ACC-271813 in To, Full graph, Run.

"'No directed path; one exists ignoring direction.' And an 'Ignore direction' button. OK, so
money didn't come back, that's what I wanted to know, I think. 'Ignoring direction' -- if I
press that it's going to show me the same chain backwards, which is meaningless for money, right?
I'm not pressing it. But a newer analyst might, and then write 'money flowed back'."

**8. Getting it into the alert file.**

"Now, how do I put this in the file. One picture, a few lines. There's a bookmark icon at the
top right, tooltip says 'Keep path'. Keep it where? In this project? QA can't open this project,
they open the alert file. I don't see an export for the path. The other screen had 'Export' with
a plus at the bottom of the right side, this one doesn't show it with a path selected.

I'd screenshot it. The picture at 300 percent with start and end labels is actually fine for a
screenshot. And I'd select the three rows of the table and Ctrl+C them, if that works. If that
doesn't work I'm typing them out, which is exactly what I do now."

## Single Ease Question

"Four. Once I was in the From-To thing it was a two. Getting there was the six. I looked right at
the account and it had nothing about connecting to another account, and the hops menu nearly
sent me off reading 975 rows. And then the filter somebody else left on hid my own account."

SEQ: 4 of 7.

## Would she use this instead of her current tool?

"For this question, yes -- a chain of three transfers across three accounts is exactly what my
case system is worst at, and this gave it to me with dates and amounts in one table. For the
queue, no: ninety-something percent of my alerts are one transfer and one customer profile and
I don't need a picture. And it's not my choice anyway. If they gave it to us I'd use it for the
ones with counterparties, and I'd want: the path button on the account itself, a way to see the
other route it says exists, and one button that puts the picture and the three transfers in my
alert file."

## Problems observed

1. **No route from the account to the question.** On the transaction screens the inspector for
   one account shows Neighbors, filter, pin and overflow, but no "Path to...". She looked there
   first, found nothing that meant "connect to another account", and fell into the Neighbors
   menu. The protein inspector does show "Path to..." and "Paths between...", so the two
   screens disagree. Severity 3.
2. **The Neighbors menu reads as the answer and is not.** Hop counts in the thousands with no
   way to learn *through whom*; she nearly planned to grow hops and read the list. Severity 2.
3. **Neighbour counts disagree between two places.** Connections says 8 neighbours; the menu
   says 1 hop is 9 nodes. She read it as an error QA would catch. Severity 2.
4. **The Path tool is an unlabelled icon.** She found it by hovering, not by reading.
   Severity 2.
5. **A filter someone else left on hides the account she was asked about.** The message says
   exactly what to do, which saved her, but she could not tell whether changing Scope changes
   anything for anyone else. Severity 2.
6. **"1 of 2 as short" with no way to see the other.** For an alert file a known, unseen second
   route is a QA finding. Severity 3.
7. **Jargon on the result.** "unweighted", "Weight: amount, not used yet" ("will it be used
   later? did I skip a step?"). The plain sentence under it ("hops were counted, not dollars")
   is the one she understood. Severity 2.
8. **"Ignore direction" on a money graph.** The no-path message is clear, but the offered button
   invites a reading ("money flowed back") that is false for transfers. Severity 2.
9. **No visible way to put the path in the alert file.** "Keep path" keeps it in the project,
   which QA cannot open; no export in sight with a path selected. Severity 2.

## What worked

- The From / To / Run bar is the question in her own words; From was already filled.
- The found path's table: three transfers in order with dates and amounts. She spotted the
  just-under-10,000 pattern within seconds, which is the whole point of the alert.
- The start and end badges on the drawing make the screenshot self-explanatory.
- The out-of-filter message told her both what was wrong and what to press.
- The reverse run answered "did money come back?" in one line.
