# Session r1-s54 transcript (Grace, nonprofit operations analyst)

Task: open sources.graphml, draw people, companies and agencies each in a different color, say which color is companies.

## Step 1
Command: real.mjs --start <folder> empty
Saw: landing page "Analyze any network". Big green "Open a file" button, says GraphML. "It never leaves your computer" -- good, that's my privacy line.
Next: click "Open a file" and give it sources.graphml.

## Step 2
Command: --step --click "Open a file" --upload sources.graphml
Saw: "Open as a new graph" preview. 24 nodes, 59 edges -- 24 people and organizations, that matches what I was told. There's a "kind" column: company, person, agency. That's exactly my colour column.
Next: click Load.

## Step 3
Command: --step --click "Load"
Saw: graph drawn, all dots the same blue. 24 nodes, 59 edges on the right -- everyone arrived. Right panel has "Style" and "Values" tabs. Left has "Style layers".
Next: Okay, what do I click to colour by kind. Try the "Style" tab on the right.

## Step 4
Command: --step --click "role=tab:Style"
Saw: Style tab is only canvas background, lighting, labels. Nothing about dot colours.
Next: the left list has "Everything 24" -- that's all my dots. Click it to see its colour.

## Step 5
Command: --step --click "Everything"
Saw: "Everything" layer, Fill Color 6366F1 (the blue). Next to the colour there's a little chain-link icon. Maybe that ties the colour to a column?
Next: hover the chain icon next to Color to see what it says.

## Step 6
Command: --step --hover-at 1380,483
Saw: tooltip "Node color by attribute". That's it -- colour by a column.
Next: click it.

## Step 7
Command: --step --click "Node color by attribute"
Saw: a list of my columns. "kind -- 3 values". Three values = person, company, agency. Perfect.
Next: click "kind".

## Step 8
Command: --step --click-at 1017,623 (option "kind, 3 values")
Saw: dots now three colours, and a key appeared top-left: "Color: kind -- person orange, company light blue, agency green". Fill Color now says "kind". Quick count: lots of orange, about 7 light blue, 5 green -- roughly 24, fine.
Done.

## End of session (in character)
- Finished: yes. People are orange, agencies are green, and **the companies are light blue**.
- Ease: 6 out of 7.
- What confused me: the "Style" tab on the right first showed only the background and lighting, nothing about dot colours. I had to guess that the "Everything" row on the left was "all my dots". Then the colour-by-column button is just a little chain-link icon with no words; I only found it by hovering. Once I found it, picking "kind -- 3 values" was really easy, and the key that showed up with plain words (person, company, agency) is exactly what I'd put on a board slide. I liked the "It never leaves your computer" and "Local only" notes.
