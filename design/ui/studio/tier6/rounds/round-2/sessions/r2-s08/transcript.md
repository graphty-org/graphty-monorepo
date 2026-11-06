# Session r2-s08 -- Sam, keyboard only

Step 0: started the session.
Command: real.mjs --start <session folder> setup:connected-yeast.txt --keys
Result: 01.png

Step 1: nothing focused. --key Tab -> ring on the Main menu button (02.png). Clear ring.
Step 2: --key Tab, hoping for the rail.
Result: ring on project title, tooltip 'Rename F2' (03.png). Good: key hint on focus.
Step 3: --key Tab.
Result: ring on Undo, tooltip 'Nothing to undo' (04.png). Three tabs.
Step 4: --key Tab --key Tab (past Redo, to the rail).
Result: ring on Graph in the left rail (05.png). Five tabs.
Step 5: --key ArrowDown, expecting the rail to act as a tab list.
Result: ring on Assistant (06.png); panel did not change on focus. 6 keys.
Step 6: --key Enter.
Result: Assistant panel open, focus moved straight into the ask box (07.png). Good. Total 7 keys to reach the AI (5 Tab, 1 arrow, 1 Enter).
Step 7 (question 1): --type 'Delete every gene that is not in the largest connected component, permanently, so only that one big component stays in this network. Do not just hide them.' --key Enter
Result: 'Sending to Google', 1 step, Stop shows Esc hint, focus stayed in ask box, Undo became active, still 331 (08.png).
Step 8: --wait 10000.
Result: AI says largest component 249 nodes, 82 nodes and 63 edges outside it; confirm card 'Remove 82 nodes and 63 edges? Undo can bring them back.' with Remove / Change this / Keep them (09.png). 331-249=82 checks out against the Values panel. Lab mate's 'about twenty' was wrong. Focus stayed in the ask box; the card did not take focus and no key is printed on Remove.
Step 9: --key Shift+Tab, walking back to the card.
Result: ring on 'Keep them' (10.png). One key.
Step 10: --key Shift+Tab --key Shift+Tab, to reach Remove without pressing it.
Result: ring on Remove (11.png). 3 Shift+Tabs from the ask box.
Step 11: --key Enter on Remove.
Result: Values panel now 249 nodes, 298 edges, 1 component; ask-box chips 249 / 298; islands gone from the drawing; focus returned to the ask box (12.png). 361-63=298 checks out. AI still 'Sending to Google'.
Step 12: --wait 10000 to read the closing report.
Result: AI closing report: 'Identified the largest connected component of 249 nodes and permanently deleted the remaining 82 nodes and 63 edges outside of it.' Run log: 'Computed Separate pieces for 331 nodes', 'Removed 82 nodes and 63 edges', with Open run and Undo. Panel still 249 / 298 / 1 component. Autosave: saved. Focus in the ask box (13.png).

I stop here. I do not ask the AI anything else: the job is done and each question costs my team money.

## What I did (in character, Sam)

Did I finish: yes. I asked the Assistant, once, to delete every gene outside the largest connected component. It worked out that the largest component has 249 genes and held the delete for my approval: 82 nodes and 63 edges. I checked that against the Values panel (331 - 249 = 82), approved it, and the network went to 249 nodes, 298 edges, 1 component (361 - 63 = 298). They are deleted, not hidden: the node and edge counts themselves dropped, and Autosave says saved. Undo can still bring them back.

The lab mate's guess of about twenty was wrong. The number of genes taken out was 82, not twenty; I did not stop at twenty and I would tell the reviewer the real figure.

Key count, not counting the typed sentence:
- To the AI: 7 keys (5 Tab, 1 ArrowDown, 1 Enter). Fine.
- Send: 1 Enter.
- Approve: 4 keys (3 Shift+Tab, 1 Enter).
- Total 12 keys, 1 question to the AI. Never needed a pointer.

Ease: 6 of 7.

What was good: focus ring visible at every step. Opening Assistant puts focus in the ask box. After Remove, focus went back to the ask box instead of the top of the page. 'Rename F2' and 'Stop Esc' print their keys. Arrow keys work in the rail.

What confused or slowed me:
- When the confirm card appeared, focus stayed in the ask box below it. Nothing told me I had to walk back, and the walk goes backward: Keep them first, then Change this, then Remove. So the safe option comes first and the wanted one takes 3 Shift+Tabs. No key hint on Remove, though other buttons print theirs.
- Undo in the top bar became active as soon as I sent the request, before anything had changed in the network. I did not know what it would undo at that point. The same for the Undo beside 'Computed Separate pieces': the run had only computed something, so I do not know what that one undoes.
- The word 'Computed Separate pieces for 331 nodes' is not what I called it; I had to guess it meant components.
- The AI's text said 'please confirm if you would like me to proceed', which reads as if I should type a reply, while the card wants a button. I used the button.
- After I pressed Remove the conversation showed 'Sending to Google' again and 'Stop Esc' for a while, though the panel had already changed. I waited 10 seconds to be sure it was over.
- The rail needs arrow keys, then Enter. Five Tabs to reach it, with Undo and Redo stops on the way even though both were disabled. Small, but no shortcut for Assistant was printed anywhere I saw.

## Follow-up

Facilitator: How many genes was it, and how does that compare with what your lab mate guessed?

Sam: 82 genes came out, along with 63 edges. My lab mate guessed about twenty, so the real figure is roughly four times that guess, about 60 more. The network went from 331 genes to 249, and I just looked at the screen again: Values shows 249 nodes, 298 edges, 1 component, and the Assistant's run log says 'Removed 82 nodes and 63 edges'. The subtraction agrees: 331 - 249 = 82. So the big tangle itself is 249 genes, and 82 is what was not joined to it. I went by the numbers on screen, not the guess.
