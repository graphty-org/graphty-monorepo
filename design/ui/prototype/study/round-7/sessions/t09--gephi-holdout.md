# Session: shade the kept researchers by publication count -- the Gephi holdout

Participant: Dr. Mara Lindqvist (fictional), associate professor of computational social science,
Gephi user since 0.8. Plays at 1440x900.

Task as given: "Shade the researchers on the list you kept by how much each one has published, so
the most productive stand out. The data on screen is a sample: one export from a research
database, researchers and institutions with records inside records. If that is not your line of
work, treat it as your own nested export."

Start screen: shots/tasks/t09/01.png.

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t09--gephi-holdout/ (written as $OUT below).

## Think-aloud, step by step

**Start screen.** "So the list I kept is this 'Machine learning researchers' set, 23 nodes, painted
green. In Gephi this is a ranking on node color, filtered to that partition. The right panel has
Fill, Color, a hex value. That's a flat color. I need it to become a ranking. Let me click the
value and see if it turns into one."

**01** -- `timeout 120 node app-b/study.mjs --try $OUT/01.png task:t09 --click "009E73"`

"A color picker. Custom and Libraries tabs, a hex field, some swatches, a color-blindness warning
about two colors I am not using. That's partition color, a single value. But now a little
cylinder icon showed up next to the color row. A cylinder usually means a database. That might be
'take this from the data'."

**02** -- `--click "009E73" --key Escape --hover "009E73"`

"The cylinder only appears when my pointer is on the row. No label, no tooltip I can see. I have to
guess what it's called."

**03** -- `--hover "009E73" --click "From data"` -> nothing on screen is called "From data".

**04** -- tried hovering "Ranking", "Data", "Use data", "Map from data", "Color by attribute" after
the row hover. Only "Data" matched; re-rendered it alone:
`--hover "009E73" --hover "Data"`. "That just lit up the Data icon on the left rail. Not the
cylinder."

**05** -- more name guesses after the row hover, each to a scratch render: "From a column",
"Column", "By value", "Vary by", "Bind", "Use a column", "From column", "Scale", "Gradient".
Only "Column" matched; rendering it showed it was the "Columns: 8 of 25" button at the bottom.
"Still not the cylinder. I'm spending my time guessing an icon's name."

**06** -- `--click "Color"` (the row label). "Nothing happens, other than the cylinder showing
because I'm on the row."

Further guesses, to scratch renders: "Bind to data", "Bind to a column", "Link to data", "Set
from data", "Map to data", "Data-driven", "From an attribute", "From attribute", "Use an
attribute", "Attribute", "Connect to data", "By attribute", "Color from data", "Color by data",
"Color by a column", "Color by", "Use data for color", "Drive from data", "Variable", "Apply
variable". Only "Attribute" matched, and that's the blue "from the attribute profile" link in the
header. "I've given that icon fifteen names. None of them is its name."

**07** -- `--click "last_5_years"` (the Label value, which shows "# a...last_5_years").
"I noticed the label is already a number column, 'last_5_years' -- presumably publications in the
last five years. So this tool CAN bind a property to a column. The popover shows Text as a column
dropdown, 'Every node' or 'Top N by a value', a position grid. The column name is truncated even
here: 'a...last_5_years'. I can't tell whether that's publications or citations in the last five
years. And this is the label, not the color."

**08** -- `--click "Table"`. "Good. A Data Lab. 200 nodes from network-export-2026-03.json. The
nested fields are flattened into dotted names: attributes.orcid, attributes.profile.field,
attributes.profile.h_index. Sortable-looking headers. That's the first thing I actually trust.
The publication column is off to the right where I can't see it."

**09** -- `--click "Table" --click "Columns: 8 of 25"`. "A column chooser with a tree: id, given,
family, last_5_years marked 'Label (set)', tags, type, attributes > profile, contact, metrics >
citations > total, relationships. I still can't see what 'last_5_years' sits under. There's a
'citations total' under metrics, which is a different measure from publications. If the
publication count is 'last_5_years', I want its full path before I put it on a figure."

**10** -- `--click "Table" --click "Columns: 8 of 25" --click "last_5_years"`. "That just hid the
column from the table, 8 of 25 became 7 of 25. It's a show/hide list, not Gephi's Ranking tab."

**11** -- tried names for the "..." menus: "More", "More options", "Layer options", "Options",
"Actions", "Set by data", "Map", "Link", "Drive with data". Rendered "Link" after the row hover:
`--hover "009E73" --hover "Link"`. "Nothing visible. Probably the header link again."

**12** -- `--click "More"`. "A big menu, and it's titled 'Community 3'. My set is called
'Machine learning researchers'. Which thing did I just open the menu of? Rename, select members,
show in table, Analyze, Keep as set, Move to folder, Lock, notes, Compare with, Export, Delete.
Nothing about coloring by a value."

**13** -- `--click "009E73" --click "Libraries"`. "Back in the color picker, the other tab. Now
this is promising: 'Purple to yellow' -- that's viridis -- 'Orange to brown', 'Blue to yellow',
'Black to yellow', 'Blues', 'Greens'. Sequential palettes. That's what a ranking is made of."

**14** -- `--click "009E73" --click "Libraries" --click "Purple to yellow"`. "I click the palette
name, expecting it to ask me which column to spread it over. Nothing. The panel still says 009E73,
the graph is still flat green. These are just swatches to pick one color from. That's my third
dead end on the one basic thing I came to do. In Gephi this is Appearance, Nodes, Color, Ranking,
pick the column, Apply. Four clicks. I'd have been done in Gephi by now."

Stopped here.

## Outcome

- **Did I succeed?** No. The 23 researchers are still one flat green. I never found how to make
  color follow a number.
- **Single Ease Question (1 = very difficult, 7 = very easy):** 2. The table and the column tree
  are fine; the task itself was not doable for me.
- **Would I use this instead of Gephi?** No. I'd stay on Gephi. The one control that probably does
  the job -- that cylinder next to the color -- has no name I could find, appears only under the
  pointer, and the palettes that look like a ranking don't do anything. The column I would have
  ranked on is shown as "a...last_5_years" everywhere, so even if I had found it I couldn't say in
  a methods section what I colored by.

## What got in my way, in order of how much it cost me

1. The control for coloring from a column is an unlabeled cylinder that appears only on hover, and
   I could not learn its name by resting on it. Twenty-odd guesses ("Ranking", "From data",
   "Color by attribute", "Bind to data"...) all missed.
2. The sequential palettes (viridis and friends) sit in the single-color picker and clicking one
   does nothing. They look exactly like the start of a ranking and are not.
3. The publication column is truncated to "a...last_5_years" in the label row, the label popover
   and the column tree, so I cannot see whether it is publications or citations.
4. The "..." menu I opened is titled "Community 3" while the layer I'm looking at is "Machine
   learning researchers". I don't know what object that menu belonged to.
5. Clicking a name in the Columns list toggles the table column; it offers nothing else (no
   "color by", no "size by"), which is where I'd look for Ranking in a Data Lab.

## What I liked

- The table: 200 nodes, the source file named, nested records flattened to dotted paths with
  type markers (Abc, #). That's a Data Lab I'd trust.
- The column tree that keeps the nesting of the export and says what each column is in use for
  ("Key", "Label (set)").
- "Local only" in the top bar, and undo/redo right there.
