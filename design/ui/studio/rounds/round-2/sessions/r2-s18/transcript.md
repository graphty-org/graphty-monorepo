# Session r2-s18 -- Dev (class-project student), T10 Prompt B (College football)

Task: "Get every team's name written next to its dot" on the College football sample.

## Step 1

Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s18 empty` -> 01.png

Saw: the start screen. "Start" with Open project or file / New from data, "Recent projects" (empty),
"Samples" on the right: Les Miserables, Zachary's karate club, College football (115 teams),
Florentine families. A "Your data is yours, but please help us." box at the bottom with
Share usage data / No thanks.

Dev: "Okay, reading everything... there's the College football sample, 115 teams, that's mine.
The data box first -- I'll just say No thanks, then click College football."

## Step 2

Command: `--step --click "No thanks" --click "College football"` -> 02.png

Saw: the graph drawn -- a box of blue dots with gray lines, no names on any dot. Left: a "Graph College
football" list with Find, Selection, Everything. Right: "Graph From College football", tabs Style and
Values (Values open): Nodes 115, Edges 613, Density, Components 1. A toolbar at the bottom with a
flask icon, a chart icon, "3D" and a magnifier.

Dev: "Oh nice, it drew right away. Okay, now I need the labels. In the tutorial it was a 'T' button
at the bottom, I don't see that. There's a Style tab on the right -- labels are kind of a look thing,
so I'll try Style."

## Step 3

Command: `--step --click "Style"` -> 03.png

Saw: Style for the Graph shows only Canvas (Background F5F5F5) and the layout: Method "Force -
Recommended", Shape 3D/2D, Spring length, Gravity, Advanced. Nothing about labels or names.

Dev: "Wait, this is the layout and the background. No labels here. Hmm. I'm on 'Graph' -- maybe I need
the dots themselves. On the left there's 'Everything', and I want names on every dot, so let me click
Everything." (first wrong try for labels)

## Step 4

Command: `--step --click "Everything"` -> 04.png

Saw: right panel now "Everything", Style tab, Nodes/Edges switch (Nodes on). Fill: Color 6366F1 100%.
Shape: Size 1, Shape Icosphere. Then Effects +, Label +, Tooltip +.

Dev: "There it is -- 'Label'! Same word as the tutorial. It has a plus next to it, so I guess I add a
label. Clicking the plus beside Label."

## Step 5

Command: `--step --click-at 1420,362` (tool: button "Add label line") -> 05.png

Saw: a "Label" popup: "Find an attribute", Attributes: id, label, value. Behind it a row "Pick an
attribute" with a minus.

Dev: "It wants an attribute. id, label, value... I want the team's name. The library lab said to check
the label column when labels don't show, so 'label' must be the names. Picking label." (Slight
hesitation: "id" could also be names, and "value" I have no idea.)

## Step 6

Command: `--step --click "label"` -> 06.png

Saw: names appeared next to the dots right away -- Florida, Georgia, GeorgiaTech, Maryland, Arkansas,
NewMexicoState, Washington State, Arizona, California... They are small and some overlap in the dense
middle. The Label row now reads "Aa Above Abc label -" and under it, in small gray text: "115 labels,
14 hidden to avoid overlap". The Nodes switch got a little dot.

Dev: "Oh nice, that's it -- names! Wait... '14 hidden to avoid overlap'. The task says EVERY team's name.
So 14 teams don't have a name showing. Hmm. There's an 'Aa' next to it, maybe that's the text options.
Let me click Aa." (Labels part mostly done; now trying to get the last 14.)

## Step 7

Command: `--step --click-at 1220,392` (tool: button "Label position") -> 07.png

Saw: a "Label position" popup with a 3x3 grid of dots, top-middle selected. Only where the label sits.

Dev: "Oh, Aa is just where the name goes, above the dot. Not what I need. That's my first miss for the
hidden ones. Let me close this and hover the '14 hidden' text -- maybe it explains how to show them."

## Step 8

Command: `--step --key Escape --hover-at 1290,417` (tool: group "Label", tooltip "Label position") -> 08.png

Saw: the popup closed. Hovering the "115 labels, 14 hidden to avoid overlap" line gave no explanation
of its own -- just the "Label position" tooltip of the Aa button.

Dev: "No help there. 'Hidden to avoid overlap' -- so if the dots were further apart they wouldn't
overlap? Maybe if I zoom in, there's more room. Let me scroll to zoom in on the middle where it's
crowded." (second try for the hidden 14)

## Step 9

Command: `--step --wheel 740,470,-500` -> 09.png

Saw: the drawing got a bit bigger, but the names stayed the same tiny size, and the line now says
"115 labels, 16 hidden to avoid overlap" -- MORE hidden than before (was 14).

Dev: "Wait, what? I zoomed in and now 16 are hidden instead of 14? That's the opposite of what I
expected. Okay, that's two wrong tries for the hidden ones. What does 'hidden to avoid overlap' even
want me to do -- is there a 'show all' somewhere? Last thing: the 'Abc label' box is the only other
part of the Label row I haven't touched. Clicking it to see if it has more options."

## Step 10

Command: `--step --click-at 1347,392` (tool: button "Label, Above: label") -> 10.png

Saw: the same attribute picker again, now with "In use: label" and Attributes: id, value. Nothing about
showing hidden labels, size of the text, or overlap.

Dev: "Nope, that just picks which column. Okay, I'm stopping here. I'll close this. Most names are on
the picture and it looks like the slides, but I couldn't get the last ones to show."

## Step 11

Commands: `--step --key Escape` -> 11.png; `--end` (session ended)

## Wrap-up (in character)

**Did I finish?** Mostly, not fully. Names are written next to most dots, but the panel itself told me
"115 labels, 14 hidden to avoid overlap" (16 after I zoomed), so by the app's own count not every team
has its name showing. I could not find a way to show the hidden ones.

**Rating: 5 of 7.** Getting names on was quick once I found it -- two clicks after I found "Everything".
Losing it to the hidden ones knocked it down.

**Where I hesitated / what confused me:**

- I looked for "labels" first under the graph's Style tab, which is only background and layout. Labels
  live under "Everything" in the left list, which I only clicked because I wanted names on "every" dot.
  Nothing on the first screen pointed me there.
- The attribute list said id, label, value. I guessed "label" was the team name from a tutorial tip;
  "id" might have been names too, and "value" meant nothing to me.
- "14 hidden to avoid overlap" tells me there's a problem but not what to do. Hovering it gave no help.
  Zooming in made it worse (16 hidden), which felt backwards -- I thought more room meant fewer hidden.
- The names are very small at the default view and blur together in the crowded middle; for the essay
  figure I'd want them bigger, and I didn't see a text size setting in the Label row.
- The "Aa" button is only label position, which the "Aa" icon didn't suggest.

**Essay sentence:** "I loaded the College football network (115 teams, 613 games) and labeled each team
by name; in the crowded middle a few names are hidden so they don't overlap."
