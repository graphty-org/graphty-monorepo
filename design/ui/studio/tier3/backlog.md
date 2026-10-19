# Tier 3: cosmetic backlog

Problems that neither block a task nor mislead a reader: spacing, alignment, a clipped label whose
meaning still reads, a working but inconsistent component. They are fixed later in batches, each
with a test, never inside a dry-run loop. Newest first.

## From the dry run on build e3c5bca8e6 (2026-10-19)

- A tooltip shown on hover or focus covers a neighboring control or line: Effects "+" over
  "Remove node color" (T38B), "Add to node visibility" over Shape "+" (T43A), "Edge width by
  attribute" over Arrowheads "+" (T45B), "Label settings" over "Show all labels" and "Node label
  size by attribute" over the label count (T44B), "Node shape by attribute" over the "Not set
  yet" hint (T47B), a color square's tooltip over the square to its left (T51B), the key's
  "green" over "6 of 24 nodes" (T50B), the size chip's "donations 1 to 6" over the Size label
  (T43B). Place a tooltip on the side away from the next control in reading order.
- A cover layer's row in the layer tree shows no swatch, unlike group rows (T48A).
- A filter step's count reads "24 to 24 nodes" before it changes anything (T42A).
- A "Color by" grid cell's spoken name has a stray space before the comma: "company , 6 nodes"
  (T51B).
- After Done, the Effects heading is drawn brighter, as if hovered (T51B).
- The Memberships "Group 4" button looks like plain text (T46B).
