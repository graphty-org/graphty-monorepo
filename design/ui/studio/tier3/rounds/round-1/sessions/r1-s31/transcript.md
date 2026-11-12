# Session r1-s31 -- Tom (recipe recipient), task: volunteers.graphml, red = trained + no phone

## Step 1 -- start
Command: REAL_DIST=... REAL_TIER=3 node .../real.mjs --start <session> empty
Screenshot 01.png: a front page, "Analyze any network. Free and open source." A big green "Open a file" button, says CSV, GraphML... and underneath "Or drop a file anywhere. It never leaves your computer." Good -- that line I read. The roster has phone numbers, so I care.
Tom: "Open a file is the biggest button. That's what I'd click."

## Step 2 -- open the file
Command: --step <session> --click "Open a file" --upload volunteers.graphml
Screenshot 02.png: "Open as a new graph", a spreadsheet-looking table: 24 rows, name, role, hours, trained (Yes/No), phone. Some phones blank. Says "24 node rows and 63 edge rows read". "Local only" at the top -- fine. Lots of small grey words up top (Key, Attribute, Column roles) I'm not reading. I can already see Aisha Bello, Diego Ruiz, Nora Lindqvist trained with no phone. There is a "Load" button bottom right.
Tom: "24 rows, that's the roster. I'm not touching any of those boxes. Load."

## Step 3 -- Load
Command: --step <session> --click "Load"
Screenshot 03.png: blue balls and lines, three clumps. No names on them. Right side: numbers (Nodes 24, Edges 63 -- matches), "Density", "Transitivity", a bar chart -- not my business. Left: "Style layers" list (Hovered, Selected, Everything). A dark bar at the bottom: "This browser may clear what it keeps for this site. Save a copy to a file to be sure." Mildly worrying but not today's job.
Tom: "Everyone is blue and there are no names. I need the trained ones with no phone. There's a 'Find nodes, edges, values' box -- I'll try typing 'trained' in there."

## Step 4 -- type "trained" in Find
Command: --step <session> --click "Find nodes, edges, values" --type "trained"
Screenshot 04.png: under the box: "Select by a value: trained -- Select the 15 nodes (trained: yes)". A number. 15 trained.
Tom: "15 trained. That's half the job. I'll click it and see what it picks."

## Step 5 -- pick "Select the 15 nodes"
Command: --step <session> --click-at 175,155
Screenshot 05.png: 15 balls get a yellow ring. Right side: "15 nodes selected", "trained Yes (15)", "phone 11 of 15 have a value". So 4 of the trained have no phone. Good, that's the number I want -- but I need just those 4, and their names.
Tom: "Four of them have no phone. How do I get just the four? Maybe that phone line does something if I click it."

## Step 6 -- click the "phone 11 of 15" line
Command: --step <session> --click-at 1345,450
Screenshot 06.png: nothing changed. It's just a label.
Tom: "Nothing. OK, it's just telling me. There's a little spreadsheet icon at the bottom -- I know spreadsheets. I'll try that."

## Step 7 -- open the Table
Command: --step <session> --click-at 793,864   (button "Table")
Screenshot 07.png: a spreadsheet under the picture. The trained people are shaded green. Aisha Bello and Diego Ruiz are green with an empty phone cell. This I understand.
Tom: "Now it's Excel. I'll click the 'phone' heading to sort, so the empty ones bunch up."

## Step 8 -- sort by phone
Command: --step <session> --click-at 766,533   (button "phone")
Screenshot 08.png: "Sorted by phone, A to Z". The blanks went to the bottom, out of view.
Tom: "Blanks at the bottom. Click it again, like Excel, to flip it."

## Step 9 -- sort again
Command: --step <session> --click-at 766,533
Screenshot 09.png: "Z to A" now, but the empty phones are STILL at the bottom. In Excel blanks would come to the top one way or the other.
Tom: "Odd. Blanks stay at the bottom both ways. Fine, I'll scroll the table down."

## Step 10 -- scroll the table
Command: --step <session> --wheel 740,750,1500
Screenshot 10.png: the empty-phone rows at the bottom. Shaded green (trained) with no phone: Aisha Bello (v03), Diego Ruiz (v10), Nora Lindqvist (v14), Julia Rossi (v20). Four -- matches "11 of 15 have a value". Leo Novak, Ivan Petrov, Zara Ahmed also have no phone but are "No", so they stay as they are.
Tom: "Four names. That's my list. Now to make just those four red. I'll click Aisha's row, then hold Ctrl and click the other three, like picking cells in Excel."

