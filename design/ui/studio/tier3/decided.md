# Tier 3: settled behaviors

Every dry-run triage reads this file and cites it. A pilot complaint against a behavior listed
here is classed "no change". Reversing one needs a new dated entry below it, with the reason and
the evidence; the old entry stays.

## Keyboard: what is a Tab stop

- **A disabled "+" is not a Tab stop** and keeps its reason on hover. (2026-10-18.) Five pilots
  tabbed through two dead stops on every styling task. A dimmed Undo stays reachable, because its
  state is worth reading. Earlier passes flipped this both ways.
- **A condition card's remove button is a Tab stop, in the order it is drawn**: in the card's
  header, before the card's values. (2026-10-18.) Pass 3 made it reachable; pass 4 found it after
  the values although it is drawn above them. Earlier passes flipped whether it was reachable.
- **The layer tree, the canvas toolbar and a grid are one Tab stop each**, entered at their first
  item, walked with the arrows. (2026-10-17.) F6 moves between regions for the long walks.
- **The usage-data notice is last in the start screen's Tab order.** (2026-10-17.)

## Escape

- **Escape on a node's inspector clears the selection**, as the canvas menu says. Escape in the
  table grid moves focus to the toolbar's Table button. (2026-10-18.) Earlier passes flipped what
  Escape does in the inspector.
- **Escape in a style field keeps focus in the field** everywhere. (2026-10-17.) Leaving the field
  left focus on the page.
- **A second Escape in an empty find box leaves the box and keeps the selection.** (2026-10-18.)
  Four pilots lost a selection they had just made when it cleared it.
- **Escape keeps edits in the picker and in a card; "Done" closes it.** (2026-10-16.) No cancel.

## Lists and cards

- **Tab in a list with letters typed and an option highlighted takes that option**; with nothing
  typed, Tab closes the list and takes nothing. (2026-10-18.) Two pilots lost a nearly made
  condition.
- **Opening an existing card changes nothing**: it opens with its suggestion list closed; typing or
  ArrowDown opens it. (2026-10-18.) A reader opening a colleague's rule rewrote it with two keys.

## Values and the key

- **An unset line takes the value it shows** when the reader presses Enter on it or types it.
  (2026-10-18.)
- **A "+" never changes the drawing**: its line starts at what the nodes draw now, or waits unset.
  (2026-10-18.)
- **A key lists only the values its layer's nodes hold**; the key and the drawing never disagree.
  (2026-10-18.)
- **The base layer Everything takes no condition.** (2026-10-17.) A condition on it removed every
  other node from the drawing in four pilots.

## Undo

- **Control+Y redoes**, beside Control+Shift+Z. (2026-10-18.)
- **No confirmation for an act that can be undone.** (2026-10-17.)
