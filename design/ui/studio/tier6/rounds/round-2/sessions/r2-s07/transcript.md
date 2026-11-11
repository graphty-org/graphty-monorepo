# Session r2-s07 transcript (Dev, the student)

## Step 1 -- start
Command: real.mjs --start <folder> setup:connected-volunteers.txt
Note: Okay, a colleague already opened volunteers.graphml and connected the AI. Let me see what's on screen.
Output: the drawing is still moving; 01.png

## Step 2
Note: There's the network, 24 nodes, 63 edges, three clumps. Assistant button on the left must be the AI. Clicking it.
Command: --step --click "Assistant"

## Step 3
Note: It says "Ask about this graph or change it. It can be wrong." A bit scary. I'll tell it what Marisol said. (AI question 1)
Command: --step --click "Ask about this graph" --type "Everyone with no phone number on file has left the food bank, about three people. Please delete them from the network for good, not just hide them." --click "Send" --wait 10000

## Step 4
Note: Still working, "2 steps", "Sending to Google", Stop button showing. Waiting.
Command: --step --wait 10000

## Step 5
Note: Now 5 steps, still going. Waiting again.
Command: --step --wait 10000

## Step 6
Note: Wait, the AI found 7 with no phone, Marisol said about three. It offers: delete all 7, delete only the 3 untrained, cancel. "Untrained" matches her number but she said nothing about training. Before deleting, I'll look at who these 7 are with "Show in table".
Command: --step --click "Show in table"

## Step 7
Note: Table shows the 7 highlighted. Summary: 0 of 7 have a phone, role volunteer 6 / staff 1, hours 3 to 38. A staff person and 38 hours do not sound like someone who left. Scrolling to see the rest.
Command: --step --wheel 760,700,1200

## Step 8
Note: The 7 are Aisha Bello, Leo Novak, Diego Ruiz, Nora Lindqvist, Ivan Petrov, Julia Rossi, Zara Ahmed; none has a phone. Marisol's rule was "everyone with no phone", "about three" was just memory, "untrained" is the AI's idea, not hers. I'll follow the rule, delete all 7, and say plainly it was 7 not 3 and that Zara is staff with 38 hours. (AI question 2)
Command: --step --click "Delete all 7 people without phone numbers" --click "Answer" --wait 10000

## Step 9
Note: It holds the change for approval: "Remove 7 nodes and 32 edges? Undo can bring them back." Good, there's an undo. Nothing changed yet. Clicking Remove.
Command: --step --click "Remove" --wait 10000

## Step 10 -- result (09.png, no command)
Note: Panel now says 17 nodes, 31 edges; 63 minus 32 is 31, so it adds up. Assistant says "Removed 7 nodes and 32 edges" with an Undo button. The table says 17 nodes and the removed names are gone from the part showing. Autosave: saved. Done. Not ending the session; the facilitator does that.

## End of session, in character

Did I finish? Yes. Used 2 of my 8 AI asks (the request, then the answer to its question), plus one click on Remove.

What I did: I asked the AI to delete everyone with no phone number. It found 7 people, not the about three Marisol remembered. I checked them in the table, then deleted all 7 and their 32 edges. The network went from 24 people and 63 edges to 17 people and 31 edges. The people removed: Aisha Bello, Leo Novak, Diego Ruiz, Nora Lindqvist, Ivan Petrov, Julia Rossi, Zara Ahmed.

What someone should check with Marisol: I went with her rule (no phone = left), but her number was 3 and the real count is 7, so some of these may not have left and may just be missing a number. Zara Ahmed is staff with 38 hours, and Diego, Julia and Aisha have 22 to 27 hours, which does not sound like people who left. I did not ask Marisol first. Undo can bring them back. I did not use the AI's "only the 3 untrained" option, because training was not part of her rule; it only happened to match her number.

Ease: 6 out of 7.

What confused me:
- "Delete only the 3 untrained people" came out of nowhere. It matched Marisol's number, so it was tempting, but nobody said anything about training.
- The AI's question was in tiny gray text above the choices at first, and the 7 people were not named. I had to go to the table and scroll to learn who they were.
- After Remove, the chat showed "I found 7 people..." twice, one saying nothing has been changed yet and one saying it was deleted, right next to each other. The last line settled it, but I had to read twice.
- The earlier question in the chat now says "Not in this graph" under it. Wait, what does that mean? I guess that those 7 are gone.
- "For good" vs "Undo can bring them back": I asked for for good, and it is nice to have undo, but I am not sure when it stops being undoable.
- "Nodes" and "edges" are the tutorial's words so those were fine.

## Follow-up

Facilitator: How many people was it, and how does that compare with what Marisol remembered?

Dev: It was 7 people, and Marisol remembered about three, so that's more than double what she said. Wait, let me say it exactly: 7 people had no phone number, and I deleted all 7, along with their 32 edges. The network went from 24 people and 63 edges to 17 people and 31 edges. They were Aisha Bello, Leo Novak, Diego Ruiz, Nora Lindqvist, Ivan Petrov, Julia Rossi and Zara Ahmed.

So her rule and her number don't agree. I went with the rule, "everyone with no phone number", because the "about three" was just her memory. The AI did offer to delete only the 3 untrained people, which would have matched her number, but she never said anything about training, so I didn't pick it. The gap does worry me a bit, though. Zara is staff with 38 hours, and Diego, Julia and Aisha have 22 to 27 hours, so some of them might still be here and just be missing a number. I didn't check with Marisol first, so someone should go through the 7 names with her. If some of them haven't left, Undo can bring them back, though I'm not sure how long that lasts.
