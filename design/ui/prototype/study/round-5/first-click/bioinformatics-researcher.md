# First-click test: Dr. Chen, computational biologist

The participant saw one still screen per question and said the first thing she would click and how sure she was, from 1 (a guess) to 7 (certain). Her answers were written down before they were compared with the intended targets, and were not changed afterwards.

## Answers

### fc-1: A picture of the network for the paper (Les Miserables, nothing selected)
- **Clicked:** the three-line menu at the top left. I'm looking for File > Export, and I want SVG. There is no Export button anywhere on this screen, so the menu is the only place it can be.
- **Sure:** 4
- **She said:** "If what comes out of that menu is a PNG of whatever is on screen, it isn't a figure."
- **Result:** correct

### fc-2: Repeat the earlier bridges calculation exactly (same screen)
- **Clicked:** "Bridges" under Results on the right, the row marked "done". A finished result should tell me what it was run with.
- **Sure:** 6
- **Result:** correct

### fc-3: Rank the characters a second way (same screen)
- **Clicked:** the + next to Results on the right. Degree is already in the table, so a second measure has to be a new result.
- **Sure:** 5
- **She said:** "I nearly clicked the degree column header, but that only sorts what is already there."
- **Result:** correct

### fc-4: Change the color of group 2 or group 3 (same screen)
- **Clicked:** the orange swatch next to "2" in the Group color legend on the canvas.
- **Sure:** 5
- **She said:** "Group 3 isn't in the legend. It's hidden under '6 more'. Orange for 2 against dark orange for 3 is exactly the problem."
- **Result:** correct

### fc-5: Get back a selection lost to a stray click (same screen)
- **Clicked:** the three-line menu, hoping for an Edit menu with Undo. I see no undo arrow and nothing that says "selection" except Sets and paths, and I didn't save the selection as a set.
- **Sure:** 2
- **She said:** "In Cytoscape a lost selection is simply gone. I'd be surprised if this is different."
- **Result:** correct by location. She clicked the right button, but she was hoping for Undo, not a previous-selection command.

### fc-6: Find out what is painting Valjean this color (Valjean selected)
- **Clicked:** "Group color" under Appearance on the right.
- **Sure:** 5
- **She said:** "His swatch in the table says 2 and the node is orange, so it's the group coloring. I'd click it to confirm the mapping."
- **Result:** correct

### fc-7: Where Valjean's betweenness comes from and how it was calculated (same screen)
- **Clicked:** "betweenness 0.57, highest" under Results on the right.
- **Sure:** 5
- **She said:** "I want to know whether it's normalized and whether the edges were weighted. 0.57 only means something once I know that."
- **Result:** correct

### fc-8: Bring in next month's transfers file so everything carries over (Transfers, nothing selected)
- **Clicked:** the file chip "transfers-2026..." under the project name. The file is right there, so I'd swap it there.
- **Sure:** 3
- **She said:** "Whether 'everything carries over' is true, I'd believe it when I see the counts."
- **Result:** incorrect. The file chip is not one of the intended targets.

### fc-9: Accounts that take in far more money than they send out (same screen)
- **Clicked:** the + next to Results. What I need is in-strength against out-strength on the amount.
- **Sure:** 4
- **She said:** "The Statistics panel says 'amount not used yet', so I don't trust that whatever I run will use the money and not just count transfers."
- **Result:** correct

### fc-10: Cheapest route where a bigger transfer costs more (same screen)
- **Clicked:** "Change..." after "amount not used yet" in the Loaded line under Statistics. I'd make amount the edge weight first; there's no point asking for a route before the weights are set.
- **Sure:** 4
- **Result:** incorrect. That line sets the default for new runs, and the click is logged separately.

### fc-11: IT asks whether anything has left the computer (same screen)
- **Clicked:** "Nothing has been sent from this project", with the lock icon, under the project name.
- **Sure:** 6
- **She said:** "That's the first thing I'd want to see before loading unpublished data. I'd still want to know what 'sent' covers."
- **Result:** correct

### fc-12: Tell apart Ribosome and Spliceosome, two similar blues (Human protein interactions, nothing selected)
- **Clicked:** the Spliceosome swatch in the Module color legend.
- **Sure:** 5
- **Result:** correct

### fc-13: Bring in the lab's file of standard colors and sizes (same screen)
- **Clicked:** the + next to Style stack on the right. It's a style, so I'd go to where the styles live. In Cytoscape that's File > Import > Styles, but here the styles are in this panel.
- **Sure:** 3
- **Result:** incorrect. The intended targets were the main menu (Recipes) or Data.

### fc-14: How the Ribosome module differs from the rest of the network (same screen)
- **Clicked:** "Ribosome" in the legend, to select the module and then look at what the panel says about it.
- **Sure:** 3
- **She said:** "What I actually want is enrichment and the module's density against the background. I don't see either on offer, so selecting it is a guess."
- **Result:** correct

## Summary

She got 11 of 14 right. All three misses have the same cause: she went to the object the question named, the loaded file, the weight setting or the style list, rather than to the menu or the Data rail.

- **Replacing the data file (fc-8):** she clicked the file chip under the project name, which is not an intended target.
- **The weighted route (fc-10):** she clicked "Change..." in the Loaded line to make amount the weight before running anything. To her, setting the weight is a precondition of the route, not a separate step. Seeing "amount not used yet" there also made her distrust the Results + for the money-flow question (fc-9).
- **Importing the lab's styles (fc-13):** she clicked the + on Style stack. Nothing on the screen says that an import of colors and sizes lives in the menu under "Recipes".

Her confidence was lowest on recovering the selection (fc-5) and on comparing a module with the rest of the network (fc-14). On the recovery question she found the right button only because she was hoping for Undo.
