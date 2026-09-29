# How is this account connected to that one? -- Marcus, criminal intelligence analyst

Participant: Marcus, 44, criminal intelligence analyst at a state fusion center; daily tools i2
Analyst's Notebook, Excel, a phone-records tool. Simulated participant, round 1.

Task as given by the moderator, and nothing more: "How is this account connected to that one?"

Screens used: the inspector mock (starting at its first state) and the Find mock, looked at as
static renders; the HTML was read only to see what a control would do if clicked.

Outcome: finished only with help from the mock itself -- he guessed the tool, could not see how
to give it two ends, and read the answer off a later frame. Ease rating 3 of 7.

---

## Transcript

**First screen: the inspector at rest.**

> "OK. 'Human protein interactions'. TP53, BRCA1... these aren't accounts, these are genes. Fine,
> it's a demo, I'll pretend TP53 is my account and SMAD3 or whatever is the other one."

> "Left side I've got Graphs, Sets and paths, Styles. 'Sets and paths' -- paths. That's promising,
> that's the word I want. But there's nothing in it that's a path, it's 'DNA repair' and 'TP53
> partners'. There's a plus next to it. I'm not clicking a plus to make a path out of thin air, I
> don't know what it wants from me."

> "Right side, TP53 is selected. Top row it's got three little icons -- the tooltip says 'Select
> neighbors, 1 hop: 33 nodes'. OK, that I get, that's pulling his contacts. Funnel is probably
> filter. The thumbtack, pin. Nothing says 'path to' or 'connect to'. In i2 I'd select both guys
> and hit Find Path. Where's that?"

> "Degree 32, number 2 of 300. Betweenness 0.113, number 2 of 300. At least it tells me the rank,
> I can say 'second highest' to a sergeant. 0.113 of what, I still couldn't tell you."

**Looking for a way to start from two people.** He looks at the three-dots menu on the TP53 row.
It is not open in any render, so he cannot see what is in it.

> "Three dots. Maybe it's in there. Can't see it. Moving on."

He looks at the toolbar at the bottom of the canvas: an arrow, a squiggly-line icon, a sticky note,
a lightning bolt.

> "Arrow's select. Sticky note's a note. Lightning bolt I have no idea -- 'AI'? I'm not touching
> that on a case. The squiggle... it looks like a road sign, a route. That's my best guess for
> 'path'. There's no label on it, no tooltip showing. I'd hover it and hope."

(The squiggle icon has no name or tooltip in the mock and does not open anything; there is no
frame showing how the two ends are picked.)

> "So I click it. Then what? Do I click A, then B? Does it ask me for names? Does it want me to
> type an account number? There's nothing here that shows me. On a real case I've got two account
> numbers on a sticky note from the case agent. I want to type both of them in."

**Trying Find instead.** He switches to the Find mock, since typing the account number is what he
would really do.

> "OK, a search box at the top left. I type 'thenard' and it gives me Thenardier and
> Mme.Thenardier, group 4, degree 16. Good, it's fast, it matches half a name. That's the first
> thing I'd do with an account number -- find it."

> "Now I've got one of the two. Right side has Thenardier, and the same three icons again -- the
> neighbors one, the funnel, the dots. Still no 'path to'. So Find gets me ONE account. The
> question is about TWO."

He looks at the second Find frame, where Marius is found but is outside the current filter.

> "'Not in the filtered graph: left out by Filter out group 8. Not drawn; not in any count.' OK,
> that's honest, I'll give it that. Somebody filtered him out earlier and it says so instead of
> pretending he isn't there. That's the kind of thing that bites you on the stand. 'Add selection
> to step' -- I don't know what a step is. I'd just want to see him."

He looks at the lightning-bolt panel open with "who matters most" typed in.

> "Oh, so the lightning bolt is a command box. You type a question and it gives you... Degree,
> Betweenness, Closeness, PageRank, Eigenvector, Katz, HITS. 'Who sits between groups' next to
> betweenness -- that's my middleman, good, that one line is the explanation I wanted. But I don't
> need 'who matters most', I need 'how is A connected to B'. I'd type 'path' or 'connected' in
> here. Nothing on the screen tells me whether that works."

