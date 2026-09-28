# Object cards

**Job.** Give a builder one entry point per object type: a card that says, in a few lines, where
every fact about the object lives, so building its screen never starts by searching the set.
**Not here:** the facts themselves. A card is a list of pointers, and each fact stays in the one
document that owns it (`README.md`, "One home per fact"). **Owner:** information architect.
**Ceiling:** the README's table. **Validated by:** the lint, which fails on any pointer that does
not resolve; and a builder task: assemble one screen from its card in one sitting.

**Why pointers, not generated tables.** The facts about one object were spread over seven tables,
each claiming authority for its slice, and they drifted. A generator was measured against the
cards: the object map, the inspector tables and the verb cells can be parsed, but a card's
definition, home and states are prose no table holds, so a generator would cover about half a card
and add a script to maintain. A pointer list covers all of it and cannot drift from what it points
at, because it copies nothing.

**The card form.** Every card fills every field; "none" means considered and empty.

| Field | What it points to |
|---|---|
| Definition | the model's row and section, and the glossary's term |
| How it is met | the object map's group (`conceptual-model.md` 1.3): content, definition, value, history or file |
| Home | the register's row (`output-homes.md` 1) and the place (`information-architecture.md` 3, 4) |
| Relationships | the routes each way (`output-homes.md` 4) |
| Verbs | the register's commands and starting places (`output-homes.md` 3), and the type row (`interface-specification.md` 4.2) |
| Where it is drawn | the inspector sections or template card (`interface-specification.md` 4.1; `interface-templates.md`) |
| States | the state words (`glossary.md` 10) and the cells (`state-matrix.md` 3, 7) |
| Behavior | the pattern entries (`interaction-pattern-entries.md`) |
| Element | what graphty-element publishes (`element-contract.md`) and still owes (`element-needs.md`) |
| Doors | the open decisions it rests on (`one-way-doors.md`) |

**Cards written:** style layer, with its encodings; set and path, with their offered states.
**Next**, in the order the build slices draw them: node and edge; graph; result and run; attribute;
filter step; layout settings; note; saved view; the Look; recipe; the rest of the object map.

## 1. Style layer, with its encodings

- **Definition.** `conceptual-model.md` 5.1 (selector plus encodings, the stack order, the rules
  every encoding follows); the inline rule, 4.1; `glossary.md` 7 (style layer, encoding, scale,
  palette, legend block, the section names).
- **How it is met.** A definition: edited from its row, never selected.
- **Home.** Its row in the Styles list of the Graph panel (`output-homes.md` 1;
  `information-architecture.md` 3, and 11 for why the list is in the left panel).
- **Relationships.** Painted value to its layer, style layer to its selector, style layer to the run
  that made it, recipe to what it brought (`output-homes.md` 4).
- **Verbs.** Add style layer; Color by, Size by, Width by, Label with; Highlight; Override; Fix at
  <value>, Edit a copy; Reset, Reset to default, Clear; Hide, Show; Move up, Move down; Fade others
  (`output-homes.md` 3.6, 3.4).
- **Where it is drawn.** The Styles list card (`interface-templates.md` 9); the style-layer editor
  and the encoding popover (`interface-templates.md` 10); Appearance rows by kind
  (`interface-specification.md` 3.1); the bound channel row (`interface-specification.md` 2.3); the
  legend (`canvas-drawing.md` 8; `options-and-encodings.md` 6).
- **States.** A row's states (`options-and-encodings.md` 4); counts at rest and past them
  (`state-matrix.md` 7); readability by size (`scale-levels.md` 4); style cost
  (`state-matrix.md` 4.1).
- **Behavior.** Bind a property (`interaction-pattern-entries.md` 6.6); from a painted value to its
  layer (`interaction-pattern-entries.md` 4.7); many rows and the count cut
  (`interaction-pattern-entries.md` 6.8); the row toggle (`interaction-pattern-entries.md` 6.5);
  the write rule for Appearance (`interaction-patterns.md` 3.2).
- **Encodings.** Channels and their sections (`options-and-encodings.md` 2, 3); the verbs by source
  (`options-and-encodings.md` 4); default scales by measurement level (`options-and-encodings.md`
  5); palettes checked on both canvases (`canvas-drawing.md` 4).
- **Element.** `styles.list()`, `styles.encode`, `styles.legend()`, `styles.explain()`
  (`implementation-mapping.md` 5, the card table); what is owed, the "Style layers and encodings"
  area of `element-needs.md`.
- **Doors.** 20, A measurement level per attribute; 26, Whether a finished run paints; 31,
  Overrides, Base style and the stack order; 58, The legend and not-drawn notice; 84, A category's
  color fixed at first paint; 85, What a Look is; 5, Project parts and graph parts (the stored
  order).

## 2. Set and path, with their offered states

- **Definition.** `conceptual-model.md` 1.3 (the object map, with the offered state), 4.1 (set,
  inline rules, the lifecycle), 4.2 (path); `glossary.md` 3 and 4 (set, fixed, rule, path, Edges
  included, group, found path).
- **How it is met.** Content: selected, and can serve as a scope; a group and a found path are a
  set and a path in their offered state until Create set or Create path keeps them.
- **Home.** A kept set or path: its row in Sets and paths; an offered one: its row in its result's
  item tab (`output-homes.md` 1; `information-architecture.md` 3).
- **Relationships.** Set to what made it; object to what depends on it; element to its
  memberships; filter step or style layer to a kept set it references (`output-homes.md` 4).
- **Verbs.** Create set, Create path, Freeze as fixed set, Extend path, Create set to style, Create
  rule set, Union, Subtract, Intersect, Exclude, Add to set, Take out of set, Collapse, Expand
  (`output-homes.md` 3.3); Filter to, Hide on canvas (`output-homes.md` 3.4); Compare with...,
  Extract as graph (`output-homes.md` 3.5); Run layout (`output-homes.md` 3.7); the type rows of
  the Set, Path and offered kinds (`interface-specification.md` 4.2).
- **Where it is drawn.** The Set, Path and offered kinds' sections (`interface-specification.md`
  4.0, 4.1); the Graph panel card (`interface-templates.md` 2); a hull and member rings
  (`canvas-drawing.md` 6, 12).
- **States.** Detached, Cannot evaluate (`glossary.md` 10); collection counts (`state-matrix.md` 7).
- **Behavior.** Select (`interaction-pattern-entries.md` 4.1); Enter to members
  (`interaction-pattern-entries.md` 4.2); narrow, grow and hide (`interaction-pattern-entries.md`
  6.9); many rows (`interaction-pattern-entries.md` 6.8).
- **Element.** `session.sets` (`element-contract.md` 9); what is owed, the "Selection" area of
  `element-needs.md` and object selection in slice 5 (`implementation-mapping.md` 9).
- **Doors.** 39, Selection as element state, and the cap; 27, Identifier lists as rule sets; 89,
  The form of element-minted ids.

## Sources

- `conceptual-model.md` 1.3; `output-homes.md`; `interface-specification.md`;
  `interface-templates.md`
- Sophia Prater's ORCA method of object-oriented UX (objects, relationships, calls to action,
  attributes), which produces one object guide rather than several partial ones; cited for its
  method as the team's reviews described it, not re-read for this document
- Open decisions cited (`one-way-doors.md`): 5, Project parts and graph parts; 20, A measurement
  level per attribute; 26, Whether a finished run paints; 27, Identifier lists as rule sets; 31,
  Overrides, Base style and the stack order; 39, Selection as element state, and the cap; 58, The
  legend and not-drawn notice; 84, A category's color fixed at first paint; 85, What a Look is; 89,
  The form of element-minted ids
