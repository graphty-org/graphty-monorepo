# Session r1-s21 -- Ruth, returning

Task: companies and government agencies in orange, except those who agreed to speak on the record. Report how many are orange.

## Start
Command: REAL_DIST=... REAL_TIER=5 node design/ui/studio/tool/real.mjs --start <folder> setup:sources.txt
01.png: my sources network is open. 24 nodes, 59 edges, all blue dots, no names. Left: "Style layers" with Hovered, Selected, Pinned, Everything (24). I need to know which columns say "company", "agency" and "on the record". I'll look at the table first.

## Step 2
Command: --step <folder> --click-at 792,840 (Table button)
02.png: the table. Columns: id, name, kind (company / person / agency), donations, on_record (Yes/No), email. So "on the record" is the on_record column. I want all 24 rows on screen so I can count myself before trusting any tool count. Trying the expand icon.

## Step 3
Command: --step <folder> --click-at 1147,448 (Maximize table)
03.png: rows s01-s22 visible. My hand tally so far of company/agency with on_record = No: s01 Harlan Development, s04 Northgate Capital, s07 Bayview Holdings, s12 Port Authority, s15 Zoning Board, s20 Silverline Media. On the record (Yes) and so excluded: s09 City Planning Office, s17 Friends of the Waterfront, s22 State Ethics Commission. Scrolling for s23, s24.

## Step 4
Command: --step <folder> --wheel 740,600,600
04.png: s23 Owen Clarke (person), s24 Riverside Partners (company, No). My paper count: 7 should be orange -- Harlan Development, Northgate Capital, Bayview Holdings, Port Authority, Zoning Board, Silverline Media, Riverside Partners. Now to make them orange. I have never colored by hand. The Graph page had "Style layers" with a + next to it; I'll close the table and go there.

## Step 5
Command: --step <folder> --click "Close table" --click "Graph"
05.png: back to the drawing and the Style layers list. Clicking the + beside "Style layers".

## Step 6
Command: --step <folder> --click-at 275,122 (Add a layer or a folder)
06.png: a menu: Layer, Folder, Hover highlight, Analyze... "Layer" seems right.

## Step 7
Command: --step <folder> --click "Layer"
07.png: "Layer 1" added, name box ready for typing. Right panel: Style nodes, "Which nodes 24 of 24 -- All nodes", then Shape, Visibility, Text, Fill... I'll name it "Orgs off record" and then open "Which nodes".

## Step 8
Command: --step <folder> --type "Orgs off record" --key Enter --click "Which nodes"
08.png: a "Which nodes -- Orgs off record 24 of 24" editor with a Value... list open: Node id, name, kind (3 values), donations, on_record (2 values), email, Degree. A table of matches below. I pick "kind" first.

## Step 9
Command: --step <folder> --click-at 942,244 (option "kind")
09.png: checkboxes person 14, company 6, agency 4. Those match my table count (6 companies, 4 agencies). Ticking company and agency.

## Step 10
Command: --step <folder> --click "company" --click "agency"
10.png: "10 of 24" now; table shows City Planning Office (Yes) still in. I need to also require on_record = No. There are "Condition..." and "Or..." buttons. "Or" would widen; I want "and", so I'll try "Condition...".

## Step 11
Command: --step <folder> --click "Condition..."
11.png: a second "Value..." row under "kind agency, company" and the attribute list again. Nothing says "and" or "or" -- I'm assuming a second condition narrows. Picking on_record.

## Step 12
Command: --step <folder> --click-at 956,292 (option on_record)
12.png: on_record chosen, and a second box "Value..." under it. Opening it to pick No.

## Step 13
Command: --step <folder> --click-at 1040,190 (combobox "on_record is")
13.png: Yes / No. Picking No.

## Step 14
Command: --step <folder> --click-at 936,250 (option No)
14.png: "7 of 24" -- matches my paper count of 7. Rows show Harlan, Northgate, Bayview, Port Authority, Zoning Board... City Planning Office (Yes) is gone. Good, the second condition narrows. Clicking Done, then the + beside Fill to set orange.

## Step 15
Command: --step <folder> --click "Done"
15.png: layer "Orgs off record" shows 7 in the list; panel reads "kind agency, company / on_record No". Nodes still all blue. Clicking + beside Fill.

## Step 16
Command: --step <folder> --click-at 1404,433 (Add to node fill)
16.png: a "Color" box appeared, empty, with a green border. I'll click into it and type orange as a code: #FF8000.

## Step 17
Command: --step <folder> --click-at 1320,467 (input "Node color, not set")
17.png: no picker opened, it's a text box. Typing #FF8000 and Enter.

## Step 18
Command: --step <folder> --type "#FF8000" --key Enter
18.png: orange dots on the drawing, and a key box: "Color: Orgs off record -- 7 of 24 nodes". I counted the orange dots on the picture myself: 7. The layer list says 7, the "Which nodes" says 7 of 24, and my count from the table was 7. Picture, table and key agree. Done.

## End
- Finished: yes. 7 nodes are orange: Harlan Development, Northgate Capital, Bayview Holdings, Port Authority, Zoning Board, Silverline Media, Riverside Partners (companies and agencies with on_record = No). City Planning Office, Friends of the Waterfront and State Ethics Commission are on the record and stay blue.
- Ease: 6 of 7.
- What confused me:
  - Adding the second test: the button says "Condition..." beside "Or...", but nothing said the new condition means "and". I only knew it narrowed when the count dropped from 10 to 7 and City Planning Office left the match table. The count and the table saved me.
  - The new layer's color box opened as an empty text box with no picker and no "orange" choice; I had to know a color code. A plain-English name or a swatch list would have been quicker.
  - The orange dots have no names on them; for the graphic I'd still need labels, but that wasn't the ask.
- Good: the match table under "Which nodes" let me check each name line by line, and the counts beside each kind (6 companies, 4 agencies) matched my own sheet.

## Follow-up
Q: On a scale from 1 (calm: you knew what to do next) to 7 (overwhelming: you wanted to walk away), how did the program feel while you did this? Say the number. Then name the moment you were least sure where to look or what to do next, and what was on the screen.

A: 2. Mostly calm -- I had my own count of 7 from the table before I touched anything, so I always had something to check against. The moment I was least sure was right after I clicked "Condition..." in the "Which nodes" editor (step 11). The screen showed my first test, "kind: agency, company", with "10 of 24" and City Planning Office still in the match table, and under it a new empty "Value..." row with the list of columns open again (Node id, name, kind, donations, on_record, email, Degree). The buttons beside it said "Condition..." and "Or...", but nothing on the new row said "and". I picked on_record and No on faith, and only relaxed when the count fell to "7 of 24" and City Planning Office dropped out of the table. A smaller wobble after that: the empty Color box with no swatches, where I had to know to type #FF8000.
