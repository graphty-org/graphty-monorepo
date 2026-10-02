# Session: shade the kept researchers by publication count -- Maren (genomics Cytoscape user)

Task as given: "Shade the researchers on the list you kept by how much each one has published, so the most productive stand out. The data on screen is a sample: one export from a research database, researchers and institutions with records inside records. If that is not your line of work, treat it as your own nested export."

All commands were run from design/ui/prototype. Renders are in tmp/round-7-sessions/t09--genomics-cytoscape-user/. Below, `D` stands for that folder's absolute path.

## Start screen (shots/tasks/t09/01.png)

Maren: "OK. 'Research network.' Left side there's 'Machine learning...' with 23 next to it and a green dot, so that's the list I kept, I guess, 23 researchers. They're green in the hairball. The right panel is showing that list: Fill, Color, 009E73. In Cytoscape I'd go to Style, Fill Color, and change the mapping type from passthrough to continuous and pick the column. So I want the color thing. Let me click the color."

## Step 1 -- click the fill color

    timeout 120 node app-b/study.mjs --try $D/02.png task:t09 --click "009E73"

Render 02: a color picker (Custom / Libraries), hue slider, hex, a warning about orange and vermilion for deuteranopia.

Maren: "That's a single color picker. That's 'pick a green', not 'map a column'. The color-blind warning is nice -- my PI would like that -- but it's not what I need. I noticed a little database cylinder icon appear next to the color when this opened. That might be the mapping thing. No label on it, though."

## Step 2 -- try to find what the cylinder icon is

    timeout 120 node app-b/study.mjs --try $D/03.png task:t09 --hover "Color"
    timeout 120 node app-b/study.mjs --try $D/04.png task:t09 --hover "Color" --hover "From data"       (nothing on screen is called that)
    timeout 120 node app-b/study.mjs --try $D/04.png task:t09 --hover "Color" --hover "Map to data"     (nothing)
    timeout 120 node app-b/study.mjs --try $D/04.png task:t09 --hover "Color" --hover "Use a column"    (nothing)
    timeout 120 node app-b/study.mjs --try $D/04.png task:t09 --hover "Color" --hover "Color by data"   (nothing)
    timeout 120 node app-b/study.mjs --try $D/04.png task:t09 --hover "Color" --hover "Set from data"   (nothing)
    timeout 120 node app-b/study.mjs --try $D/04.png task:t09 --hover "Color" --hover "Bind to data"    (nothing)
    timeout 120 node app-b/study.mjs --try $D/04.png task:t09 --hover "Color" --hover "Data-driven"     (nothing)
    timeout 120 node app-b/study.mjs --try $D/04.png task:t09 --click "Fill"

Render 03: hovering the Color row shows the cylinder icon, no tooltip text visible. Render 04 after clicking "Fill": nothing changes.

Maren: "I can see the icon but I can't tell what it does, and I'm not clicking a mystery icon next to my data. Clicking 'Fill' does nothing either."

## Step 3 -- the Libraries tab in the picker

    timeout 120 node app-b/study.mjs --try $D/05.png task:t09 --click "009E73" --click "Libraries"
    timeout 120 node app-b/study.mjs --try $D/06.png task:t09 --click "009E73" --click "Libraries" --click "Blues"

Render 05: "Recipes and style files", then "Palettes": Purple to yellow, Orange to brown, Blue to yellow, Black to yellow, Blues, Greens. Render 06: clicking "Blues" changes nothing.

Maren: "Palettes! Purple to yellow, that's viridis, good. Blues would be fine for 'more papers = darker'. But clicking 'Blues' does nothing, and there's no 'which column' anywhere. A palette without a column is just a swatch book."

## Step 4 -- go find the column under Data

    timeout 120 node app-b/study.mjs --try $D/07.png task:t09 --click "Data"
    timeout 120 node app-b/study.mjs --try $D/08.png task:t09 --click "Data" --click "metrics" --click "citations"
    timeout 120 node app-b/study.mjs --try $D/09.png task:t09 --click "Data" --click "metrics" --click "papers"

Render 07: the Data page. Sources (researchers 170 nodes, institutions 30, links), Filters, and an Attributes tree: researchers > attributes > profile > contact / metrics > citations. The canvas badge now says "Nothing is colored or sized by a row" and my green 23 are no longer green. Render 08: metrics opens to "papers", citations to "last_5_years" and "total". Render 09: "attributes.profile.metrics.papers", Number, 170 of 170 researchers have a value, range 4 to 300, median 144, "Painted by: No row paints from this attribute."

Maren: "Wait, my green nodes went gray when I came here. Hm. Anyway -- the nested stuff unfolds like a file tree, that's actually fine. 'papers' under metrics, that's 'how much each one has published'. Not citations -- citations is impact, not output. And look: 170 of 170 have a value, range 4 to 300, median 144. That's exactly what I never get from Cytoscape. Good. Now, how do I color by it? 'Painted by: no row paints from this attribute' -- OK, so how do I make it paint?"

## Step 5 -- the attribute's menu

    timeout 120 node app-b/study.mjs --try $D/10.png task:t09 --click "Data" --click "metrics" --click "papers" --hover "More actions"
    timeout 120 node app-b/study.mjs --try $D/11.png task:t09 --click "Data" --click "metrics" --click "papers" --click "More actions"

Render 10: the "..." top right is "More actions (Shift+F10)". Render 11: menu -- Color by, Size by, Label by, Show as groups, Filter to..., Create set where this is..., Read as..., Edit on the Data page, Show in table.

