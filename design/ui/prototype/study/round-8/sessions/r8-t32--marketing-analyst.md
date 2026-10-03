# Session: select every flagged account in Great Britain -- Jordan, marketing network analyst

Task as given: "March's card transfers are open (example data if you do not work in banking). Pick out, all at once, every account in Great Britain that was flagged, so you can work on just those. Say how many there are."

Start screen: shots/tasks/r8-t32/01.png. Renders are in tmp/round-8-sessions/r8-t32--marketing-analyst/.
All commands were run from design/ui/prototype; `$T` is that render folder.

## Steps, thinking aloud

1. Start screen. "A gray blob of 3,000 nodes, nothing colored. Not banking, but fine: I want country = GB and flagged = yes. In Excel that's two filter dropdowns. There's a Table tab at the bottom, so I'll open it."
   `timeout 120 node app-b/study.mjs --try $T/01.png task:r8-t32 --click "Table"`
   Table opens: id, links in/out/total, total amount. No country or flagged column in view, and the label says 11 of 13 columns are shown. "So the columns I need are hidden. Great."

2. "The top bar has a funnel that says 'Full graph'. A funnel means filter."
   `--try $T/02.png task:r8-t32 --click "Full graph"`
   It opened the Data panel: sources, Filters ("Filters change what is computed; the eye in the Graph tree only hides"), and Attributes, which list country and flagged. "OK, the data is there. 'Changes what is computed' sounds heavier than I want, though. I just want to grab them."

3. "I'll click flagged."
   `--try $T/03.png task:r8-t32 --click "Full graph" --click "flagged"`
   Right panel: flagged, false 2,986 accounts, true 14 accounts. "Good, a real number. 14 flagged in total, so my answer is 14 or fewer."

4. "Can I click 'true, 14 accounts' to select them?"
   `--try $T/04.png task:r8-t32 --click "Full graph" --click "flagged" --click "14 accounts"`
   Nothing happened. "It's just a number, not a link. In Brandwatch I'd click that and drill in."

5. "Fine, I'll add a filter step. Undo is up top if it wrecks something."
   `--try $T/05.png task:r8-t32 --click "Full graph" --click "Add filter step"`
   Menu: By an attribute or computed value / Top of a computed value / Largest component / k-core / Neighbors of the selection. "k-core, no idea. The first one."
   `--try $T/06.png ... --click "By an attribute or computed value"` -- a list of attributes.
   `--try $T/07.png ... --click "country"` -- that jumped me to the country attribute page instead, and my filter step was left half-built. "I clicked country in the pop-up... whatever, try again." (The tool says two controls are called country, one in the side list and one in the pop-up, so this may be a slip in the click rather than something the app did.)
   `--try $T/08.png ... --click "country, accounts"` -- now the condition reads "country is [empty box]".

6. "Is it GB, UK or United Kingdom? No list of values, just an empty box."
   `--try $T/09.png ... --type "G"` -- no suggestions appear.
   `--try $T/10.png ... --type "GB" --key Enter` -- the step is now called "country is GB", but it still says "This step: 3,000 of 3,000 nodes" and the map hasn't changed. "So either nothing is spelled GB or the filter does nothing. No error, no zero, it just... didn't. That's failure number one."

7. "Back to the Graph page and its search box, 'Find rows and notes'."
   `--try $T/11.png task:r8-t32 --click "Find rows and notes" --type "GB"`
   "No match for 'GB'." "So the search doesn't search my data, only the list on the left? Failure number two. Normally that's where I quit that path."

8. "Selection, at the top of the list?"
   `--try $T/12.png task:r8-t32 --click "Selection"` -- it only sets the selection's color, size and opacity. "Not what I need."

9. "The toolbar at the bottom has unlabeled icons. I'll hover over them."
   `--try $T/13.png task:r8-t32 --hover-at 838,823` -- "Quick actions Ctrl+K"
   `--try $T/14.png task:r8-t32 --hover-at 660,823` -- "Analyze Shift+A"
   "Ctrl+K, like Notion's command bar. I'll type what I want."
   `--try $T/15.png task:r8-t32 --click "Quick actions"`
   `--try $T/16.png task:r8-t32 --click "Quick actions" --type "select"`
   The list shows "Select where...  Main menu > Select where". "THAT's it. And it was hiding in the hamburger menu, which I never open."

10. `--try $T/17.png task:r8-t32 --click "Quick actions" --type "select" --click "Select where..."`
    A Select box opens with a Query field already filled in: `kind == 'personal'`, "2,610 of 3,000 nodes match". "Ugh, it's code, with double equals signs. And why is 'personal' already in there? I didn't ask for it."

