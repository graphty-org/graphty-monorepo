# Session r3-s15 -- Nadia (level-1 alert reviewer), task T10 B (College football)

Task as given: "You have never used this program before. You will practice on the ready-made
network of American college football teams and the games they played, which comes with the
program, not on your own data. Right now no names are written on the drawing. Get every team's
name written next to its dot."

Start: empty.

## Step 1 -- start

    node tool/real.mjs --start rounds/round-3/sessions/r3-s15 empty

Saw (01.png): a start page. Left: "Open project or file...", "New from data...". Middle: Recent
projects (empty). Right: Samples -- Les Miserables, Zachary's karate club, College football
(115 teams), Florentine families. A usage-data box at the bottom with "Share usage data" / "No
thanks".

Nadia: "Bank laptop, I'm not sharing anything. No thanks. Then College football, it's right there."

Result (02.png): a graph opened, about 115 blue dots with gray lines, no names anywhere. Left
panel: a find box, "Selection", "Everything". Right panel: "Graph / From College football" with
two tabs "Style" and "Values" (Values open: 115 nodes, 613 edges, density...). A toolbar at the
bottom with a flask icon, a chart icon, "3D" and a magnifier.

## Step 2

Nadia: "None of this tells me where names go. Values is numbers. The other tab says Style --
names on dots is how it looks, so I'll try Style."

    node tool/real.mjs --step rounds/round-3/sessions/r3-s15 --click "Style"

Result (03.png): Style shows "Canvas / Background F5F5F5", then a "Method: Force - Recommended"
dropdown, Shape 3D/2D, Spring length, Gravity, Advanced, "Applied". Nothing about names or
labels. The drawing did not change.

Hesitation: "This is the background and how the dots are arranged. Nothing about the dots
themselves. Where's the dot stuff?"

## Step 3

Nadia: "On the left there's 'Everything' with a stack icon. If I want something on every dot,
'Everything' sounds like every dot. I'll click it."

    node tool/real.mjs --step rounds/round-3/sessions/r3-s15 --click "Everything"

Result (04.png): the right panel now says "Everything", Style tab, Nodes/Edges toggle (Nodes
on). Fill Color 6366F1, Shape (size 1, Icosphere), and collapsed rows each with a "+": Effects,
Label, Tooltip.

Nadia: "Label. That's it. It has a plus next to it, so I guess I add one."

## Step 4

Nadia: "Click the plus on the Label row."

    node tool/real.mjs --step rounds/round-3/sessions/r3-s15 --click-at 1419,362

Result (05.png): the tool said the plus is "Add label line". A popup titled "Label" opened with a
"Find an attribute" box and three choices: id, label, value. A row "Pick an attribute" appeared
under Label on the panel. Dots still have no names.

Hesitation: "id, label or value. None of them says 'team name'. id is probably a number in the
system, like an account number. 'value' -- no idea. 'label' is the word the panel used, so I'll
guess label is the name."

## Step 5

    node tool/real.mjs --step rounds/round-3/sessions/r3-s15 --click "label"

Result (06.png): team names appeared above the dots (Georgia, Florida, GeorgiaTech, Maryland,
Arkansas, BrighamYoung, Arizona...). The Label row now reads "Aa Above | Abc label | -", and under
it, small gray text "115 labels, 14 hidden" and a checkbox "Show all labels". Some names are tiny
and overlap in the crowded middle.

Nadia: "Good, names. But it says 14 hidden. The task is every team. QA would ask me why 14 are
missing. There's a 'Show all labels' box -- tick it."

## Step 6

    node tool/real.mjs --step rounds/round-3/sessions/r3-s15 --click "Show all labels"

Result (07.png): the checkbox is ticked and the gray text now says "115 labels" with no "hidden".
More names appeared (Washington, SanDiegoState, ColoradoState, OregonState...). In a few spots
names now print on top of each other (around OregonState / SouthernCalifornia, NewMexicoState,
Mississippi) and the smallest ones are hard to read at this size, but every dot I check has a name.

Nadia: "115 labels, and the sample said 115 teams. That matches. Done. Some of them sit on top
of each other, so if this were going into an alert file as a screenshot I'd have to zoom in for
the crowded parts -- but the task was names on every dot, and they're on."

## End

    node tool/real.mjs --end rounds/round-3/sessions/r3-s15

## Debrief (in character)

- **Did I finish?** Yes. Every team's name is on the drawing; the panel says "115 labels",
  which matches "115 teams" on the start page.
- **How easy, 1 (very difficult) to 7 (very easy):** 5. Six clicks, about as long as one easy
  alert. Once I was in the right panel it was quick.
- **What confused me:**
  - The first place I looked, the "Style" tab on the opening panel, was all background and
    arrangement settings, nothing about the dots. I only found the dot settings by guessing that
    "Everything" on the left meant every dot. Nothing on screen told me that's where the
    look of the dots lives.
  - "Label" with a plus sign: I didn't know whether plus meant "add a name" or "add another
    thing"; it worked, but the tool called it "Add label line", which I would not have guessed.
  - Picking between "id", "label" and "value" was a guess. None says "team name". I picked
    "label" because it matched the word on the row. If "id" had been the name I'd have gotten it
    wrong without knowing.
  - After the names appeared, the small gray "115 labels, 14 hidden" was easy to miss. If I
    hadn't read it I'd have thought I was done with 14 teams missing. Why would it hide any when I
    asked for names?
  - With all names shown, several overlap and the smallest are hard to read. For a screenshot in
    a file, that's not something QA could read without zooming.
