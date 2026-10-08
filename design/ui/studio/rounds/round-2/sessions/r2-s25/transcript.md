# Session r2-s25 -- Ruth (data journalist), T12 Prompt B (Florentine families)

Task: open the ready-made Florentine families network, go to the Medici, read what the program knows about them, and find which families they married into -- names and how many.

## Step 1

Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s25 empty`
Saw (01.png): a start page. Start: Open project or file, New from data. Samples on the right: Les Miserables, Zachary's karate club, College football, Florentine families (15 families, "Marriages between the leading families of Renaissance Florence. Good for finding who brokers between groups."). A box at the bottom asks to collect usage data. Top right says "Local only".

## Step 2

Ruth (before): Usage data -- no thanks. Nothing about my work leaves this computer.

Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s25 "--click" "No thanks"`

Tool output:

```
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s25/02.png
```

Saw (02.png): the usage box is gone; same start page.

## Step 3

Ruth (before): Banner gone. The Florentine families sample is listed with '15 families' -- I'll open it.

Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s25 "--click" "Florentine families"`

Tool output:

```
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s25/03.png
```

Saw (03.png): the network opened. 15 dots, no names on them. Right panel: Nodes 15, Edges 20, 'Undirected, from the file: directed 0', Density 0.1905, Components 1, Edges per node 1 to 6, mean 2.667. Left: a search box 'Find nodes, edges, values', Selection, Everything. Ruth: 15 families, matches the sample card. 20 marriages. Undirected -- right for marriages. No names on the dots, so I go to the search box.

## Step 4

Ruth (before): 15 families, 20 ties, undirected -- fine for marriages. No names on the dots. I type Medici into the search box.

Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s25 "--click" "Find nodes, edges, values" "--type" "Medici"`

Tool output:

```
nothing on screen is called "Find nodes, edges, values"
nothing that takes text has focus (focus is on graphty-element ""); typed nothing, not "Medici"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s25/04.png
```

Saw: the click by the box's placeholder text missed (the tool says nothing is called that); typing went nowhere. Ruth: I'll click right in the box.

## Step 5

Ruth (before): My click didn't land in the search box. I'll click right inside it and type Medici.

Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s25 "--click-at" "180,90" "--type" "Medici"`

Tool output:

```
at 180,90: combobox "Find"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s25/05.png
```

Saw (05.png): search shows 'Elements: Medici' and 'Values: Select where name is Medici (1)'. One match. Ruth: good, exactly one Medici. I click the element.

## Step 6

Ruth (before): One Medici found, under Elements. I click it to go to them.

Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s25 "--click" "Medici"`

Tool output:

```
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s25/06.png
```

Saw (06.png): the Medici dot is ringed in yellow in the middle of the drawing. Right panel 'Medici, Node', Summary: id Medici, name Medici, Degree 6 with a '>' arrow. Ruth: that is what the program knows -- id, name, and a degree of 6. Degree is a count of connections, so six marriages. But six WHO? Says who? The arrow next to Degree might list them.

## Step 7

Ruth (before): Medici: degree 6. That's a count; I want the six names. The arrow beside Degree may show them.

Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s25 "--click-at" "1410,236"`

Tool output:

```
at 1410,236: group "Summary values"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s25/07.png
```

Saw (07.png): the Degree row is now highlighted but nothing else changed -- no list opened. Ruth: hm. Clicking the arrow did nothing I can see. I'll hover it to see if it says what it does.

## Step 8

Ruth (before): The arrow only highlighted the row. I'll hover the Degree row to see if it tells me what it does.

Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s25 "--hover-at" "1300,236"`

Tool output:

```
at 1300,236: button "Degree 6"
tooltip: null
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s25/08.png
```

Saw: no tooltip. The row is a button named 'Degree 6'. Ruth: then it should do something. I'll press it by name.

## Step 9

Ruth (before): No tooltip, but the row is a button. I press 'Degree 6'.

Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s25 "--click" "Degree 6"`

Tool output:

```
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s25/09.png
```

Saw (09.png): the right panel changed to "Medici -- Neighborhood", "Medici's 6 connections": Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni. On the drawing seven dots are ringed in yellow (Medici plus six), and the left panel says Selection 7. Ruth: there it is. Six names, read aloud: Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni. The picture agrees with the list -- 6 ringed neighbors plus the Medici themselves makes the 7 in Selection, and Degree said 6. That's three places saying the same thing. Done.
Hesitation: the first click on the small arrow only highlighted the row; it took a second click on the row itself to open the list (the first click may simply have focused it). Nothing said beforehand that Degree opens the list of who.

Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s25`

## Ending, in character

**Did I finish?** Yes. The Medici married into 6 families: Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni.

**What the program knows about them:** id Medici, name Medici, Degree 6. That is all -- no other facts about the family were on the panel.

**Ease: 6 out of 7.** Search by name worked on the first real try and found exactly one Medici. The count, the list and the picture all agreed (Degree 6, "Medici's 6 connections", 7 dots ringed with Medici included, Selection 7), so I could check it three ways without leaving the screen.

**What confused me:**

- The search box: my first click by its words did not put me in it, so my typing went nowhere. Clicking right in the box worked.
- "Degree 6" with a small arrow: the first click on the arrow only highlighted the row. A second click on the row opened the list of six names. Nothing told me in advance that this row leads to "who", and hovering gave no tooltip. If I hadn't been stubborn I would have gone hunting elsewhere.
- The list says "connections", not "marriages". Fine for me since the file is all marriages, but I'd have to tell my editor that a "connection" here means a marriage, and the screen doesn't say so.
- No names are drawn on the dots, so the drawing alone can't tell me which ringed dot is which family.
- "Undirected, from the file: directed 0" -- I read it as "the file had no one-way ties", which is right for marriages, but the wording took a second reading.
