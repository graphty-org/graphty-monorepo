# Session: "How is this account connected to that one?" -- Sarah, fraud analyst

Participant: Sarah, level-2 financial crime investigator (composite persona, see
../../personas/fraud-analyst.md). Mode: first impression, not mandated -- about five minutes of
good faith. Screens: the inspector mock, then the find mock, looked at as renders; the page
source was read only to learn what a control does when clicked.

Moderator's task, as given: "How is this account connected to that one?"

## Transcript (think-aloud)

**Opening the inspector page.** "Human protein interactions. TP53. Okay, this is somebody else's
case. Where's my account?" She scrolls past the paragraph at the top without reading it. "There's
a lot of words up here. I'm not reading an essay to find a search box."

She looks for a search box in the first picture. "Top left says 'Full graph', there's a list of
graphs, sets, styles. No box I can paste an account number into. On a real screen I'd hit Ctrl+F
and that searches the web page, not the chart." The tooltip over Neighbors says "Filter to
neighbors, 1 hop: 33 nodes. Ctrl+Z undoes it." -- "Fine, Ctrl+Z works, I like that. 'Nodes' --
you mean accounts."

**Looking for anything with money in it.** Scrolls down the states. Stops at state 15,
"Transfers, March 2026". "Now we're talking. ACC-393859, merchant, US, degree 907. 'Mule ring,
fixed, 14.' Flagged 13 of 14. Amount on the edges, nine and a half million." Then: "Why is the
picture a grey honeycomb? I selected two hops off a merchant and I get a blob and '7,495
selected'. That's the hairball, just shaded in. At least it didn't freeze and it told me the
count. That's the payment-processor problem and it said so -- fine."

"But that's one account. The question is two accounts. How do I pick the second one?"

**Finding two accounts.** Goes to the find mock. "Les Miserables. Thenardier. Okay, somebody's
having fun." Sees the search box top left with "thenard" in it, "2 results in all 77 nodes".
"That's what I wanted on the first screen. I'd paste ACC-393859 in there. Does it match on the
account id or only the name? It says 'group 4, degree 11' under the result -- for me that has to
say account type, owner, opened date." She notices the state list includes "An id not in this
project" and "Found in a recent project". "Good -- if I paste an account that isn't loaded it
tells me rather than showing nothing. I'd want it to say which case file it was in, not 'project'."

"Enter selects. Esc closes. Okay. So I find account one, press Enter. Then I search again for
account two and... does Enter replace the first one or add to it? Nothing here says Shift or Ctrl
to add. In i2 I Ctrl-click. I'd guess Ctrl-click on the second result. If that drops the first
one I'd be annoyed."

**Getting the connection.** Back to the inspector, state 8, two things selected. "'2 selected',
'edges between: 0'. Zero. So they're not directly connected -- that's actually the first thing I
want to know, so that's useful." Sees the blue "Paths between..." button. "That's the button. I
wouldn't have known to select two first, but once two are selected it's right there."

The popout: From TP53, To SMAD3, "Weight by: None: count hops", "Undirected", Run. "Undirected. No.
Money goes one way. If A pays B and C pays B, that's not A connected to C through B the way a
path from A to C by money flow is. I need 'follow the money from this one to that one' -- out of
A, into B. There's a swap arrow, fine, but if the graph doesn't know direction, swapping does
nothing." Weight by: "Count hops is right for the first look. I don't want it weighted by amount
unless it says what that means."

State 11, found path. "3 hops, 1 of 12. Twelve equal paths -- okay, so there are twelve ways
through and it shows me one at a time with arrows. I'd rather see all twelve on a list with the
middle accounts named, because the one account that shows up in all twelve is my hub." The
members list: TP53, MSH2, UBB, SMAD3, with confidence on each link. "For me that has to be:
account, then the transfer -- amount, date -- then the next account. Where's the amount? Where's
the date? A path that doesn't say 'Tuesday 10,000 in, Wednesday 9,800 out' is a drawing, not
evidence. And the order matters -- if the money from hop two happened before hop one, it's not a
flow, it's a coincidence."

"'Create path to style' -- no idea what that means and I wouldn't click it. 'Kept' path in
state 12 -- I think that saves it so it's there tomorrow? I'd want it to say 'saved to this case'."

**Export.** "Export at the bottom, a copy icon and a plus. What does the copy give me? A picture?
A list? I need the path as rows: from, to, amount, date. If I can paste that into Excel I can put
it in the SAR." Also sees "Export files..." top right. "Two exports. Which one is the CSV?"

**Where's the timeline.** "No timeline anywhere on these screens. That's the second thing I'd ask
for."

## Outcome

Partial success. She works out the route -- find each account, select both, "Paths between...",
Run, read the hop count -- and the "edges between: 0" line answers the first half of her
question straight away. She cannot finish the question the way her case needs it: the path is
undirected, carries no amounts or dates, and she is unsure how to add a second account to the
selection from Find, or which export gives her rows.

Single Ease Question: 4 of 7. "I could get to 'three hops' in a couple of minutes. I couldn't get
to 'here's the money moving' at all."

Would she use it instead of her current tool? "Not instead of anything, today. Next to i2 on the
big cases, maybe -- the search box and the 'paths between two accounts, three hops, twelve ways'
is quicker than drawing it by hand. But until the path shows amounts and dates and respects which
way the money went, I'd still rebuild it in Excel for the reviewer, so it hasn't saved me the
afternoon. And someone has to tell me it doesn't upload anything."

## Problems seen

1. Path search is undirected with no option for direction; money-flow questions need "out of A,
   into B". (severity 3)
2. A found path lists accounts and a per-link score but no transfer amount or date; the hops can
   be in impossible time order and nothing shows it. (severity 3)
3. Adding a second account to the selection from Find is not shown; Enter "Select" looks like it
   replaces. (severity 2)
4. "Paths between..." only appears after two things are selected; nothing on a single account
   hints you can ask for a path to another one except "Path to..." in the protein mock, which
   she did not connect to her task until she saw state 8. (severity 2)
5. Twelve equal paths are shown one at a time; she wants them listed, with the account common to
   all of them called out. (severity 2)
6. Two export controls (Export files... and the Export row) with no word for what each gives;
   she needs a CSV of the path. (severity 2)
7. Find's result line shows "group, degree" -- not account fields she recognises. Data-dependent,
   but the default subtitle is developer vocabulary. (severity 1)
8. Most mocks show protein or novel data, so she spent the first minute asking "where's my
   account". (severity 1; a test-material issue, not a design one)
