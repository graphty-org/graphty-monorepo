# Session: compare March and April rings -- marketing network analyst (Jordan)

Task as given: "Last month you picked out rings of accounts in March's data. April's data is in now. How much did the rings change between the two months, and which ones grew the most? The data on screen is a sample: one month of card and bank transfers between accounts. If that is not your line of work, treat the accounts as your own things (suppliers, customers, hosts, genes) and the transfers as what passes between them."

Start screen: shots/tasks/t11/01.png. All renders are in tmp/round-7-sessions/t11--marketing-analyst/. Every command was run from design/ui/prototype with `timeout 120 node app-b/study.mjs --try <render> task:t11 ...`; only the steps are listed below.

Outcome: success, with one wrong turn of about four minutes.

## Think-aloud

**Start (shots/tasks/t11/01.png).** OK, so I'm in "Transfers, March 2026". Not my world. I'll read accounts as customers and transfers as referrals. Last month's "rings" are the colored clusters, Louvain, 35 groups. The legend and the right panel give me sizes, which is good. Now I need April. Nothing on screen says April. My first guess is the title dropdown, because that's where "open" lives in most tools.

**01: `--click "Transfers, March 2026"`.** I get Rename, Save, Export, "Apply recipe or style file...", Version history, Close project. There's no Open and no April. "Apply recipe" sounds like rerunning last month's steps on new data, but I don't have the new data loaded, so it does nothing for me yet. I'm not going to click "Close project" and lose March.

**02: `--click "Data"`.** Sources: accounts-2026-03.csv and transfers-2026-03.csv. So the April file goes here. There's a plus next to Sources.

**03: `--click "Data" --click "transfers-2026-03.csv"`.** That opened a column-mapping editor for the March file: From, To, Weight, "Higher means Stronger". I didn't want to edit March. I'd back out with Esc.

**04: `--click "Data" --click "Add source"`.** "Nothing on screen is called Add source." `--click "Replace"` didn't match anything either. I was looking for "Replace with new month".

**04 (redone): `--click "Data" --click "More"`.** That opened the graph menu on the right: select all, re-run layout, add node, "Clear graph data". None of that helps. I'm also not touching "Clear".

**05: `--click "Data" --click "Add"`.** This is the plus by Sources: File, From a URL, Paste, Set collection. I'll take File.

**06: `--click "Data" --click "Add" --click "File..."`.** A file chooser offers a data file, a recipe "mule-ring-triage.graphty" and a style file. There's no April file listed by name, so I'll take the data file.

**07: `... --click "Data file: CSV, JSON, GEXF or GraphML"`.** "Open as a new graph", and it's transfers-2026-03.csv again, the March file. That isn't April. I'm also worried that this makes a second graph and I'll end up with two Marches. And if this were a real export, would it merge into the graph I already have? Cancel. That was about four minutes on the wrong path, and in real life it's where I'd start to get annoyed.

**08: `--click "Transfers"`** (the graph name at the top of the left panel). The menu shows Transfers (3,000 nodes) and **"Compare graphs..."**. That's the word I was looking for. I didn't expect it to be hiding under the graph's name. I'd have looked for a "Compare" button or a "Changes" tab.

**09: `--click "Transfers" --click "Compare graphs..."`.** This is it. Louvain March on the left, Louvain April on the right, with the same layout and the colors matched by overlap. So April was already loaded somewhere, and I never loaded it. I'd want to know where it came from. I'm assuming whoever set this up put it in. The right panel says:
- Agreement 0.449 across 2,961 accounts that are in both months. Running March again on March's data scores 0.76 to 0.77. So the grouping really moved; it isn't noise from rerunning the algorithm. That gray band is the most useful thing on the screen, because it tells me what "no change" looks like. I can't tell what "Agreement" actually is as a method, though. If my VP asks "agreement by what measure?", I don't have a name to give. Is it a Rand index or something? It doesn't say.
- Communities went from 35 to 65. 26 matched pairs, 13 new groups holding 773 accounts, and 26 "singles" that are one-account groups with no April transfers. So really about 39 real groups, not 65. Good that it says so. 9 of March's groups are gone.
- Size change, March to April: Community 1 went from 297 to 359 (+62), Community 27 from 52 to 107 (+55, it doubled), Community 15 from 84 to 116, Community 31 from 37 to 64 (+73%), Community 16 from 81 to 102, Community 23 from 67 to 83 and Community 14 from 84 to 98. It's sorted by raw growth, I think. I'd want a column with the change and a percent, because for "grew the most" I'd tell the VP about 27 and 31, not about 1, which was already huge. The list runs off the bottom, so I don't know whether there's more.
- "Descriptive only; no statistical test." Fine, good. That's honest.

**10: `... --click "Community 27"`.** The row highlights and a tooltip says "Select Community 27 on both sides". I can't really see the selection on the maps at this size. It's a hairball either way. What I actually want here is the list of the 55 new accounts in 27.

**11: `... --click "Keep as row"`.** "Added Louvain: March vs April to the Graph tree", with Undo. OK, so it's saved and I could presumably get back to it. I didn't go further, because I already have my answer.

## Answer I would give

The rings changed a lot. Overall agreement between March and April is 0.449, where rerunning March on its own data gives about 0.76, so this is a real reshuffle and not noise. There were 35 groups in March. April has 39 real groups plus 26 single, inactive accounts. 26 groups carried over, 13 are new (773 accounts) and 9 are gone. Community 1 grew the most in headcount (297 to 359). Community 27 grew the most relative to its size: it doubled, 52 to 107. Community 31 went from 37 to 64.

## Debrief

- **Did I succeed?** Yes, I think so, if "rings" means the Louvain communities. I'm not sure that's what last month's "rings" were. If I'd picked a few specific rings by hand, then this view didn't show me those.
- **Single Ease Question:** 4 out of 7. Once I was in Compare it was easy, maybe a 6. Finding Compare was hard, and I first spent time trying to load April through the Data panel, which kept handing me March's file.
- **Would I use this instead of my current tool?** For this job, maybe. In Gephi I'd have to run both months, export both partitions and match them in Excel or my colleague's notebook. This did the matching and the "is it just noise" check in one screen, and that actually saves me an afternoon. But I wouldn't switch until I can (1) get a CSV of the size-change table with change and percent columns, (2) see who joined the fastest-growing group, and (3) name the agreement measure in a deck. Also, honestly, our listening suite doesn't do month-over-month clusters at all. It just re-clusters every time and the numbers jump, which is half of why nobody trusts it. This answers "did it really change", and that's the part I like.

## Problems seen

1. Compare sits under the graph name dropdown in the left panel, which is the last place I looked. The top title menu and the Data panel, the two places I tried first, never mention comparing.
2. In the Data panel, adding a file offered only the March file, under "Open as a new graph". I couldn't see how April gets in, and Compare already had April loaded with no word about where it came from.
3. Agreement 0.449 has no named method, so I can't defend it to a stakeholder. The gray band is great, though.
4. The size-change list has no change or percent column, and it's unclear whether it's sorted by raw or relative growth. It's cut off at 7 rows with no sign that more exist.
5. Clicking a community in the list gives a tooltip but no member list. I can't see who joined.
6. The project title still reads "Transfers, March 2026" while I'm comparing to April.
7. The task says "rings" and the screen says "communities". I mapped them myself, but someone else might not.
