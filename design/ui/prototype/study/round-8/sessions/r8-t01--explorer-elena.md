# Session: first look at the Les Miserables sample -- Explorer Elena

Task given: "You have never used this program before. A friend said it turns a list of connections
into a picture that shows who matters and how people cluster. You have no file of your own today,
so you will practice on the ready-made network of characters from the novel Les Miserables that
comes with the program. In one sitting: get that network on screen, have the program work out
something about the characters (for example who matters most, or which of them belong together),
make the drawing show that result in its colors or sizes, get the characters' names written on the
drawing, and finish with a picture file you could paste into a document. Say out loud when you
think each part is done."

Participant: Explorer Elena (first-time graph user, product manager, no graph vocabulary).
Clock: curious afternoon (long), no deadline.

All commands were run from `design/ui/prototype`. Renders are in
`tmp/round-8-sessions/r8-t01--explorer-elena/`. `$D` below stands for that folder's absolute path.
Every command was prefixed `timeout 120 node app-b/study.mjs --try $D/NN.png task:r8-t01`; only the
steps are listed.

## Transcript

**01 -- start screen** (shots/tasks/r8-t01/01.png)

> OK, a big box at the bottom about my data. "No thanks." On the right there's a list of samples
> and Les Miserables is the first one. Good, "77 characters", that's small enough to not be scary.

**02** -- `--click "No thanks" --click "Les Miserables"`

> Oh, that was quick. Lots of dots, some with names. Valjean in the middle, Cosette, Javert. OK.
> **Part one done -- it's on screen.**
>
> But... there's already a whole list on the left. PageRank, Louvain, Shortest paths, "Top 9 by
> de...", "For the report"... and the dots are already all orange, and there's a little box that
> says "Color: PageRank". Did somebody already do the homework? I'm supposed to make the program
> work something out. I don't want to just take credit for what's already there. Where's the
> "work it out" button?

**03** -- `... --hover "Analyze"` (the little flask at the bottom)

> Flask thing says "Analyze". Sounds like the button.

**04** -- `... --click "Analyze"`

> A list. "Search, or say what to find" -- nice, but I'll just look. "Rank nodes and edges",
> PageRank with a little "Start here" tag. Degree, Betweenness, Closeness, Eigenvector... I don't
> know any of those. "Which nodes are connected to other well-connected nodes" -- OK that's kind of
> "who matters". And it says Start here, so I'll do what I'm told.

**05** -- `... --click "Start here"`

> Hmm. Weight, "value (loaded weight)", "Higher means: Stronger, Farther, Capacity", Damping 0.85.
> I have no idea. I'm not touching any of that. "Under a second", fine.
>
> Two buttons. "Run as copy" and "Update PageRank row". I don't know what a row is here. "Copy"
> sounds safer -- I won't break whatever's already there.

**06** -- `... --click "Run as copy"`

> "Would add PageRank as a copy at the top of the list, running..." Would? Did it or didn't it?
> Nothing changed in the picture. Nothing new at the top of the list that I can see. Maybe I need
> the blue one.

**07** -- `... --click "Update PageRank row"`

> OK! Now there's a "Top 10" on the right. 1 Valjean, 2 Myriel, 3 Gavroche, 4 Marius, 5 Javert.
> Valjean is the main guy, makes sense, he's the hero. Myriel second is a surprise -- isn't he the
> bishop from the very beginning? Huh, maybe he's in a lot of chapters.
> **Part two done, I think -- it worked out who matters most.**
>
> It says "Ran Sep 28". Today's not Sep 28... did it actually run just now or is it showing me the
> old one? I'll trust it, the list is there.
>
> Now the colors. The box at the top says "Color: PageRank, 0.00330 to 0.0754". So the colors
> already ARE the result? Darker brown is more important I guess -- Valjean is the dark one. But
> honestly they all look the same orange to me. On a slide nobody's going to see that. I want the
> important ones BIGGER.

**08** -- `... --click "Style" --click "Shape"`

> Style tab: Fill, Color "Orange to brown". Shape, Effects, Label, Tooltip, each with a plus. I
> clicked "Shape" and nothing happened.

**09-11** -- `... --hover "+"` (nothing on screen is called "+"), `... --click "Add Shape"`
(nothing called that), `... --hover "Add"` (tooltip: "Add to Shape")

> Oh, it's the little plus on the right. "Add to Shape".

**12** -- `... --click "Add to Shape"`

> Menu: "Shape" or "Size". Size!

**13** -- `... --click "Size"`