Maren: "'Color by.' Finally. Same as Cytoscape's continuous mapping, I hope."

## Step 6 -- Color by

    timeout 120 node app-b/study.mjs --try $D/12.png task:t09 --click "Data" --click "metrics" --click "papers" --click "More actions" --click "Color by"

Render 12: back on the Graph view. Legend "Color: attributes.profile.metrics.papers, 4 to 300" with an orange-to-brown ramp. Right panel: "Paints 170 researchers (every researcher with a value)", Fill Color "Orange to brown". The Graph list on the left now reads Selection, Notes, attributes.profile..., Everything. The "Machine learning... 23" list is gone.

Maren: "Oh -- no. It colored all 170, not my 23. And where's my list? It was right there, 'Machine learning, 23'. It's not in the list any more. Did that just replace it? Orange to brown is at least not red-green, and there's a legend with the range, which I like. But I asked for my 23, and I've lost the 23."

## Step 7 -- try to narrow it to my list, then try to get my list back

    timeout 120 node app-b/study.mjs --try $D/15.png task:t09 --click "Data" --click "metrics" --click "papers" --click "More actions" --click "Color by" --click "Paints 170 researchers"
    timeout 120 node app-b/study.mjs --try $D/16.png task:t09 --click "Data" --click "metrics" --click "papers" --click "More actions" --click "Color by" --click "Undo"

Render 15: clicking "Paints 170 researchers" opens a table of 200 nodes. Nothing about choosing which researchers. Render 16: Undo says "Nothing to undo". The list is still missing.

Maren: "The 'Paints 170' link just opens a table of everything. And Undo says 'Nothing to undo'. So the app thinks nothing happened, but my list is gone. That's the one thing I can't have. I can't trust this now."

## Side trips that went nowhere

    timeout 120 node app-b/study.mjs --try $D/13.png task:t09 --click "More actions"
    timeout 120 node app-b/study.mjs --try $D/14.png task:t09 --hover "Color" --hover "attribute"
    timeout 120 node app-b/study.mjs --try $D/14.png task:t09 --hover "Color" --hover "Color by"     (nothing)
    timeout 120 node app-b/study.mjs --try $D/14.png task:t09 --hover "Color" --hover "Use data"     (nothing)
    timeout 120 node app-b/study.mjs --try $D/14.png task:t09 --hover "Color" --hover "Map"          (nothing)
    timeout 120 node app-b/study.mjs --try $D/14.png task:t09 --hover "Color" --hover "Bind"         (nothing)
    timeout 120 node app-b/study.mjs --try $D/16.png task:t09 --hover "Color" --hover "From attribute" (nothing)
    timeout 120 node app-b/study.mjs --try $D/16.png task:t09 --hover "Color" --hover "Paint by"     (nothing)
    timeout 120 node app-b/study.mjs --try $D/16.png task:t09 --hover "Color" --hover "Vary by"      (nothing)

Render 13: from the start screen, "More actions" opened a big menu headed "Community 3" (Rename, Select members, Analyze, Keep as set, ... Delete) floating over the network. Maren: "Community 3? I didn't click a community. I was looking at my machine-learning list. Close that." Render 14: the hover landed on the Label field, tooltip "attributes.profile.metrics.citations.last_5_years". Maren: "So the label is already a column. Then the color should be able to be a column too, right there. I just can't find how."

## Outcome

Did I succeed? No. I got the whole network shaded by number of papers, with a legend and a range, which is half the job. But the job was my kept list of 23, and doing it made the list disappear from the panel, with Undo saying there was nothing to undo. If I had to hand this in I'd have the wrong 170 nodes colored and no list.

Single Ease Question: 2 of 7.

Would I use this instead of Cytoscape? "Not for this. Some of it is genuinely better: the attribute page told me 170 of 170 have a paper count, range 4 to 300, median 144 -- I'd kill for that count in Cytoscape. The nested record unfolding like folders is fine. The default ramp isn't red-green and the legend came up by itself. But in Cytoscape I'd go Style, Fill Color, pick the column, done, and it would apply to the network I'm looking at. Here the color on my list is a plain swatch, the one icon next to it that might do mapping has no name, and the route that did work went to a different page, colored everyone, and lost my list. One silent loss and I stop trusting the screen. I'd still do this in Cytoscape."

## Problems, in my words

1. The color on my list's style is a single swatch. There is no visible "color by a column" at the place I'd look. A small database icon appears beside it with no name I could find. (severity: high)
2. The palette list (Blues, Purple to yellow) looks like it should mean "a gradient over a column" but clicking one does nothing and never asks which column. (medium)
3. "Color by" exists, but only in the attribute's "..." menu on the Data page. I only found it because I went looking for the column first. (medium)
4. "Color by" painted all 170 researchers. No step let me say "only my 23". "Paints 170 researchers" looks like the place to change that but opens a table. (high)
5. After "Color by", my kept list "Machine learning... 23" vanished from the Graph list, and Undo said "Nothing to undo". From where I sit that is data loss. (critical)
6. Opening the Data page turned my green list back to gray ("Nothing is colored or sized by a row") without saying why. (medium)
7. "More actions" on the start screen opened a menu for "Community 3", not the list I was looking at. (medium)
8. The legend title is the raw path "attributes.profile.metrics.papers"; for a figure I'd want "Papers". (low)
