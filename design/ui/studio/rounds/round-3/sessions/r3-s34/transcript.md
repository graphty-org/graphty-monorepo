# Session r3-s34 -- Dana Okafor (supply chain risk analyst), task T11: untangle the drawing (Les Miserables)

Task as given: practice on the ready-made Les Miserables network; try a different way of arranging
the dots so the clusters of characters are easier to tell apart, and say whether it helped.

All commands run from design/ui/studio with S=rounds/round-3/sessions/r3-s34.

## Step 1 -- start

Command: `node tool/real.mjs --start $S empty` -> 01.png

Saw: a dark start page. "Start" (Open project or file, New from data), "Recent projects" (empty),
"Samples" with Les Miserables (77 characters) at the top. A consent box at the bottom: "Your data
is yours, but please help us", with "Share usage data" / "No thanks". "Files are read on this
computer and never uploaded" -- good, that answers half my IT question. The grey description text
is small; I am squinting.

Next: say No thanks (I never share usage data from a work laptop), then open Les Miserables.

## Step 2 -- dismiss consent, open the sample

Command: `--step $S --click "No thanks" --click "Les Miserables"` -> 02.png

Saw: the picture loaded straight away. 77 nodes, 254 edges in a panel on the right ("Density",
"Components" -- words I skip). The drawing is a blob in the middle with a fan of dots hanging off
the bottom and a little group top-left and one on the right. No names on the dots, so I cannot
tell who is who. Nothing is moving, which I like.

I am looking for something that says "arrange" or "rearrange". Left side has Selection /
Everything. Bottom toolbar has four icons with no words: a flask, something that looks like a
little chart with dots, "3D", and a magnifier. I will not touch 3D. The chart-with-dots icon might
be about arranging. Hovering it first to see what it is.

## Step 3 -- hover the dots icon

Command: `--step $S --hover-at 728,864` -> 03.png. Tooltip: "Layout".

Hesitation: "Layout" to me means page layout -- margins, where the panels sit. I nearly moved on.
But the icon is dots on a chart, and none of the other icons fit "arrange the dots" better (the
flask is presumably "Analyze", per the hint on the left). Clicking it to see.

## Step 4 -- open the Layout menu

Command: `--step $S --click "Layout"` -> 04.png

