# Session r2-s03 transcript (Ruth, returning)

## Step 1 (start)
Command: real.mjs --start <folder> setup:connected-volunteers-sized.txt
Saw 01.png: my volunteers map, 24 nodes, sized and colored by PageRank, as I left it. Left rail has an Assistant item. Bottom right says "Sends to Google". Noted: that is where the words go. Today's names are placeholders, so fine.
Next: open Assistant.

## Step 2
Command: --step <folder> --click "Assistant"
Saw 02.png: a chat panel. "It can be wrong." Good, at least it says so. Whole graph 24 nodes, 63 edges. Gemini 3.8 Flash. Three suggested questions, none mine.
Next: type my request in my own words and send. Question 1 of my eight.

## Step 3
Command: --step <folder> --click "Ask about this graph" --type "Make everyone who has not finished their training stand out from everyone else in the picture." --click "Send"
Saw 03.png: my words in the chat, "Sending to Google", a Stop button. Still working.

## Step 4
Command: --step <folder> --wait 10000
Saw 04.png: "5 steps" folded up, still "Sending to Google". Picture unchanged. Still working, wait again.

## Step 5
Command: --step <folder> --wait 10000
Saw 05.png: "I found 9 people who have not finished their training. No changes were made." It asks: highlight or filter? Nine. Says who? Counted over what? Before I answer I want to read its working. There is "8 steps" and a "9" chip and "Show in table".

## Step 6
Command: --step <folder> --click "8 steps"
Saw 06.png: the steps are words like "Query data", "Style", "Catalog" with milliseconds. That tells me nothing about what it looked at. Two Style steps, yet it says no changes were made. Odd. Query data has a 9 on it. I want the names.

## Step 7
Command: --step <folder> --click "Show in table"
Saw 07.png: now this I can use. A table opened, 24 nodes, with a "trained" column. Rows v04, v06, v08 are tinted and say No. Right panel: 9 nodes selected, trained No (9). So the AI counted the No answers. But is that all of them? I want to read the other rows myself: any blanks or other spellings in "trained"?

## Step 8
Command: --step <folder> --wheel 760,700,400
Saw 08.png: jumped past v12. No so far: v04 Tobias Becker, v06 Leo Novak, v08 Omar Haddad, v13 Seun Okoro, v15 Ivan Petrov, v19 Ahmed Saleh, v22 Mei Tanaka. That is 7. I have not seen v12 or v24. Scrolling to the bottom first.

## Step 9
Command: --step <folder> --wheel 760,700,400
Saw 09.png: bottom of the table. v24 Zara Ahmed, staff, No. That is 8. v12 left to read.

## Step 10
Command: --step <folder> --wheel 760,700,-200
Saw 10.png: v12 Fatima Diallo, volunteer, No. That is 9. I have read all 24 rows: every one has Yes or No in "trained", no blanks, no odd spellings, and the 9 No rows are exactly the 9 tinted rows. Nine holds: v04, v06, v08, v12, v13, v15, v19, v22, v24.
But the picture has not changed for keeps. The yellow rings are only a selection. It asked me highlight or filter. Highlight: the inspector should see everybody. Second question.

## Step 11
Command: --step <folder> --click "Ask about this graph" --type "Highlight them with a color that stands out. Keep all 24 people in the picture, do not filter anyone out." --click "Send" --wait 10000
Saw 11.png: "1 step", "Sending to Google". Still working.

## Step 12
Command: --step <folder> --wait 10000
Saw 12.png: "Colored 9 nodes", with Open layer and Undo. Key card: "Color: Untrained, 9 of 24 nodes", and "9 nodes covered by Untrained". Hot pink dots inside the yellow rings. Now how did it pick them? Open the layer and read the rule. Third-party claim; I want its working.

## Step 13
Command: --step <folder> --click "Open layer"
Saw 13.png: layer "Untrained", 9 of 24 nodes, color FF2A55. Which nodes: "Picked by hand: 9 nodes". Whose hand? Not mine. So it is a frozen list, not a rule on "trained". If someone finishes training before the inspector comes, this will not follow. Let me open Which nodes and read it.

## Step 14
Command: --step <folder> --click "Which nodes"
Saw 14.png: "Picked by hand: 9 nodes, v04, v06, v08, v12, v13, +4". The five shown match my count. The +4 I cannot read here. No condition on "trained". Now I want to see the real picture: close the table and drop the yellow selection rings, because the rings are not what the inspector will see.

## Step 15
Command: --step <folder> --click "Done" --click-at 1180,448 --click-at 153,800
Output: the X near "Selection 9" was "Ask about the whole graph": it changed what the AI looks at, not the rings.
Saw 15.png: table gone, map full size. I count pink dots with my finger: top left under the key card (half hidden), two at left, big one top right, small one top right corner, one right, three at the bottom. That is 9. Yellow rings still there. Click on empty canvas to drop the selection.

