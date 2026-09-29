# Session: the quiet weight trap -- Elena, first-time graph user

Task as given by the moderator: "The Les Miserables edges carry a number. Rank
the characters, then tell me whether you trust the ranking and why."

Screens used: the weight-role-trap storyboard (the load question, the result,
the result's own card, the Edges settings, Out of date, the re-run), the Run a
measure menu, the main menu's Algorithms list, the inspector. Played at 1440
by 900, long clock (a curious afternoon, no deadline). Elena has heard of Les
Miserables (the musical), not read it.

## Think-aloud

**1. Dropping the file in (the load dialog).**

"OK, I dragged it in and... it's asking me something before it'll show me
anything. 'Open miserables.json.' 77 nodes -- those are the characters, I
guess, the dots. 254 edges. Undirected. Isolated nodes zero. OK, zero of
something is fine, I think.

Then a box. 'Edge attribute value.' I don't know what an edge attribute is.
There's a little bar chart, one tall bar and then it drops off. 'Whole numbers,
1 to 31, most edges 1 to 3.'

'For value, a higher number means...' Hm. I don't know what the number is. The
moderator said the lines carry a number, that's all I've got. It's just called
'value'.

Four choices. 'A longer or costlier step.' Step of what? 'A closer or stronger
link.' 'More can pass through.' 'Don't use value.'

(She reads only the bold labels. The grey text to the right of each row goes
unread at this point.)

My first instinct is 'Don't use value', because I don't know what it is and I
don't want to break it. ... But then why is it asking? If the number's in there
it's probably important. And the moderator said the number specifically, so
she probably wants me to use it.

A higher number on a line... that's more of something between two people.
More connection. So 'a closer or stronger link.' That's the one that sounds
like more is more. 'Costlier step' sounds like a shipping thing.

(Pause, cursor over Load.)

Is this going to lock me in? It doesn't say I can change it later. I'll just
go with it."

(Elena chose "a closer or stronger link" -- the correct reading for this
file -- because "stronger" matched her idea that a bigger number means more,
not because she knew the number counts shared scenes. She did not read "such
as a count of shared scenes" in that row's grey text. Asked afterwards, she
could not say what "value" was.)

**2. The picture.**

"Ooh. OK, colours. That's nice. Valjean is the big yellow one in the middle,
I know him. Fantine up top. Cosette. Javert right next to Valjean -- makes
sense, they're enemies, they'd be close.

(A wrong reading: the layout puts them near each other because they share
many edges, not because of their relationship in the story. She does not
check.)

Group colour, 'group', 2, 8, 4, 1. What are the groups? Just numbers. 2 is
yellow and has 14. I don't know what 2 means. Skip it."

**3. Trying to rank.**

"Rank the characters. I'd want a list. Is there a table? ... There's a Nodes
tab at the bottom, it just has 'label'. No numbers to sort by.

I'll click the big dot first."

(She clicks Valjean. The inspector shows his details. She reads the name and
the group, finds no rank, and closes it.)

"Nope. Um. The lightning bolt at the bottom, maybe that does something."

(She opens Run a measure from the toolbar. Seen on the run-and-read screen.)

"'Run a measure.' Centrality, Community, Structure. I don't know any of these
words. Betweenness. Closeness. Eigenvector -- no. PageRank, that's Google,
right? That ranks things.

(She hovers Betweenness first because it is at the top and highlighted.)

'How often a node lies on the shortest paths between other nodes: the brokers
and bottlenecks.' OK, brokers. The one in the middle of everything. That's
what I'd call important. 'Click to run.' I'll try that one. I was going to try
PageRank but this one has a sentence I understand."

**4. Reading the result.**

(The re-run state of the storyboard, reading value as a closer link.)

"Oh, it just did it. There's a column now, 'betweenness', sorted. Valjean
0.795, Marius 0.499, Myriel 0.224, Fantine, Courfeyrac, Thenardier, Gavroche.

Valjean first, good, he's the main character, so it works. Marius second,
he's the young guy in love with Cosette, right? OK. Myriel, the bishop --
he's barely in it, isn't he? He's at the start. Hm. But he's third. Maybe
because he's the one who starts everything.

0.795. Is that a lot? It says '0 to 0.795' at the top of the column, so I
guess Valjean's the max. So it's out of... 0.795? That's weird. I'd rather
it said a percentage.

And the big dots are the high ones, I think -- Valjean's big, Marius is big.
So the size is the ranking.

(The dot size in the picture is not betweenness; the storyboard does not
style size by this result. She does not look for a legend for size, and there
is none on screen.)

On the right it says 'Betweenness, Weight: value, used as similarity.' I said
'closer or stronger'. Is similarity the same thing? I guess they're
translating what I picked. I didn't pick similarity, though."

**5. Moderator: "Do you trust it? Why?"**

"Yeah, mostly? Valjean's at the top. If he wasn't, I'd say it's broken. And
Javert's not in the top few, which surprised me, but maybe he's more of a
'one person' guy, he's only chasing Valjean.

Why do I trust it -- honestly, because the top one is the one I'd have
guessed. I don't know what the numbers mean."

**6. Moderator probe: shows her the same file loaded with "a longer or
costlier step" instead (the storyboard's first result state).**

"Wait. Valjean, Gavroche, Javert, Myriel, Thenardier. That's a different
list. Gavroche is second here and he was seventh in mine. Marius isn't even
up there.

Which one's right? ... Mine? Because I picked 'stronger'? I picked that
because it sounded nice. If I'd clicked the first button I'd have this one
and I'd have told you I trusted it, because Valjean's on top in both.

So the top one tells me nothing. OK. That's kind of bad.

Where would I have found out? It said 'used as distance' there on the right.
I would've read that as... I don't know. Distance between dots on the screen?"

(Asked whether she could switch her own result to the other reading, she
clicked the Weight row in the right panel after a nudge -- "there's a Weight
line, what does it say?" -- and found the Edges card: Direction, Weight,
"A higher value means" with a drop-down. She did not change it: "If I change
this does it redo everything? I'd want to see the old one first." She did not
notice the Detach control on the result card.)

**7. Moderator: "What would have told you which one to pick?"**

"If it said what the number was. Like 'number of scenes together'. Then
obviously more is closer. It just said 'value'. Is that in the file? I don't
know what's in the file, I just dragged it."

## Single Ease Question

3 of 7. "Getting a list was OK once I found the lightning bolt. Knowing if the
list is right, I couldn't do. I got lucky on the first question."

## Would she use this instead of her current tool?

"Not for this. My current tool is a spreadsheet, and there I'd just sort by
how many lines each person has and I'd understand the number. This gave me a
fancier number that changes depending on a question I didn't understand. I'd
use it to look at the picture, maybe. I wouldn't put the ranking in front of
my VP."

## What happened, in brief

- She got the reading right by accident: "a closer or stronger link" matched
  a lay idea that more is more, not the fact that value counts shared scenes.
  The row that says "such as a count of shared scenes" was grey helper text
  she did not read. Nothing in the dialog names what the file's number is.
- She trusted the ranking because the character she already knew was on top.
  Both readings put Valjean on top, so her check passes the wrong ranking too.
  Shown the other list, her trust collapsed and did not recover.
- The dialog says "closer or stronger link"; everything after says
  "similarity" or "distance". She did not connect "used as distance" to her
  own answer and read "distance" as screen distance between dots.
- She found no way to rank from the table or the canvas; ranking needed the
  toolbar's lightning bolt, found on her third try after clicking the biggest
  dot. She chose Betweenness because its hover sentence was the only one she
  understood, not because it fit the task.
- She read dot size as the ranking. It is not; nothing on screen said what
  size meant.
- The Weight row led to the right place once pointed at, but she would not
  change it without seeing that the old result would survive.
- "0 to 0.795" read as a scale with an odd maximum; she wanted a scale she
  could say in a sentence.
- Fear of lock-in at Load: nothing on the dialog says the answer can be
  changed later.
