# Session: apply a colleague's colors and analysis steps to the hosts graph -- Priya, threat hunter

Task as given by the moderator: "A colleague sent the colors and analysis steps their team uses on
host data, without their data. Two of the things they expect to find about each host are called
differently in your hosts. Put them to use on your hosts so that nothing in them is silently
skipped. The data on screen is a sample: a company's IT estate, hosts and the network connections
between them, with dozens of things recorded about each."

Start screen: shots/tasks/t15-wide/01.png (IT estate, March 2026; Hosts graph, 300 nodes, 1,105
edges; nothing colored).

Renders are in tmp/round-7-sessions/t15-wide--cybersecurity-analyst/. Every command was run from
design/ui/prototype with `timeout 120 node app-b/study.mjs --try <png> task:t15-wide ...`; only
the steps are listed below.

## Think-aloud

**01 (start).** "Local only" in the top bar answers one of my three questions, good. Nothing says
where my colleague's file is. The colors and steps are something I'd *import*, so I go looking
for an import.

**02 -- `--click "Views"`.** "No saved views. Save view." A saved recipe could live here. It
doesn't.

**03 -- `--click "Views" --hover "More"`.** The tooltip says "More for views".

**04 -- `--click "Views" --click "More for views"`.** The only item is "Export tour video..."
(grayed, "Save a view first"). Wrong place.

**05 -- `--click "Style"`.** The right-hand Style tab holds canvas settings (background,
print-safe colors) and layout. No import.

**06 -- `--hover "More"`.** I meant the "..." by the left search box, but it picked the
inspector's "More actions (Shift+F10)".

**07 -- `--click "More actions"`.** Select all, invert, fit, re-run layout, add node, add note,
clear graph data. Nothing about bringing in someone else's setup.

**08 -- `--hover "Menu"`.** "Main menu". Usually File > Import is in here.

**09 -- `--click "Main menu"`.** New project, Open..., Open recent, Select where..., Settings,
Keyboard shortcuts, Help. No "Import". "Open..." is the only thing that takes a file, but I'm
worried it replaces my project.

**10 -- `... --click "Open..."`.** "Choose a file": transfers-2026-04.csv,
mule-ring-triage.graphty, risk-review-look.json. None of them says hosts. The .csv is data. The
.graphty sounds like a whole fraud project. "look" sounds like colors without data, so I pick that
one.

**11 -- `... --click "risk-review-look.json"`.** An "Apply style file: Risk review look" dialog.
It's nicely laid out: "Brings: styles. You supply: a network with an account column. Expects: a
transfer network of accounts (not included)." Then a list of rows it adds, "4 of 5 matched by
name and type", and alertRule has a "Choose an attribute" dropdown or "Leave unbound". That
dropdown is exactly the "called differently" fix I was looking for. **But the title bar now says
"Transfers, March 2026", 3,000 nodes.** Where did my IT estate go? And this file is for
transfers of accounts, not hosts, so it isn't my colleague's. Cancel.

**12 -- `... --click "Cancel"`.** Now I'm in "Les Miserables", a character co-appearance graph.
I cancelled and it took me to a third project. In a real trial I'd stop here: the tool lost my
project twice in two clicks.

**13 -- `--click "Main menu" --click "Open recent"`.** Mule ring review, Knockdown screen
September, March transfers, Patent citations 1999-2001. Nothing from a network or security team.