He looks at the frame where a name typed into that box is handed back to Find.

> "Typed 'marius' and it says 'No commands match -- Find marius'. So it bounces me back to search.
> Round and round."

**The answer, when he finally sees it.** He goes back to the inspector page and reaches the found
path frame.

> "There it is. 'Found path. 3 hops. 1 of 12.' From TP53 to SMAD3. Walk order: TP53, MSH2, UBB,
> SMAD3, and between each one a number. OK -- THAT is what the sergeant wants. A goes to this guy,
> this guy goes to that guy, that guy goes to B. Three hops. If this had been my first screen I'd
> be happy."

> "But the description says she 'ran the Path tool'. I never saw the Path tool. I saw the answer.
> I'd have to be shown how to get here -- or I'd have given up on the toolbar."

> "'1 of 12'. Twelve paths of the same length? And it shows me one and a little arrow to flip to
> the next? No. If there are twelve ways A reaches B, I want to see all twelve at once, and I want
> to know who's in ALL of them. The guy who's on every route is my target. Flipping through one at a
> time and writing them down on paper is what I do in i2 already."

> "Each link says 'confidence 0.82', 'confidence 0.53'. Confidence of what? Who graded it? For me a
> link is 'called 14 times between March 3 and March 20', with the phone record it came from. If I
> click that line I need the record. 'Weighted by: hops, no weight' -- so it doesn't care that one
> pair talked forty times and another pair talked once. That matters. The strongest route and the
> shortest route aren't the same thing."

> "On the chart the path is a black line through the middle of the hairball. TP53 and UBB have
> labels, the one in the middle -- MSH2 -- doesn't, I can't find him on the picture. And everybody
> is still a circle. Which of these is a person and which is a phone? I can't put this in front of
> a prosecutor."

> "Then there's a 'Create path' / 'Create path to style' business. So the path isn't saved unless
> I press something. Fine -- I'd press it, because I'll need it next week. The wording 'Create path
> to style' I don't follow; I just want 'Keep this'."

**After the task.**

Single Ease Question: **3 of 7.**

> "Three. The answer screen is good -- honestly better than a lot of what I've seen, it walks
> the route in order and says how many hops. But I couldn't have gotten there on my own. The
> button has no name, nothing tells me how to give it two ends, the search gets me one guy at a
> time, and the command box only answered 'who matters most'."

Would he use it instead of his current tool?

> "Not yet. In i2 I select two entities and hit Find Path, and every link on the result has the
> record behind it. Here I'd spend my five minutes figuring out the squiggly button. If you give me
> a box that says 'From' and 'To' where I can paste two account numbers, show me ALL the equal
> routes with the guy in the middle of all of them lit up, and let me click a link to see the
> transfers behind it -- then yes, I'd take it over drawing it by hand. And I still need to know
> where my data goes before I put a real account number in it."

---

## Problems observed

1. The path tool on the bottom toolbar is an unlabelled icon with no visible name or tooltip, and
   no frame shows how the two ends are chosen. He found it by guessing from the shape.
2. A selected account's first row offers neighbors, filter and pin, but no "path to...". The
   commonest investigator question has no entry point where he is already looking.
3. Find finds one entity at a time; there is no way to type or paste both ends of the question.
4. The command box has no answer to "how is A connected to B"; only "who matters most" is shown,
   and a typed name is handed back to Find.
5. "1 of 12" equal paths shown one at a time with a stepper. He wants all equal-length routes
   together and the people common to every route.
6. Link values on the path ("confidence 0.82") have no unit, source or grade; he cannot trace a
   hop to its record.
7. "Weighted by: hops, no weight" -- the shortest route ignores how strong each link is (number
   of calls or transfers), and the choice is not offered where he reads it.
8. On the canvas the middle person of the path is unlabelled and every entity is the same circle,
   so the picture cannot go to a prosecutor.
9. "Create path to style" wording is unclear; he reads "Create path" as "keep it" but not the rest.

What he liked: the path's members listed in walk order with the link between each pair; the hop
count; ranks beside scores ("#2 of 300"); the one-line plain explanation of betweenness ("who sits
between groups"); the honest note that a found person is left out by a filter.
