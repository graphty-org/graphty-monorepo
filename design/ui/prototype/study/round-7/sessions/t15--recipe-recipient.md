# Session: applying a colleague's colors and analysis steps (participant: the recipe recipient, "Tom")

Task as given by the moderator: "A colleague in another team emailed you their team's colors and
analysis steps, saved from their own copy of graphty, with none of their data. Put them to use on
the transfers you have open, and make sure everything in them landed on something."

Start screen: shots/tasks/t15/01.png ("Transfers, March 2026", gray hexagon cloud, 3,000 nodes,
"Nothing is colored or sized by a row").

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t15--recipe-recipient/.

## Step 1 -- where does an emailed file go?

    timeout 120 node app-b/study.mjs --try .../01.png task:t15 --hover "Menu"

Think-aloud: "She emailed me a file. Where do I drop it? There's no File menu, just three lines in
the corner. Let me see what that is." Tooltip: "Main menu".

## Step 2 -- open the main menu

    timeout 120 node app-b/study.mjs --try .../02.png task:t15 --click "Main menu"

Menu shows New project, Open..., Open recent, Select where..., Settings, Keyboard shortcuts, Help.
Think-aloud: "Open is the only thing that sounds like a file. I'm a bit worried Open throws away
what I have open, but it's all there is."

## Step 3 -- Open...

    timeout 120 node app-b/study.mjs --try .../03.png task:t15 --click "Main menu" --click "Open..."

"Choose a file": transfers-2026-04.csv, mule-ring-triage.graphty, risk-review-look.json.
Think-aloud: "Which one did she send? The email said colors and steps, and no data. 'Look'
sounds like colors. The .graphty one might be a whole project with their data in it, and I don't
want that. I'll take the look one." (He never comes back to wonder whether the "steps" were in
the other file.)

## Step 4 -- risk-review-look.json

    ... --click "risk-review-look.json"

Dialog "Apply style file: Risk review look", "Saved by Dana Reyes, Mar 30 2026, 16:02",
"4 of 5 matched by name and type". alertRule (Label) has "Choose an attribute" and
"Leave unbound"; Apply is grayed out.
Think-aloud: "Good, it says apply, not open, so my transfers should stay. Saved by Dana, that's
her. Four of five matched. The fifth one wants me to 'choose an attribute' or 'leave unbound'.
I don't know what either means. Unbound sounds like something gets switched off. Is my result
wrong then, or just incomplete?"

## Step 5 -- look in the dropdown

    ... --click "Choose an attribute"

Options under "nodes": country, flagged, id (account), kind, riskScore.
Think-aloud: "None of these is an alert or a rule. It says Label on the left. If it writes a
label on each dot, I'd want the account name there."

## Step 6 -- pick id (account)

    ... --click "id (account)"

Apply turns blue. Footer: "Adds 5 rows on top of the tree, one undo step".
Think-aloud: "I don't know what 'the tree' is, but 'one undo step' means I can take it back.
I'm guessing on that label, though. I'd rather guess than leave something unbound, since I was
told everything has to land."

## Step 7 -- Apply

    ... --click "Apply"

Screen is now "Les Miserables", graph "Co-appearances", nodes labeled Valjean, Javert, Cosette,
Fantine. Layer list shows PageRank, Louvain, Shortest paths, Watchlist, For the report. Toast:
"Risk review look added 5 rows on top of the tree" with Undo.
Think-aloud: "Wait. That isn't my transfers. Les Miserables? Valjean? Where are my accounts? It
says it added five rows but I don't see alertRule, flagged, riskScore, kind or amount anywhere
in that list, and nothing is colored by risk. Either it opened something else or it wiped my
data." (First failure.)

## Step 8 -- Undo

    ... --click "Apply" --click "Undo"

Toast: "Nothing to undo". Still Les Miserables.
Think-aloud: "Nothing to undo. It told me it was one undo step. And my transfers still aren't
back. That's two. I'm not going digging through the title menu to find my data. I'll ask her to
just send me a PNG." (Second failure; session ends.)

## Outcome

- Did I succeed? No. I don't think anything of hers landed on my transfers. The screen switched
  to a different network entirely, and Undo said there was nothing to undo. I also only ever
  opened the colors file. If the analysis steps were in the other file, I never got to them,
  and nothing told me there was a second part.
- The one row that didn't match, alertRule, I hooked up to the account id as a guess. Even if it
  had worked, I couldn't tell you that was right.
- Single Ease Question: 2 out of 7. Up to the Apply button it was readable: who saved it, what it
  brings, four of five matched. After Apply I lost my data and couldn't get it back.
- Would I use this instead of what I do now (she sends a PNG and a spreadsheet)? No. Not after
  it swapped my data for a different one and the undo didn't work. The dialog before Apply was
  the most honest one I've seen in one of these tools, but I can't trust what happens after it.

## Observations for the study team (in the participant's terms)

- The apply dialog was the best moment: "Saved by Dana Reyes", "4 of 5 matched", and a clear
  list of what goes where.
- "Choose an attribute" and "Leave unbound" are questions he couldn't answer. None of the
  options looked like an alert rule, so he guessed the account id for a label.
- After Apply the canvas, title and layer list showed a different project (Les Miserables, with
  PageRank and Louvain rows), not the transfers with five new rows. The toast's claim and the
  screen didn't agree.
- Undo right after Apply said "Nothing to undo", although the dialog promised one undo step.
- The task says "colors and analysis steps". He found only the colors. Nothing on the file list
  said that the .graphty file held analysis steps, or that the .json was only half of what was
  sent.
