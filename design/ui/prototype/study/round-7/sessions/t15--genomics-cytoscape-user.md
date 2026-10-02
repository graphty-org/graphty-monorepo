# Session: apply a colleague's colors and analysis steps (participant: Maren, genomics Cytoscape user)

Task as given by the moderator: "A colleague in another team emailed you their team's colors and analysis steps, saved from their own copy of graphty, with none of their data. Put them to use on the transfers you have open, and make sure everything in them landed on something. The data on screen is a sample: one month of card and bank transfers between accounts. If that is not your line of work, treat the accounts as your own things (suppliers, customers, hosts, genes) and the transfers as what passes between them."

All commands were run from design/ui/prototype. Renders are in tmp/round-7-sessions/t15--genomics-cytoscape-user/. Below, D stands for that folder's absolute path and B for the four steps
`--click "Transfers, March 2026" --click "Apply recipe or style file..." --click "Show all" --click "Apply"`.

## 01 -- start screen (shots/tasks/t15/01.png)

"OK, a gray hairball of 3,000 accounts. In my world these would be genes and the transfers are interactions. My colleague sent me their style and steps -- in Cytoscape that's File > Import > Styles, and then I'd redo their steps by hand from their email. There's a chip that says 'Nothing is colored or sized by a row', fine, that's my baseline. Nothing on the left obviously says import. The project name has a dropdown -- File menus usually live there."

## 02 -- project-name menu

    timeout 120 node app-b/study.mjs --try D/02.png task:t15 --click "Transfers, March 2026"

"Rename, Save, Save as, Export, 'Apply recipe or style file...', Version history, Close. 'Recipe' isn't a word I'd use, but 'style file' is, and their email had colors and steps, so that's probably it."

## 03 -- apply dialog

    ... --click "Transfers, March 2026" --click "Apply recipe or style file..."

"It went straight to a file, mule-ring-triage.graphty -- I guess that's the attachment. 'Brings: styles, 1 set, 3 runs. You supply: a network with an account column.' Good, it says up front it has no data. Then it lists six things it adds: Watchlist, a personalized PageRank from the watchlist, max flow, cycles up to 4 transfers, riskScore as color, alertRule as label. And it says '4 of 4 matched by name and type'. Four of four what? There are six rows. Which ones were the four? That's exactly the kind of number I don't trust until I see the list. There's a 'Show all' -- click."

## 04 -- Show all

    ... --click "Transfers, March 2026" --click "Apply recipe or style file..." --click "Show all"

"Now I see the matches: fee -> fee, time -> timestamp, riskScore -> riskScore, alertRule -> alertRule. So the four are column matches. But 'time -> timestamp' is not the same name, and the header says 'matched by name'. Did it guess? It doesn't say. And Watchlist says '19 accounts' -- 19 out of how many in their list? If their list had 25 and only 19 of my IDs matched, that's the silent mismatch I got burned on in March. It doesn't tell me. The PageRank row says 'Weight: loaded weight' -- no arrow, so I don't know what it matched to. There's a little speech bubble with a '1' on the cycles row; a note from my colleague, maybe? I can't open it from here. Fine, at least it says it's one undo step. Apply."

## 05 -- after Apply

    timeout 120 node app-b/study.mjs --try D/05.png task:t15 B

"Toast: 'Mule ring triage added 6 rows on top of the tree. Undo.' ...But the tree on the left still says Selection, Notes, Everything. No Watchlist, no PageRank, nothing. The chip still says 'Nothing is colored or sized by a row'. The network is still gray. So it says it added six things and I can see zero of them. This is the Cytoscape headers-only-no-values problem all over again, except this time the tool is telling me it worked."

## 06, 07 -- looking for the rows

    timeout 120 node app-b/study.mjs --try D/06.png task:t15 B --click Style
    timeout 120 node app-b/study.mjs --try D/07.png task:t15 B --click Everything

"Style tab: canvas settings and a layout. Nothing from the file. Clicked 'Everything': it paints all 3,000 nodes, fill color 6366F1, which is a purple -- but the nodes on screen are gray. So even the default doesn't match what I see. Still no new rows."

## 08, 09 -- table and Views

    timeout 120 node app-b/study.mjs --try D/08.png task:t15 B --click Table
    timeout 120 node app-b/study.mjs --try D/09.png task:t15 B --click Views

"Node table: id, link counts, kind, country. No riskScore, no alertRule visible, no PageRank column. Views: 'No saved views.' Nothing there either."

## 10, 11 -- columns and notes

    timeout 120 node app-b/study.mjs --try D/10.png task:t15 B --click "Columns: 10 of 12"
    timeout 120 node app-b/study.mjs --try D/11.png task:t15 B --click Notes

"Columns panel: 'In use (2)' is id and kind, and kind says 'Color (kind)'. riskScore and alertRule are under 'Other attributes', so the file's 'riskScore -> Color' and 'alertRule -> Label' are not in use. And now it claims kind is a color, while the chip on the canvas says nothing is colored. Two parts of the screen disagree. Notes: 'No notes.' So whatever that '1' comment on the cycles row was, it didn't come over either."

## 12 -- back to the Graph tree

    timeout 120 node app-b/study.mjs --try D/12.png task:t15 B --click Graph --click "Nothing is colored or sized by a row"
    (tool reported: nothing on screen is called "Nothing is colored or sized by a row")

"I clicked the Graph icon to get back to my tree, and now the whole thing is different: there's a 'Louvain, 35 groups' row, 'run from Louvain, Sep 28', and a 'Links in (count)' row, and the network is colored by community. I never ran Louvain. And still no Watchlist, no PageRank, no max flow, no cycles, no riskScore, no alertRule. I don't know whose state this is. That's where I stop. I can't tell what the file did to my network, and the screen contradicts itself about what is colored."

## Outcome

- Succeeded? No. I found the import and the preview was promising, but after Apply I could not find a single one of the six things it said it added, and I cannot say whether the 19 watchlist accounts or the 'time -> timestamp' guess landed on anything.
- Single Ease Question: 2 of 7. Finding the menu item was easy; everything after Apply was not.
- Would I use this instead of my current tool? Not on this showing. The preview is better than Cytoscape's style import -- Cytoscape never tells me which columns a style expects, and this one at least listed them with arrows. But the count '4 of 4' sits over a list of six, the watchlist count has no denominator, one match isn't by name although it says it is, and then the screen says six rows were added while showing none. One silent loss and I stop trusting every number. In Cytoscape I'd import the style and see the colors change; if they don't, at least I know it failed.