> "Size 1". And a little can icon next to it, and a minus. Size 1 for everything? I want it to
> follow the importance thing, not be 1. The can thing maybe? I don't know what it is. I pointed at
> it and nothing told me anything.

**14-15** -- `... --hover "data"` (no tooltip), `--hover "Size from data"`, `--hover "Use a column"`,
`--hover "Bind"` (none on screen), `--hover "column"`, `--hover "value"` (no tooltip), then
`... --click "column"`

> I clicked what I thought was that icon and instead a table opened at the bottom and a "Columns"
> box with checkboxes -- label, group, betweenness, degree. That's not what I wanted. That table
> is kind of nice actually -- "Valjean is first on all three measures" -- but I just wanted big
> dots.
>
> Forget the sizes. The legend says the color is PageRank, so the drawing does show the result,
> in colors. **I'll call part three done**, even though I didn't really do it, it was already
> like that, and I can barely see the difference between the oranges.

**16** -- `... --click "Labels show"` (the "Labels show... 1 node" row on the left)

> Names. There's a "Labels" thing on the left that says "1 node". Click... "Labels shown anyway
> (this file): Valjean. Opens in the inspector (not available yet)". Not available yet. OK, wrong
> place. I'll go back to that Style panel, it had "Label" with a plus.

**17** -- `... --click "Style" --click "Add to Label"`

> "Label line" or "Show labels". Show labels, obviously.

**18** -- `... --click "Show labels"`

> A "Show labels" checkbox, but it's empty. So I have to tick it too.

**19** -- `... --click "Show labels" --click "Show labels"`

> Ticked. And... the picture looks exactly the same. Fantine, Myriel, Cosette, Valjean, Javert,
> Marius, Gavroche, the ones at the bottom. Most of the dots still have no names. Did I do it
> wrong? Maybe it only puts names on the important ones. That's actually what I'd want anyway --
> if it put all 77 it'd be a mess. **Part four... sort of done?** Some names are on it. I'm not
> sure I did anything.

**20** -- `... --click "Menu"` (the three lines, top left)

> Picture file. Usually it's under the menu. Yes: "Export... Ctrl+E".

**21** -- `... --click "Export..."`

> Image, PNG, with a little preview with the legend in the corner. Good. "64 labels hidden to
> avoid overlap" -- oh! So that's why. It IS putting names on, it just hides most of them so they
> don't pile up. OK, I didn't break it. "To share -- PNG, 2x". Fine. There's a Copy button too,
> which is what I'd really do to paste into a doc, but Export is the blue one.

**22** -- `... --click "Export"`

> "Exported les-miserables.png to Downloads." **Done, part five.**
>
> Wait -- the Style panel on the right. Before, it had my "Show labels" ticked under Label. Now
> the Label section is just the plus again, no checkbox. Did exporting undo my labels? The picture
> looks the same, so... I don't know. I'm not going to go poking at it.

## After the task

**Did I succeed?** Mostly, I think. I got it on screen, it told me Valjean, Myriel and Gavroche
matter most, and I have a PNG in Downloads. But two of the five parts were already done before I
touched anything -- the colors were already PageRank and the names were already on -- so I can't
really tell you I made the drawing show the result, or that I put the names on. I tried to make
the important ones bigger and couldn't. And I'm not sure my labels setting stuck.

**Single Ease Question:** 4 out of 7. Getting it open and exporting were easy. The middle was
guesswork: "Run as copy" said "would" and didn't seem to do anything, the size thing just said 1,
and the label checkbox changed nothing I could see.

**Would I use this instead of what I use now?** Maybe, for the picture. I don't have a tool for
this today, so the bar is low -- it's in the browser, nothing to install, it said nothing gets
uploaded, and the Top 10 list was the most useful thing I saw: I could paste "Valjean, Myriel and
Gavroche matter most" into Slack. But I'd want someone to show me how to make the big ones bigger
before I put it in front of my VP. All-orange dots won't convince anyone.

## Moments worth noting (participant's own words, condensed)

- The sample opens already full of results (colors by PageRank, a legend, names, a long list on
  the left), so "make the program work something out" felt like it was already done.
- "Run as copy" produced only a "Would add ... running" message and no visible change.
- After running, the right panel said "Ran Sep 28", which made her doubt it had just run.
- Clicking the word "Shape" did nothing; only the small plus opens the menu.
- "Size 1" with an unexplained icon: no way she could find to make size follow the result.
- "Labels show... 1 node" row on the left says "not available yet".
- Ticking "Show labels" changed nothing visible; the reason (labels hidden to avoid overlap) only
  appeared later, in the Export dialog.
- After exporting, the "Show labels" checkbox she had added was no longer in the Style panel.
