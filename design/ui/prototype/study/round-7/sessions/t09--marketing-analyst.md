# Session: shade the kept list by how much each researcher has published

Participant: Jordan, marketing network analyst (study/personas/marketing-analyst.md)
Task as given: "Shade the researchers on the list you kept by how much each one has published, so the most productive stand out. The data on screen is a sample: one export from a research database, researchers and institutions with records inside records. If that is not your line of work, treat it as your own nested export."
Start screen: shots/tasks/t09/01.png
Renders: tmp/round-7-sessions/t09--marketing-analyst/01.png to 15.png
All commands were run from design/ui/prototype; D is the full path of tmp/round-7-sessions/t09--marketing-analyst.

## Think-aloud, step by step

**Start screen.** OK, so this is a research network, not my thing, but fine, pretend it's a creator export. On the left there's a list "Machine learning..." with 23 and a green dot -- that's the list I kept, I guess. The right panel is already showing it: "Paints 23 nodes", Fill, Color 009E73. Green dots on the map. So "shade by how much they published" means I want that green to go light-to-dark by some count. In Gephi this is Appearance > Nodes > Color > Ranking. Here I'd expect it on the Color row.

**1. Click the color swatch.**
`timeout 120 node app-b/study.mjs --try $D/01.png task:t09 --click "009E73"`
A color picker. Custom, Libraries, hex, a color-blindness warning about orange and vermilion. Nice that it warns me, honestly -- my decks get printed gray. But this is "pick one color". Nothing says "by value" or "ranking". Dead end. I did notice a little database-cylinder icon appeared next to the swatch when my mouse was on the row.

**2. Rest the pointer on the Color row to see that icon.**
`timeout 120 node app-b/study.mjs --try $D/02.png task:t09 --key Escape --hover "Color"`
Yes, there's a cylinder icon that only shows up when I'm on the row. No label. What does a database icon mean on a color? Connect to a database? I want to see its tooltip.

**3-7. Trying to get that icon's name** (I'd just hover it in real life; here I had to guess what it's called, and every guess failed):
`--hover "From data"`, `--hover "Bind to data"`, `--hover "Color by data"`, `--hover "Use a column"`, `--hover "Set from data"`, `--hover "Vary by data"`, `--hover "Map to data"`, `--hover "Use data"` -> "nothing on screen is called ..." each time.
`timeout 120 node app-b/study.mjs --try $D/03.png task:t09 --hover "Color" --hover "data"` -> that just lit up the Data tab on the far left rail. Not it.
`--hover "Link to data"`, `"Data binding"`, `"Bind"`, `"From a column"`, `"Use a value"` -> nothing.
`timeout 120 node app-b/study.mjs --try $D/04.png task:t09 --hover "Color" --hover "Column"` -> that was "Columns: 8 of 25" at the bottom of the table. Not it.

**8. Click the bound label to see how a "from data" thing looks.**
`timeout 120 node app-b/study.mjs --try $D/05.png task:t09 --click "last_5_years"`
The Label is already pulling something "...last_5_years" with a "#" in front, and the popover has "Top N by a value". So the app clearly CAN use a column for things. Then why does Color not show me the same "#" style choice up front? Escape.

**9. Menus.**
`timeout 120 node app-b/study.mjs --try $D/06.png task:t09 --hover "Options"` (also tried "More", "More actions") -> the dots by the search box are "List options". Not about color.
`--hover "a column"`, `"by a value"`, `"Set by"`, `"from a value"`, `"value"` -> nothing.
`timeout 120 node app-b/study.mjs --try $D/07.png task:t09 --hover "Color" --hover "attribute"` -> tooltip on the label: "attributes.profile.metrics.citations.last_5_years". OK, citations, last five years. That's the label. Still not my color.
`--hover "Use an attribute"`, `"From an attribute"`, `"Set from an attribute"`, `"Color by attribute"`, `"Color by an attribute"`, `"Bind to an attribute"` -> nothing.

**10. Try the task-word button instead.**
`timeout 120 node app-b/study.mjs --try $D/08.png task:t09 --click "Analyze"`
Louvain, PageRank, Betweenness... these are network scores. "How much someone published" is a number already in the export, not something to compute. Wrong place. Closed it.

`timeout 120 node app-b/study.mjs --try $D/09.png task:t09 --click "Fill"` -> nothing happens.

**11. Back to that icon.**
`--hover "Map"`, `"Scale"`, `"Gradient"`, `"Vary"`, `"Drive"`, `"Bound"` -> nothing.
`timeout 120 node app-b/study.mjs --try $D/10.png task:t09 --hover "Color" --hover "field"`
There it is: "Use a field or result for Color". OK. That's the thing. A database cylinder for "field". I'd never have guessed that from the icon -- I only found it by sitting on it. In real life a hover would have shown me this in a second, but nothing invites you to hover it; it isn't even there until you're on the row.