**14 -- trying to hover the "..." beside the left search box.** I'd just point at it with the
mouse, but every name I tried missed. `--hover` with "More for graph", "More for layers",
"More for rows", "More for Hosts", "Layer actions", "More for Graph", "More for this graph",
"More layer actions", "List actions", "More options" and "Graph menu" all returned "nothing on
screen is called ...", and so did `--click "More for the list"`. I never found out what that menu
holds. (This is partly the test harness: in real use I'd hover it.)

**15 -- `--click "Data"`.** Sources (hosts-2026-03.csv, connections-2026-03.csv), Filters,
Attributes. The attribute list is long: backup_policy, cmdb_*, cpu_*, and more. This is where my
hosts' names live, which I'd need for mapping.

**16 -- `--click "Data" --click "Add data"`.** "Add source" and "Import" weren't names on
screen; "Add data" was. Its menu: File..., From a URL..., Paste..., Set collection....

**17 -- `... --click "File..."`.** This picker labels the files: "Data file: CSV, JSON, GEXF or
GraphML", "Recipe: mule-ring-triage.graphty", "Style file: risk-review-look.json". So "recipe"
is the word for colors plus steps. Why didn't "Open..." in the main menu say that? The only
recipe is the mule ring one. It's fraud-sounding, but it's the only one offered, so I try it.

**18 -- `... --click "Recipe: mule-ring-triage.graphty"`.** "Apply recipe: Mule ring triage.
Brings: styles, 1 set, 3 runs. Expects: a transfer network of accounts." **And again the project
behind it switched to "Transfers, March 2026".** It says "4 of 4 matched", which is meaningless
to me because it's matching transfers data, not my hosts. Nothing here is unmatched for me to
map. So this isn't my colleague's host recipe either.

**19 -- `... --click "Paste..."`.** Maybe they sent it as text. It's a paste screen for "Open as
a new graph", already holding a Les Miserables GraphML snippet, and the title is "Les Miserables"
again. That's for data, not a recipe. Dead end.

**20 -- `--click "Analyze"`.** The algorithm picker: Louvain, PageRank, shortest path, link
counts, bytes totals. Good to know it exists, but there's nothing for loading steps from a file.

I stop here. I've spent far longer than my 90 seconds on finding one control.

## Verdict

**Did I succeed?** No. I never got my colleague's host colors and steps onto my hosts. The only
recipe and style files the app offered were for a transfers network. Every time I opened one,
the project behind the dialog changed to "Transfers, March 2026". Cancelling once dropped me
into "Les Miserables". I never saw a recipe that listed my hosts' attributes as the thing to
match against.

**Single Ease Question: 2 / 7.**

**Would I use this instead of my current tool?** Not on this showing. The apply dialog itself is
the best thing I saw. It says what the file brings, what it expects, how many rows matched, and
it won't let Apply go through until the unmatched one is bound or deliberately left unbound
("Choose an attribute for alertRule, or leave it unbound"). That's the "nothing silently
skipped" behavior I want, and better than my notebook, where a renamed column fails silently.
But getting there is broken:
- there is no "Import" or "Apply recipe" wording anywhere I'd look; the right entry is
  "Add data > File..." under Data, or "Open..." in the main menu, which looks like it opens a
  whole project
- the main-menu "Open..." list doesn't say which file is a recipe, a style file or data; only the
  Data picker labels them
- choosing a file or cancelling changed which project I was in, with no message. If that happens
  to a real case file, I stop trusting the tool

## Problems, most severe first

1. Opening a recipe or style file, or cancelling its dialog, switches the open project
   (IT estate to Transfers, then to Les Miserables) without saying so. Screens 11, 12, 18, 19.
2. The only recipe and style files offered are for a transfer network. Nothing on screen offered
   a host recipe whose two differently named attributes I could map. Screens 10, 13, 17.
3. Nothing is called "Import" or "Apply recipe". Bringing in a recipe hides under "Add data" in
   Data, or under "Open..." in the main menu. Screens 09, 16.
4. The main-menu "Open..." list doesn't label file kinds; the Data "File..." list does
   ("Recipe:", "Style file:"). Two pickers for one job, with different wording. Screens 10, 17.
5. The "..." next to the left search box has a tooltip name I could never hit, so I never learned
   what it does. Screen 14.

## What delighted me

- The apply dialog spells out "Brings / You supply / Expects", counts matches ("4 of 5 matched by
  name and type"), and blocks Apply until each unmatched row is bound or explicitly left unbound.
  That is the opposite of silently skipping. Screen 11.
- "Local only" in the top bar, right where I look first. Screen 01.
