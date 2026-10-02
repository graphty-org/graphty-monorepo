# Session: apply a colleague's recipe -- Jordan, marketing network analyst

Task as given: "A colleague in another team emailed you their team's colors and analysis steps, saved from their own copy of graphty, with none of their data. Put them to use on the transfers you have open, and make sure everything in them landed on something."

Start screen: shots/tasks/t15/01.png. Renders: tmp/round-7-sessions/t15--marketing-analyst/01.png to 10.png. Every command was run from design/ui/prototype with `timeout 120 node app-b/study.mjs --try <render> task:t15 ...`.

## Steps

**Start.** "OK, a gray hairball of 3,000 accounts. There's a pill that says 'Nothing is colored or sized by a row', which is true. Something emailed to me is a file, so I'd expect to find it under the file menu, or wherever this thing keeps import. The project name at the top has a dropdown, so I'll try that first."

01 -- `--click "Transfers, March 2026"`
"Rename, Save, Save as, Export, 'Apply recipe or style file...', Version history. 'Recipe' is a strange word, but colors plus steps sounds like a recipe I guess. Nothing says Import, though. I almost went to Export, because in my head anything that moves a file goes there."

02 -- `... --click "Apply recipe or style file..."`
"It skipped the file picker and went straight to the colleague's file, mule-ring-triage.graphty. Fine, I'll take it as the attachment I saved. It says it brings styles, 1 set and 3 runs. What's a 'set' and what's a 'run'? I'm guessing the Watchlist is the set and the three analyses are the runs. It lists six rows it adds. Then it says '4 of 4 matched by name and type'. Four out of what? There are six rows. Which two don't count, and why? That's exactly the kind of number that makes me distrust a tool, like the dashboard saying 4,000 and the download saying 3,100."

03 -- `... --click "Show all"`
"OK, now I can see what each one maps to: fee to fee, time to timestamp, riskScore to riskScore, alertRule to alertRule. So that's the four. Watchlist says '19 accounts'. Are those THEIR 19 accounts? They didn't send their data, so do those 19 account IDs even exist in my file? It doesn't say. The PageRank one says 'Weight: loaded weight' with no arrow, so I can't tell what it got hooked up to. And there's a little comment bubble with a 1 on the cycles row that I'm not going to chase. It looks matched enough, and the footer says one undo step, so it's safe to try. Apply."

04 -- `... --click "Show all" --click "Apply"`
"The toast says 'Mule ring triage added 6 rows on top of the tree. Undo'. But the tree on the left still only has Selection, Notes and Everything. The graph is still gray. The pill still says 'Nothing is colored or sized by a row'. So it says it worked, and nothing looks any different. Hmm."

05 -- `... --click "Apply" --click "Style"`
"Maybe it's on the Style tab on the right? No, that's just canvas background, print-safe colors and the layout. Print-safe colors is nice for my grayscale handouts, but it has nothing to do with this."

06 -- `... --click "Apply" --click "Everything"`
"I clicked Everything in case the new rows are tucked under it. It's the default purple look, 'under every other row'. There are no other rows."

07 -- `... --click "Apply" --click "Table"`
"I opened the table to look for a riskScore column or a watchlist flag. I see id, the link counts, kind and country. It shows 10 of 12 columns, so maybe two are hidden, but nothing new jumps out. No score, no risk."

08 -- `... --click "Apply" --click "Watchlist"`
"I tried clicking Watchlist directly. The tool told me nothing on screen is called that. So it isn't anywhere."

09 -- `... --click "Apply" --click "Views"`
"Views: 'No saved views.' Not there either."

10 -- `... --click "Apply" --hover "Mule ring triage added 6 rows on top of the tree"`
"I hovered the toast hoping it would link to what it added. No. I'm stopping. The tool told me six rows landed, and I can't see a single one of them on the screen."

Off-topic, said while waiting: "This is the problem with every handoff I get. Someone on the data team sends me 'the notebook' and half of it points at a path on their laptop. At least this told me what it matched. It just then didn't show me anything."

## Outcome

- **Succeeded?** I don't think so. The confirmation dialog was decent. Once I pressed Show all, I could see what each step was hooked to in my data. After Apply, though, the app claimed six rows were added, and the tree, the map, the pill and the table all looked exactly like before. I can't tell anyone that "everything landed" when I can't point at it. I also never found out whether the Watchlist's 19 accounts exist in my data.
- **Single Ease Question:** 2 out of 7. Finding the command was easy. Confirming the result was impossible.
- **Would I use this instead of my current tool?** Not for this. Re-applying a colleague's color scheme and steps is something I do by hand in Gephi today, and a file that does it in one step would genuinely save me time. But if it says "done" and shows nothing, I'm back to doing it by hand anyway, and I'd have to explain to my manager why the tool lied.

## Problems seen

1. After Apply, the toast says six rows were added "on top of the tree", but the tree, the canvas and the "Nothing is colored or sized by a row" pill are unchanged. Severity 4: it blocks the task and erodes trust.
2. "4 of 4 matched" sits beside a list of six rows, with no explanation of which rows are counted. Severity 3.
3. The Watchlist row says "19 accounts" but not whether those accounts exist in my data, even though the recipe brings no data. The mapping for "Weight: loaded weight" on PageRank is not shown either. Severity 3: the task asked me to make sure everything landed, and these are the two rows I can't check.
4. The jargon "recipe", "set" and "runs" is unexplained, and there is no "Import" wording, so I nearly went to Export. Severity 2.
5. The dialog opened the colleague's file directly, with no file picker. That was convenient, but I'd want to know where it found the file. Severity 1.
