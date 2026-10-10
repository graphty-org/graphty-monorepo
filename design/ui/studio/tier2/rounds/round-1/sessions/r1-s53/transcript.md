# Session r1-s53 -- Dana (returning regular analyst), task T24 (running club, friends.csv, names drawn)

Frozen build: /home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/ (build 946256efb876).
All commands run from design/ui/studio/tier2 with REAL_DIST set to that directory.

## Start

    node ../tool/real.mjs --start rounds/round-1/sessions/r1-s53 setup:friends-ranked-names.txt

01.png: friends.csv is open, names on every ball, colored and sized by PageRank, legend top left.
Left panel: Selection, PageRank, Everything. Right panel: Everything, Style tab.

Dana: "OK, the running club file. Gus is bottom middle, Ivan is just up and to the right of him,
there's a line between them. Last time clicking on lines did nothing, but let me try clicking right
on that line between Gus and Ivan."

## Step 2

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s53 --hover-at 750,585

Output: "at 750,585: edge with id "13"", cursor: pointer, no tooltip. 02.png looks unchanged.

Dana: "The pointer turns into a hand on that line, so it is clickable. No tooltip though. Two lines
leave Gus to the right: the flatter one goes to Hana, the steeper one up to Ivan. I'm on the steeper
one. Click it."

## Step 3

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s53 --click-at 750,585

03.png: the line turns blue. Right panel now says "Gus -> Ivan", "Edge", Values tab open, Summary:
From Gus, To Ivan, weight 1. Left panel Selection shows 1.

Dana: "There it is -- Gus to Ivan, weight 1. The file only has one number column, so 'weight' is the
runs they did together: 1 run. I'd have called it 'runs', not 'weight', but fine. The arrow says
'Gus -> Ivan' -- they ran together, there's no direction to that, but I won't argue.
Now I need Gus and Ivan to pop out. There's a three-dots menu at the top right of this panel; that's
where I'd expect actions for this thing."

## Step 4

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s53 --click-at 1419,74

04.png: a menu "Edge actions" opens: Select endpoints, Frame selection (F), Add note (N).

Dana: "'Select endpoints'. Endpoints -- I suppose that's the two people at either end of the line,
Gus and Ivan. That sounds like it grabs them. Let me try it."

## Step 5

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s53 --click "Select endpoints"

05.png: Gus and Ivan both have a bright yellow glow around them; nobody else does. Right panel:
"2 nodes selected", Selection, Summary: Nodes 2, Edges joining these nodes 1. Left panel Selection
count is 2.

Dana: "Good -- Gus and Ivan are lit up yellow, nobody else is. That's what I wanted. My only worry is
whether that glow survives me clicking somewhere else; for a slide I'd want it to stick. There's a
Style tab on this panel -- let me just look at what it offers for these two, without changing
anything yet."

## Step 6

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s53 --click "role=tab:Style"

06.png: Style tab for "2 nodes selected": Fill, Shape, Effects, Label, Tooltip, each with a plus.
Gus and Ivan still glow yellow.

Dana: "So if I wanted a permanent color for these two there's a Fill plus here -- same look as the
Everything style panel I've used. Good to know for the slide. But the question was just to make them
the ones that stand out, and they do: two yellow glows, nobody else. I'm done. I'll leave it."

## End

    node ../tool/real.mjs --end rounds/round-1/sessions/r1-s53

Output: "session ended".

## Debrief (in character)

- **Finished?** Yes. Gus and Ivan did 1 run together (the line's panel shows "weight 1"; it is the
  only number in the file). Gus and Ivan are the only two lit up, with a yellow glow, after
  "Select endpoints" from the line's three-dots menu.
- **Ease:** 6 of 7.
- **What confused me:**
    - "weight" is the program's word, not mine. My file's third column is runs together; I had to
      assume that's what "weight" meant. If the column had a real name in my file I'd want to see it.
    - "Gus -> Ivan" with an arrow. Running together has no direction; the arrow made me wonder for a
      second whether it's "Gus invited Ivan" or something.
    - "Select endpoints" -- "endpoints" is not a word I use. I guessed it meant the two people at
      either end. "Select Gus and Ivan" or "Select both people" I would not have had to guess at.
    - The line had no tooltip on hover; I only knew it was clickable because the pointer changed.
    - I'm not sure the yellow glow sticks once I click somewhere else. For a slide I'd need it to,
      so next time I'd go to the Fill plus on the Style tab, but I did not try that here.
    - Small grey labels again ("Edge", "Selection" under the headings) -- hard to read without my
      glasses.
