# Session r2-s17 -- Tom (recipe recipient), task T10 Prompt B (College football)

Task as given: "You have never used this program before. You will practice on the ready-made
network of American college football teams and the games they played, which comes with the
program, not on your own data. Right now no names are written on the drawing. Get every team's
name written next to its dot."

Tool: design/ui/studio/tool/real.mjs, run from design/ui/studio. S=rounds/round-2/sessions/r2-s17

## Step 1 -- start

Command: `node tool/real.mjs --start $S empty` -> 01.png

Seen: a dark start page. Left: "Open project or file...", "New from data...", "Files are read on
this computer and never uploaded." Middle: Recent projects (empty). Right: Samples -- Les
Miserables, Zachary's karate club, College football (115 teams), Florentine families. Bottom: a
box "Your data is yours, but please help us" with "Share usage data" / "No thanks".

Tom: "Good, it says files stay on this computer. I don't want to share anything -- No thanks.
Then College football is right there on the right."

## Step 2 -- decline usage data, open the sample

Command: `--step $S --click "No thanks" --click "College football"` -> 02.png

Seen: the football network opened -- a big square-ish hairball of blue dots and grey lines, no
names anywhere. Left: a search box "Find nodes, edges, values", "Selection", "Everything". Right
panel: "Graph / From College football", two tabs "Style" and "Values" (Values is selected), an
Overview with Nodes 115, Edges 613, Density, Components. Bottom toolbar: a flask, a chart icon,
"3D", a magnifier.

Tom: "Opened fine, no install. 115 teams, matches the sample list. But no names, like they said.
Names on the dots is how it looks, so I'd guess that's 'Style'. I'll click Style."

## Step 3 -- Style tab

Command: `--step $S --click "Style"` -> 03.png

Seen: Style shows "Canvas / Background F5F5F5", then "Method: Force - Recommended", a grey
paragraph about pulling nodes together, Shape 3D/2D, Spring length 30, Gravity -1.2, Advanced,
"Applied". Nothing about names or labels.

Tom (hesitating): "Background, spring length, gravity... this is the whole picture's settings,
not the dots. Nothing says names. On the left there's 'Everything' -- maybe that's all the dots.
I'll click Everything and see if the right side changes."

## Step 4 -- Everything

Command: `--step $S --click "Everything"` -> 04.png

Seen: right panel now says "Everything", Style tab, Nodes/Edges switch (Nodes on). Fill / Color
6366F1, Shape size 1, Icosphere, then Effects +, Label +, Tooltip +. "Label" is in slightly
bigger white text.

Tom: "There -- 'Label'. A label is a name. There's a little plus next to it. I'll click the plus."

## Step 5 -- plus next to Label

Command: `--step $S --click-at 1420,362` -> 05.png (tool: button "Add label line")

Seen: a box titled "Label" popped up with "Find an attribute" and a list under "Attributes": id,
label, value. Behind it a row reads "Pick an attribute". No names on the dots yet.

Tom (hesitating): "'Attribute' -- I'd have to guess. id is probably a number, value I don't
know. 'label' sounds like the name. I'll take label."

## Step 6 -- pick "label"

Command: `--step $S --click "label"` -> 06.png

Seen: names appeared above the dots: Georgia Tech, Maryland, Florida, Arkansas, Boise State,
Arizona, California, ... The panel now shows a Label row "Aa Above | Abc label" with a minus, and
under it in small grey "115 labels, 14 hidden to avoid overlap". The names are very small, and
in the crowded middle many are tiny and overlap (I had to lean in). Notre Dame, Air Force, UCLA
readable.

Tom: "That's the names. But it says 14 hidden. They asked for every team. And honestly half of
these I can't read at this size. Let me zoom into the picture -- maybe the hidden ones come back
when there's room."

## Step 7 -- zoom the picture in

Command: `--step $S --wheel 740,460,-400` -> 07.png

Seen: the picture got only a little bigger. The names did NOT get bigger -- they stay the same
tiny print. And the grey line now says "115 labels, 16 hidden to avoid overlap" -- 16, not 14.
Zooming in hid more, not fewer.

Tom (frowning): "I made it bigger and it hid two more? That's backwards. That's one thing that
didn't work. On the Label row there's an 'Aa' -- that usually means the text. I'll try that."

## Step 8 -- the "Aa" button

Command: `--step $S --click-at 1220,392` -> 08.png (tool: button "Label position")

Seen: a small box "Label position" with a 3 x 3 grid of dots, the top middle one marked. It is
about where the name sits around the dot, not how big it is, and nothing about the hidden ones.
The count still says "115 labels, 16 hidden to avoid overlap".

Tom: "That's where the name goes, above or below. Not what I wanted. That's my second miss. The
names are on, most of them anyway. I'm not going to fight it for the last sixteen -- I'd ask her
how to get those, or just ask for a PNG with the names on."

Stopped here (second dead end, per Tom's patience).

Command: `node tool/real.mjs --end $S`

## At the end (Tom, in character)

- Did I finish? Mostly. I got the names written next to the dots -- that part took four clicks
  once I found it. But it told me 14, then 16, of the 115 were hidden "to avoid overlap", and the
  task said every team. I couldn't get those back, so strictly, no.
- Ease: 4 out of 7. Getting names on was quick once I found "Label", but finding it wasn't
  obvious, and the last bit I couldn't do at all.
- What confused me:
  - The first "Style" I clicked (with the whole graph picked) was about background, gravity and
    spring length. Names were not there. I only found "Label" after clicking "Everything" on the
    left, which I clicked on a hunch.
  - The pick list said "Attributes: id, label, value". I guessed "label". Nothing told me which
    one holds the team names.
  - The names are very small print. I can't read most of them in the middle of the picture.
  - "14 hidden to avoid overlap" is in small grey type. I only noticed it because it had a number
    in it. It did not say how to show them.
  - I zoomed the picture in to make room, and it said 16 hidden instead of 14. Bigger picture,
    more names hidden -- that seems backwards. The names did not get bigger when I zoomed either.
  - The "Aa" button I expected to be text size turned out to be "Label position".