## Step 11 -- click Aisha's row
Command: --step <session> --click-at 397,685
Screenshot 11.png: only Aisha is selected now ("Selected 1"); right side shows her: trained Yes, phone "No value". The picture zoomed to her ball. Good.
Tom: "Now Ctrl and click Diego."

## Step 12 -- Ctrl-click Diego
Command: --step <session> --ctrl-click "Diego Ruiz"
Screenshot 12.png: "2 nodes selected", both rows shaded, "phone 0 of 2 have a value". Ctrl works like Excel.
Tom: "Good. Nora and Julia next."

## Step 13 -- Ctrl-click Nora and Julia
Command: --step <session> --ctrl-click "Nora Lindqvist" --ctrl-click "Julia Rossi"
Screenshot 13.png: "4 nodes selected", "trained Yes (4)", "phone 0 of 4 have a value". Exactly the four.
Tom: "That's them. Now red. There's a 'Style' word at the top right next to 'Values'. Try that."

## Step 14 -- Style tab
Command: --step <session> --click "role=tab:Style"
Screenshot 14.png: a list: Shape, Visibility, Text, Fill, Effects, Rendering, each with a +. Small grey line on top about "a layer for the 4 selected nodes" -- too small, skipped. No word "colour" anywhere.
Tom: "No 'colour'. 'Fill' is what PowerPoint calls the colour of a shape. Click the + by Fill."

## Step 15 -- + by Fill
Command: --step <session> --click-at 1404,301   (button "Add to node fill")
Screenshot 15.png: "Color" with a little blue square and "6366F1" highlighted in a box. Some grey small text under it. I don't know what 6366F1 is. The text is highlighted, so it wants me to type.
Tom: "I don't know colour codes. I'll just type the word red and press Enter and see if it takes it."

## Step 16 -- type "red", Enter
Command: --step <session> --type "red" --key Enter
Screenshot 16.png: it took the word. The box now says FF0000 with a red square. A message: "Made a layer for the 4 selected nodes". A little box top-left of the picture: red square "Color: 4 nodes, 4 of 24 nodes" -- that's a legend with a count, I like that. Right side: "Picked by hand: 4 nodes". I can see red balls up top but they still have the yellow rings, and the table hides the bottom of the picture.
Tom: "It says 4 of 24. I want to see the whole picture without the yellow rings, to be sure only those four are red. Close the table, press Escape."

## Step 17 -- close table, Escape
Command: --step <session> --click-at 1179,472 --key Escape   (button "Close table", then Escape)
Screenshot 17.png: "Selection cleared: 4 nodes". The whole picture: four red balls, everyone else still blue. Left list: "Selected 0", a new line "4 nodes" with 4, and "Everything 24". Legend box top-left: red, "Color: 4 nodes, 4 of 24 nodes".
Tom: "Four red, the rest as they were. That's it. I'm done."

## End of session (in character)

**Did I finish?** Yes. The four volunteers who finished food-safety training and have no phone number are red, everyone else is unchanged:
- Aisha Bello
- Diego Ruiz
- Nora Lindqvist
- Julia Rossi

**How easy, 1 (very difficult) to 7 (very easy):** 5.

**What went well, in my words:** It opened the file straight from the big button, no install, and it said "It never leaves your computer" and "Local only" -- that's the line I look for with anything that has people's phone numbers. Typing "trained" in the Find box gave me "Select the 15 nodes (trained: yes)" with a number, and then the side said "phone 11 of 15 have a value" -- so I knew it was four before I'd found them. The table behaved like Excel: sort by a heading, Ctrl-click rows. Typing the word "red" into the colour box worked. The little box on the picture saying "Color: 4 nodes, 4 of 24" told me it did something and how many.

**What confused me / annoyed me:**
- The picture has no names on the balls, so from the picture alone I could not tell who anyone was. I only got the names because I opened the table.
- I could get "the trained ones" in one go, but not "trained AND no phone". I clicked the "phone 11 of 15 have a value" line hoping it would pick the four; nothing happened. I ended up picking them by hand from the table.
- Sorting the phone column: the empty ones stayed at the bottom whichever way I sorted. In Excel I'd flip it and they'd come to the top. I had to scroll.
- There's no word "colour" in the Style list. I had to guess that "Fill" is colour. Then it showed "6366F1" -- I don't know codes; I only tried typing "red" because the box was highlighted.
- The legend says "Color: 4 nodes". If I hand this to someone, it doesn't say what red means -- it doesn't say "trained, no phone". I'd have to tell them.
- It says "Picked by hand". If one of them gives us a phone number next week, I suppose I'd have to do this again -- I'd probably ask about this bit.
- The bar at the start, "This browser may clear what it keeps for this site", worried me a little -- does that mean my work goes away? I didn't act on it.