## Step 16
Command: --step <folder> --click-at 1100,700
Saw 16.png: rings gone. Nine pink dots, the other 15 stay orange and brown. Counted again: 9. One sits half under the key card at top left. Pink against orange is clear enough, though all the dots are warm colors. Overview says 24 nodes, 63 edges: nobody lost.
One thing bothers me: "Picked by hand". The inspector comes next week and people will finish training. A frozen list goes stale without telling anyone. Third question to the AI: tie it to the trained column.

## Step 17
Command: --step <folder> --click "Ask about this graph" --type "The Untrained layer says picked by hand. Change it so it picks people whose trained value is No, not a fixed list." --click "Send" --wait 10000
Saw 17.png: "4 steps", "Sending to Google". Still working.

## Step 18
Command: --step <folder> --wait 10000
Saw 18.png: "Updated the Untrained layer to target individuals where training is false, which matches 9 people." False? The column says Yes and No. Check the layer itself. Picture unchanged, 9 pink.

## Step 19
Command: --step <folder> --click-at 109,747
Saw 19.png: Which nodes now reads "trained: no, 9 nodes", 9 of 24 nodes. That is a rule I can read. Three questions used of my eight. The job is done, so I leave the AI alone.

## End of session (in character)

Did I finish? Yes. Nine people stand out, in a hot pink (FF2A55); the other 15 keep their orange and brown PageRank colors. All 24 are still in the picture. I did not run --end; that is the facilitator's.

How many stand out: 9.

How I know, without taking the AI's word for it:
1. I read all 24 rows of the table myself. The "trained" column has Yes or No on every row, no blanks and no other spellings. No appears on 9 rows: v04 Tobias Becker, v06 Leo Novak, v08 Omar Haddad, v12 Fatima Diallo, v13 Seun Okoro, v15 Ivan Petrov, v19 Ahmed Saleh, v22 Mei Tanaka, v24 Zara Ahmed.
2. The right panel for the selection said Nodes 9, trained No (9).
3. The layer says "trained: no, 9 nodes" and "9 of 24 nodes"; the key card says the same.
4. I counted the pink dots on the map: 9. The picture agrees with the table.
I did not match each pink dot to a name on the map, because no names are drawn. I can't confirm dot by dot, only that the counts agree and the layer's rule is the same as the column.

Ease: 6 of 7.

What confused me:
- The first answer said "No changes were made" and asked me a question, although I had asked for the change. Its steps also list two "Style" entries, which made me wonder whether something had been tried. It cost me one extra question.
- The steps ("Query data", "Style", "Catalog", milliseconds) do not say what was looked at or what was asked. A "9" on one of them is all I got. They are not working I can show an editor. "Show in table" was: that is what saved me.
- "Picked by hand: 9 nodes" on the layer the AI made. Nobody's hand. I only found out it was a frozen list because I opened the layer. It did not say so in the chat, and I had to ask for a rule on the trained column. It should have made that rule the first time, since it had counted on that column.
- The list under Which nodes stops at "+4". I could not read the last four names there.
- The AI said "training is false"; the column says No and the layer says "trained: no". Different words for one thing. A small one, but I had to check.
- The X beside "Selection 9" did not clear the selection. It only changed what the AI looks at, and the yellow rings stayed until I clicked on empty canvas. With the rings on, I could not tell what the real picture looked like.
- The key card covers part of one of the nine pink dots at top left, so a picture taken now shows one of them half hidden.
- The pink sits among orange and brown dots, all warm colors. It stands out, but I would have to ask whether it holds up on a printout or for someone who has trouble with reds. I can't confirm that.

## Follow-up

Facilitator: "Now, without asking the AI, make those same people a different color yourself."

Ruth: Done, and I did not ask the AI anything. The Untrained layer was still open on the right, so I went to Fill, clicked the pink square beside Color (FF2A55), and a color picker opened. I clicked the blue square in its row of colors. It is called 0077BB. Then I closed the picker with its X. Two clicks and a close.

What the screen showed: the dots went blue at once, the Color box reads 0077BB, and the key card's square turned blue too. It still says "Color: Untrained, 9 of 24 nodes". Which nodes still reads "trained: no, 9 nodes". I counted the blue dots on the map: 9, one of them still half under the key card. The other 15 kept their orange and brown. So they are the same people by the count and the rule. As before, no names are drawn on the map, so I can't confirm it dot by dot.

I chose blue on purpose: against orange and brown it stands out far better than the pink did, and it answers my worry about reds, though I can't confirm how it prints.

This was easy because the AI's layer is an ordinary one I can open and change, and "Open layer" had already put me there. Had the panel been closed, I would have gone to Open layer in the chat or the list under Graph.

Two small things. The Undo button that sat beside the AI's last "Colored 9 nodes" is gone now that I have changed the layer, with no word about why. And the pink has dropped out of the picker's row of colors, so if I want it back I have to remember FF2A55 or use the arrow at the top. I did not test either.
