# Session r3-s09 -- Ruth (reporter), task T15 prompt B (friends.csv)

Start: empty app. File: friends.csv (running club, who knows whom).

## Steps

### Start

```
node tool/real.mjs --start /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s09 empty
01.png
```

Ruth: A dark start page. Open project or file, samples on the right, and a box at the bottom asking to collect usage data. My sources are confidential, so no thanks.

### Step

Ruth: Declining usage data first -- names in my files must not leave the computer.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s09 --click No thanks
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s09/02.png
exit 0
```

### Step

Ruth: Box is gone. 'Open project or file' looks like where my friends.csv goes, so I click it and pick the file from Downloads.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s09 --click Open project or file --upload friends.csv
a file chooser is open (answer it with --upload <file>)
chose the file friends.csv
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s09/03.png
exit 0
```

Ruth (on 03.png): It is on screen. Right side says 20 nodes and 41 edges -- my friend said 20 people and 41 rows, so nothing was dropped. PART 1 DONE. But the dots have no names. Bottom left says "Analyze ... in the toolbar to add results here", and the flask at the bottom looks like that. Working out who matters most sounds like analyzing.

### Step

Ruth: Clicking the flask in the bottom toolbar to analyze.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s09 --click-at 680,864
at 680,864: button "Analyze"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s09/04.png
exit 0
```

Ruth (on 04.png): A list of "Rank nodes and edges" with words I mostly do not know -- Betweenness, Eigenvector, Katz, HITS. Degree I could explain to an editor (how many people each knows). PageRank has a "Start here" tag and says "connected to other well-connected nodes", which is also explainable. Hesitated between Degree and PageRank; I take the one the program recommends.

### Step

Ruth: Picking PageRank, the one marked Start here.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s09 --click PageRank
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s09/05.png
exit 0
```

Ruth (on 05.png): Settings: "Damping factor 0.85" (no idea, leaving it) and "Weight: None". The file has a weight column but I do not know what my friend meant by it, so I leave it. "Under a second" and a Run button.

### Step

Ruth: Pressing Run with the defaults.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s09 --click Run
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s09/06.png
exit 0
```

Ruth (on 06.png): The dots turned orange, some darker. A key at the top left says "Color: PageRank 0.04382 to 0.06608", light orange to dark brown, so darker means the program thinks that person matters more. PART 2 DONE, I think -- though I could not tell an editor what 0.066 means. The left panel now lists "PageRank 20". Now the sizes. I will click that PageRank row to see if it has options.

### Step

Ruth: Clicking the PageRank row in the left list.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s09 --click-at 155,156
at 155,156: treeitem "PageRank"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s09/07.png
exit 0
```

Ruth (on 07.png): The right side now shows a Style panel for PageRank: Fill (Color: PageRank), Shape, Effects, Label, Tooltip, each with a plus. No "Size" anywhere. Size is about the shape of a dot, I guess, so I try the plus next to Shape.

### Step

Ruth: Clicking the plus next to Shape.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s09 --click-at 1419,234
at 1419,234: button "Add to Shape"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s09/08.png
exit 0
```

Ruth (on 08.png): A small menu: Size, Shape. There it is.

### Step

Ruth: Choosing Size.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s09 --click Size
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s09/09.png
exit 0
```

Ruth (on 09.png): A "Size by attribute" list: Fixed size, then PageRank, PageRank rank, PageRank percentile. "id" is greyed out as "holds groups, not amounts" (fine, a name is not an amount). I want the plain PageRank so size matches the color key.

### Step

Ruth: Picking PageRank for size.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s09 --click-at 1195,416
at 1195,416: option "PageRank"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s09/10.png
exit 0
```

Ruth (on 10.png): Two dots in the lower middle are now big and dark; the key at top left has a second line, "Size: PageRank 0.04382 to 0.06608". Size and color both say the same thing: bigger and darker = matters more by PageRank. PART 3 DONE. Size shows "1 to 3", fine. Now names: there is a Label row with a plus.

### Step

Ruth: Clicking the plus next to Label.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s09 --click-at 1419,332
at 1419,332: button "Add label line"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s09/11.png
exit 0
```

Ruth (on 11.png): A Label list: "id" under Attributes, then the PageRank numbers. No "name". My file only had source and target columns with the people in them, so I guess "id" is the person. Slight hesitation -- id sounds like a number.

### Step