Saw: a list. "Force -- Recommended" is ticked. Then Circle, Rings around a node (greyed, "Select
a node first"), Grid, Rings by group (greyed, "Needs a node attribute to group by"), Spiral,
Spectral, No crossings (greyed, with a line saying 'the layout "planar" cannot draw this graph
without crossings: G is not planar' -- that reads like an error message from a program, not for
me), Random, Tree (greyed), Two columns and Columns by group (both greyed, need a node attribute),
Keep positions.

Reaction: "Rings by group" and "Columns by group" are the ones that sound like clusters, and they
are both greyed out. What is a "node attribute to group by"? These characters do not come with a
group, I suppose. "Spectral" -- I do not know what that word means here. "Force" is what I already
have. The grey hint lines are tiny.

Next: the only plain-English options are Circle, Grid, Spiral, Random. I will try Circle -- at
least I know what a circle is.

## Step 5 -- pick Circle

Command: `--step $S --click "Circle"` -> 05.png

Saw: it did not rearrange yet; it opened a small settings card. "Places every node on one circle,
in the order the nodes were loaded." Shape: 3D (selected) or 2D. Scale: 1. Advanced. "Under a
second". Apply.

Hesitation: "in the order the nodes were loaded" -- so it will not put friends next to each
other, it is just a ring in file order. Probably not going to help with clusters. Also, why is a
circle "3D" by default? I want flat. I will try it anyway since it is under a second: 2D, Apply.

## Step 6 -- choose 2D, Apply Circle

Command: `--step $S --click "2D" --click "Apply"` -> 06.png

Saw: every dot on one big ring, lines criss-crossing through the middle like a spider web. Worse
than before -- the little groups I could see before are gone. A few dots (top right, bottom left)
have big fans of lines, which tells me who is busy, but not who belongs together. Also the
toolbar button still says "3D" although I chose 2D. Odd.

Next: back to the Layout menu. The two "by group" ones are greyed. I do not know "Spectral", but
clicking a choice only opens a card with a sentence, so I will peek at what Spectral says before
I run anything.

## Step 7 -- peek at Spectral

Command: `--step $S --click "Layout" --click "Spectral"` -> 07.png

Saw: "Places nodes from the graph's own structure, so densely connected groups land near each
other without any grouping being named. Draws flat." That is exactly my ask -- groups land near
each other, and I do not need to supply a group. I would never have guessed it from the word
"Spectral"; the sentence sold it. The sentence is small grey text though, I had to lean in.

Next: Apply.

## Step 8 -- Apply Spectral

Command: `--step $S --click "Apply"` -> 08.png

Saw: almost everything is crushed into one tight lump at the bottom right, half of it hidden
behind the toolbar, with a string of three dots running off to the left and two dots on a long
stick up to the top. That is not "groups land near each other", that is one pile. The promise in
the sentence did not match what I got. I would not show this to anyone.

Next: maybe the groups are inside the lump and it is just zoomed out. I will scroll in on the
lump once before giving up on this one.

## Step 9 -- scroll in on the lump

Command: `--step $S --wheel 885,830,-600` -> 09.png

Saw: barely zoomed, and the lump slid further down, now partly off the bottom edge and under the
toolbar. Zooming did not zoom toward where my mouse was the way I expected in a map. Not worth
fighting. Spectral is out.

Next: go back to the Layout menu and open "Force -- Recommended" (what I started with) to see if
it has a setting to spread the groups apart.

## Step 10 -- open the Force card

Command: `--step $S --click "Layout" --click "Force"` -> 10.png

Saw: "Pulls connected nodes together and pushes unconnected ones apart until the shape stops
moving, in three dimensions or, with 'dim: 2', flat." -- that 'dim: 2' bit is programmer talk,
but I get the idea: connected ones pull together, so groups should form. Shape 3D / 2D, "Spring
length" 30, "Gravity" -1.2 (a negative gravity? no idea). Advanced.

Hesitation: I do not know what these numbers do. A longer spring sounds like more room between
dots, so maybe the groups separate more. I will choose 2D (flat, for a slide), set spring length
to 80, leave gravity alone, Apply.

## Step 11 -- Force, 2D, spring length 80, Apply

Command: `--step $S --click "2D" --click "Spring length" --key Control+a --type "80" --click "Apply"` -> 11.png

Saw: the dots spread evenly over a big square with lines everywhere. Even worse than what I
started with: the little top-left group and the bottom fan that I could see at the start are gone.
Every dot is the same distance from every other dot. My guess about "spring length" was wrong, and
nothing told me what a sensible number is. Also the bottom toolbar STILL says "3D" though I picked
2D twice now.

Next: one last try -- the same Force but back to the default spring length of 30, flat. If that
is not better than the start, I put it back the way it was and stop.

## Step 12 -- reopen Force

Command: `--step $S --click "Layout" --click "Force"` -> 12.png

Saw: the card remembers 2D and 80, and the button now reads "Applied" (greyed). There is a small
"x" next to the 80 -- I take that to mean "put it back to the default". Clicking the x, then Apply.

## Step 13 -- reset spring length

Command: `--step $S --click-at 898,700` -> 13.png. The point was `button "Reset Spring length to
default"`. Good, the x does what I guessed.

## Step 14 -- Apply Force, flat, default spring

Command: `--step $S --click "Apply"` -> 14.png

Saw: this one is actually better than where I started. I can now pick out separate groups: a
tight bunch top right, a smaller ring of about eight on the left, a knot at the bottom, a fan of
six dots hanging off one dot on the far left (one hub with hangers-on), and a busy middle. At the
start the middle was one smear and the groups overlapped; flat, they sit apart. I would call that
"easier to tell apart", not "obvious" -- there is no colour per group, and no names on the dots,
so I still cannot say who is in which bunch.

I stopped here: the drawing is better than the start, and I would not keep guessing numbers.

Command: `node tool/real.mjs --end $S`

## In character, at the end (Dana)

**Did I finish?** Yes, mostly. The flat version of "Force", with the default numbers, separated
the groups more clearly than what the sample opened with. It took me four tries to get there,
and the one that worked was basically "the recommended one, but flat" -- I found that by accident
while trying to undo my own bad guess.

**Did it help?** Yes, somewhat. Flat, I can see four or five bunches with space between them,
where the starting picture was one overlapping blob in the middle. But I still could not tell a VP
"these are the groups" -- nothing coloured them and nothing named them.

**Ease: 3 out of 7** (somewhat difficult).

**What confused me:**

- The button is called "Layout". To me layout means page layout; I only clicked it because the
  icon had dots on it and nothing else fit.
- The two options that sounded like what I wanted -- "Rings by group", "Columns by group" -- were
  greyed out with "Needs a node attribute to group by". I do not know what a node attribute is or
  how to get one, and it did not point me anywhere.
- "Spectral" had the best sentence ("densely connected groups land near each other") and the
  worst result: one lump in a corner, half behind the toolbar, plus two stray arms. The sentence
  promised something the picture did not deliver, which makes me trust the other sentences less.
- "Circle" is "in the order the nodes were loaded" -- useless for groups, and it defaulted to 3D.
- Force's settings are physics words with bare numbers: "Spring length 30", "Gravity -1.2" (a
  negative gravity?). Nothing said what a sensible range is, and my guess of 80 made it worse.
  The description also says "with 'dim: 2'", which is code, not English.
- Everything defaulted to 3D. I chose 2D three times and the toolbar button kept saying "3D".
- No "go back to how it was" in the Layout menu; I used the field's x and the Recommended choice.
- Grey helper text everywhere is very small and low contrast; I had to lean in for every hint.
- No labels on the dots at all, so even when it got better I could not check whether the bunches
  made sense ("is that Valjean's lot?").

**Would I use it?** For practice, fine. For my own suppliers I would want the groups coloured and
named, and a picture I could drop on a slide. And I still need to know whether IT would approve it
-- "Files are read on this computer and never uploaded" on the start page is the first thing I
would show them.