**12. Click it.**
`timeout 120 node app-b/study.mjs --try $D/11.png task:t09 --hover "Color" --click "Use a field or result for Color"`
"Color from data", Source: Pick a field. A dark list: In use (id, given, family, last_5_years), Other attributes: type, then a tree: attributes > profile > contact, metrics > citations > total, relationships, "Not usable here (3)". Hmm. Citations isn't "how much they published", that's how much they get cited. Where's papers or publications? metrics shows "1" next to it but I can see citations under it...

**13. Click "metrics".**
`timeout 120 node app-b/study.mjs --try $D/12.png task:t09 --hover "Color" --click "Use a field or result for Color" --click "metrics"`
Now there's "papers" under metrics, above citations. So it was folded and I only saw the citations branch. That's sneaky -- the "1" next to metrics made me think there was only one thing in it. Papers = how much they published. Good.

**14. Click "papers".**
`timeout 120 node app-b/study.mjs --try $D/13.png task:t09 --hover "Color" --click "Use a field or result for Color" --click "metrics" --click "papers"`
"Color from attributes.pro...etrics.papers". Scale Linear, Palette Orange to brown, Values from Fit to data, Range 4 to 300, Clamp, No value: Nothing, Detach. Fine, I accept the defaults. Orange-to-brown -- will that survive a gray printout? Probably, it's light-to-dark. "Detach" -- not touching that, sounds like it breaks something.

**15. Close it and look.**
`timeout 120 node app-b/study.mjs --try $D/14.png task:t09 --hover "Color" --click "Use a field or result for Color" --click "metrics" --click "papers" --key Escape`
Wait. The whole map went orange and brown. That's not 23 dots, that's basically everyone -- I can count way more than 23 on the top arc alone. My green list is gone. The legend now has two entries: "Color: sets -- Machine learning researchers 23" in green, and "Color: attributes.profile.metrics.papers 4 to 300". But nothing on the map is green any more. And the right panel, which is supposedly MY list, still says "Paints 23 nodes", Color 009E73, green swatch. So the panel says green, the legend says green, the map says orange for everyone.

`timeout 120 node app-b/study.mjs --try $D/15.png task:t09 ... --key Escape --hover "Use a field or result for Color"` -> the icon is gone again, and the row still reads 009E73. I can't even see from the panel that I did anything.

This is the "dashboard says 4,000, download says 3,100" thing again. Which one do I believe? I asked for my 23 people shaded. It looks like it shaded the whole database and wiped my list's color. Is the 4-to-300 range fitted to my 23 or to all of them? No idea. And "4 to 300" in a legend means nothing to a VP -- "attributes.profile.metrics.papers" is a raw path, not "Papers published".

I'm stopping here. I could go poke at Undo and try again, but I don't know what I'd do differently -- I used the one control that does this.

## Outcome

Did I succeed? I don't think so. I got a "color by number of papers" shading onto the map, but it looks like it went onto everybody, not only the 23 on my list, and my list's green disappeared. The panel for my list still claims it's painting them green. If I'm right that it colored everyone, the "most productive on my list" don't stand out at all -- they're mixed in with ~150 others. If I'm wrong and it did only my list, the screen gave me no way to tell.

Single Ease Question: 2 out of 7. Finding the control took me most of the session (an unlabeled database icon that only shows when you're on the row), the field I needed was folded under a branch that looked like it had one child, and the end result contradicts itself.

Would I use this instead of what I use now? Not for this. In Gephi, "Ranking" is right there on the Color tab, and it colors what I filtered to. Here the pieces are good -- the field tree for a nested export is actually better than Gephi, which would make me flatten it in Excel first, and the color-blindness warning is something I'd want -- but if I can't trust which nodes got painted, I can't put it in a deck. I'd export the 23 with their paper counts and do it in a spreadsheet chart.

## What stood out (in my words)

- The way to "color by a number" is an icon of a database cylinder that is invisible until you're on the row. I'd have walked past it.
- "metrics 1" with citations showing under it made me think papers didn't exist. I only found it by clicking the branch.
- After I chose papers, everything on the map turned orange, not just my list. My list panel still said green, 23 nodes.
- The legend label is a raw path ("attributes.profile.metrics.papers") and "4 to 300". I'd have to retype both in PowerPoint.
- Good: the field picker handles records inside records without making me flatten anything. Good: it warned me two of my colors are too close for color-blind viewers.
- Off-topic: every vendor export comes nested like this now; the listening suite gives me JSON with "author.metrics.followers.count" and expects me to flatten it myself. At least this one doesn't.