Ruth: Picking id as the label.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s09 --click-at 1106,470
at 1106,470: option "id"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s09/12.png
exit 0
```

Ruth (on 12.png): Names are on the drawing: Omar, Pia, Quinn, Ravi, Nora, Milo, Lena, Sana, Kofi, Jada, Theo, Ava, Ivan, Hana, Gus, Ben, Farah, Chloe, Dev, Eli -- 20, and it says "20 labels, 0 hidden". PART 4 DONE. The names are small, and at the bottom "Chloe" sits on top of Farah's big dot and Dev/Eli crowd each other, but every name is readable enough. Ava and Farah are the biggest and darkest. Now the picture file. No Export button in sight; I try the menu (three lines) at the top left.

### Step

Ruth: Opening the main menu at the top left.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s09 --click-at 23,20
at 23,20: button "Main menu"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s09/13.png
exit 0
```

Ruth (on 13.png): Menu has "Export... Ctrl+E". That is where a picture file would be.

### Step

Ruth: Clicking Export...

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s09 --click Export...
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s09/14.png
exit 0
```

Ruth (on 14.png): Export dialog: Image, "To share -- PNG, 2x", current view. The preview has a tiny box in the top left corner that looks like my key, and the dots. "Saved to this computer only; nothing is uploaded" -- good, that is what I check for. PNG pastes into a document fine. Pressing Export.

### Step

Ruth: Pressing the blue Export button.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s09 --click Export#2
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s09/15.png
exit 0
```

Ruth (on 15.png): Nothing changed -- the dialog is still open and I see no sign of a file. (Tool note: "Export#2" may have hit a different control named Export; not a finding about the app.) I click the blue Export button directly.

### Step

Ruth: Clicking the blue Export button at the bottom right of the dialog.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s09 --click-at 1057,746
at 1057,746: button "Export"
a file was saved: friends_current-view.png, 1806 x 1720 (/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s09/downloads/friends_current-view.png)
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s09/16.png
exit 0
```

Ruth (on 16.png and the saved file): The dialog closed and a note says "Exported friends_current-view.png". The file (downloads/friends_current-view.png, 1806 x 1720) has the drawing with every name and, in its top left corner, a white key box: "Size: PageRank 0.04382 to 0.06608" (a grey wedge) and "Color: PageRank 0.04382 to 0.06608" (light orange to dark brown). PART 5 DONE -- I could paste that into a document.

### End

```
node tool/real.mjs --end <session folder>
```

## Debrief (in character)

**Did I finish?** Yes, all five parts:

1. On screen -- the panel said 20 nodes and 41 edges, which matches my friend's 20 people and 41 rows, so nothing was dropped.
2. Who matters most -- Analyze (the flask), then PageRank, which was marked "Start here", then Run.
3. Bigger dots -- Style panel, the plus next to Shape, Size, then PageRank.
4. Names -- the plus next to Label, then "id".
5. Picture with key -- main menu, Export..., Export. A PNG with the key in its corner.

**What the sizes and colors stand for:** both show the same thing, the person's PageRank score. A bigger and darker dot means a higher score, which the program describes as being connected to other well-connected people. Ava and Farah score highest (the two big dark-brown dots), then Ivan and Hana. Kofi, Eli and Dev are among the smallest. The scores run from 0.04382 to 0.06608.

**Rating: 6 out of 7 (easy).** It took me about 15 actions, with no dead ends.

**What confused me or slowed me down:**

- **The list of analyses is full of jargon.** I would not have known what to pick without the "Start here" tag. And I still cannot tell an editor what a PageRank of 0.066 means. The key shows raw decimals with no unit, no "higher means more", and nothing that says what was counted. I had to work out from the colors that darker means more.
- **Size is hidden under "Shape".** I looked for "Size" first and only found it by guessing that the plus next to Shape held it.
- **The name field is called "id".** The label list offered only "id". It was the names, but "id" sounded like a number code, so I hesitated before picking it.
- **The weight column is unexplained.** PageRank offered a "Weight" setting and my file has a weight column. I left it at None because nothing told me whether it should count. A fact-checker might ask.
- **Some names are hard to read in the picture.** The names are small and look a little blurry. At the bottom, "Chloe" is drawn over Farah's big dot, and "Dev" and "Eli" overlap. Arrows run through some names ("Sana", "Theo", "Kofi"). It is usable, but I would want to tidy it before it went to the graphics desk.
- **The key is small next to the drawing.** It sits in the corner of the picture and is easy to miss, but it is there and readable.
- **Privacy notes were reassuring.** "Local only" at the top, "Files are read on this computer and never uploaded" on the start page, and "Saved to this computer only; nothing is uploaded" in the Export dialog all told me what I wanted to know.

**Tool note (not an app finding):** the first press of Export used the name "Export#2" and did nothing visible. That name probably matched a different control. A click on the blue button itself exported the file.