11. "There's '+ condition'. Hopefully that gives me a dropdown."
    `--try $T/18.png ... --click "+ condition"` -- the query becomes `kind == 'personal' and`, and a list of attributes pops up.
    `--try $T/19.png ... --click "country"` -- the query becomes `kind == 'personal' and country`. "So '+ condition' just types the code for me, halfway. I still have to finish it and get rid of the personal bit myself."

12. "Fine. I'll wipe it and copy their example's pattern. true or 'true'? Guessing true."
    `--try $T/20.png task:r8-t32 --click "Quick actions" --type "select" --click "Select where..." --click "Query" --key Control+a --key Backspace --type "country == 'GB' and flagged == true"`
    "1 of 3,000 nodes match", button "Select 1". "One? Plausible out of 14, but I want to check it."

13. Sanity checks, the way I'd check a known account before trusting a ranking:
    `... --type "country == 'GB'"` (21.png) -- "Not available yet: counting this query in this version."
    `... --type "country == 'UK'"` (22.png) -- same message.
    `... --type "flagged == true"` (23.png) -- "14 of 3,000 nodes match", and 14 matches the attribute page. "Good, flagged lines up. But I can't find out how many GB accounts there are, or whether some rows say UK instead. If the file mixes GB and UK, my one could really be three."

14. Commit it.
    `... --type "country == 'GB' and flagged == true" --click "Select 1"` (24.png)
    Toast: "Selected 1 of 3,000 nodes where country == 'GB' and flagged == true", with "Create set from rule". The Selection row says 1, and the right panel says "1 node, 1 of 3,000 nodes", with the query.
    "Hold on. 'Louvain, 35 groups' and 'Links in (count)' just appeared in my left list. I never ran Louvain. Did selecting do that? And I can't see the yellow node anywhere on the map."
    `... --click "Select 1" --click "Table"` (25.png) -- the table still lists all 3,000 rows sorted by amount, with nothing marking my one row and still no country column. "So I can't look at the account and see GB next to it. I'm taking the app's word for it."

I stopped here.

## Result

- Answer given: **1 account** (flagged, country GB), selected.
- Do I think I succeeded? Probably. The app says 1, and the flagged total (14) matched in two places. But I couldn't check the country side: the GB count was "not available yet", there's no list of what the country values actually are, and the table didn't show me the selected row. If someone asked "are you sure there's only one in the UK?", I couldn't defend it.
- Single Ease Question: **2 / 7**. Two dead ends (a filter that said 3,000 of 3,000 with no explanation, and a search that only searches the side list), then I only found the right command by guessing a shortcut. And the right command turned out to be typing code.
- Would I use this instead of what I use now? Not for this. In Excel or Gephi's data lab I'd sort the country column, filter flagged = TRUE and read the count off the status bar in 30 seconds, while seeing the rows. Here the attribute page told me "14 flagged" instantly, and I liked that. But picking a combination means writing `==` and quotes, and the tool never showed me what values country actually has. I'd go back to Excel.

## Problems as I saw them

- The 'Select where' command, the one that actually does the job, is only in the main (hamburger) menu and the Ctrl+K box. Nothing on the screen I was working on (table, attributes, the "14 accounts" line) led to it.
- Value counts on the attribute page ("true, 14 accounts") look clickable but do nothing. That was my most natural way to pick them out.
- The filter step "country is GB" stayed at "3,000 of 3,000 nodes" with no "no rows match" or "GB isn't a value" message. I couldn't tell a wrong spelling from a broken filter.
- No list or autocomplete of country values in either the filter or the query, so I had to guess GB vs UK vs United Kingdom.
- The Select box opens pre-filled with someone else's query (kind == 'personal'), and '+ condition' adds to it instead of giving me a field / operator / value picker. It's code either way.
- Counting just country == 'GB' said "Not available yet", so I couldn't check my answer.
- After selecting, the table didn't filter to the selection or highlight the row, the country column stayed hidden, and I couldn't spot the selected node on the map.
- Louvain and "Links in (count)" rows appeared in the Graph list right after I selected, without my running anything. That makes me wonder what else it does behind my back.
- The search box ("Find rows and notes") doesn't search account data, but its name made me think it would.

Off-topic, as Jordan: "This is the same thing as the Talkwalker dashboard: the number on the screen and the number I can prove are two different things. My VP only reads the first slide, so if I put '1 account' on it, it had better be right."
