# Figma crosswalk

**Job.** Say how each of Figma's objects maps onto graphty's, and list every departure from Figma
with the graph fact that forces it. **Not here:** placements (`information-architecture.md`) and
behaviour (`interaction-patterns.md`), which carry their own "Figma source" field. **Owner:** Figma
product designer. **Ceiling:** 15 KB. **Validated by:** walking Figma's own object list; an
unmapped Figma object is a rejection with a reason, never an omission.

**Status: stub.** The object map below is a first draft. The departures ledger is still the
departures table in `principles.md` and moves here when this document is accepted.

## The object map, from Figma's side

Figma's objects are taken from `research/figma.md` 2.1. Verdicts: **adopt** (same concept and
behaviour), **adapt** (same role, changed by a graph fact), **reject** (no counterpart).

| Figma object           | Verdict | graphty                                                                                      | The graph fact behind an adaptation                                                                                                                                                                   |
| ---------------------- | ------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| File                   | adopt   | project                                                                                      | --                                                                                                                                                                                                    |
| Page                   | adapt   | graph (one entry in the project)                                                             | with nothing selected the inspector is the graph's, but it leads with Statistics, denser than Figma's page panel                                                                                      |
| Section, Frame         | reject  | --                                                                                           | a graph has no canvas regions or fixed-size containers; a region of interest is a set                                                                                                                 |
| Group (Ctrl+G)         | adapt   | set, made by Create set on Ctrl+G                                                            | membership is many-to-many, so a set is not a container: a canvas click selects the node, never a set                                                                                                 |
| Layer                  | adapt   | node, edge                                                                                   | a graph has no single-parent tree, so there is no layer tree                                                                                                                                          |
| Component (main)       | adapt   | set: a named, lasting definition made by a Create command                                    | a set has members, not bounds                                                                                                                                                                         |
| Instance               | adapt   | the follow rule: a reference to a definition follows it, a reference to an instance holds it | results have runs, so a reference can hold an earlier run and say so                                                                                                                                  |
| Component set, variant | reject  | --                                                                                           | exact and sampled methods are sibling results, never variants of one; a path's kinds (Cycle, Path, Trail, Circuit, Walk) borrow only the per-kind type row, as Frame, Group and Section each have one |
| Style                  | adapt   | style layer, applied from property rows                                                      | layers stack and each has a selector; the top layer wins per channel                                                                                                                                  |
| Variable               | adapt   | result attribute: a value per element, bound from a property row, not in any tree            | its value comes from a run over a scope                                                                                                                                                               |
| Collection             | adapt   | result: the named container of a run's values                                                | --                                                                                                                                                                                                    |
| Mode                   | adapt   | the Look: a built-in set of style layers (Print, Colorblind safe)                            | a Look adds layers to the stack instead of switching a column of values                                                                                                                               |
| Flow                   | adapt   | saved view, the closest counterpart: a named starting point for presenting                   | a path has no Figma counterpart; it is graphty's own                                                                                                                                                  |
| Comment                | adapt   | note                                                                                         | a note targets graph objects, never canvas positions; markers hide with Shift+C, as comments do                                                                                                       |
| Annotation (Dev Mode)  | adapt   | a note drawn anchored to its targets; a quoted value                                         | quoted values are marked when the live value differs                                                                                                                                                  |
| Version                | adopt   | data version, in Version history                                                             | restoring appends a new version                                                                                                                                                                       |
| Branch                 | adapt   | the comparison surface (branch review)                                                       | two states are compared without copying the project                                                                                                                                                   |
| Library                | adapt   | recipe: definitions without data, copied in on apply with provenance, updates offered        | binding by attribute name replaces Figma's shared ids                                                                                                                                                 |
| Plugin                 | adopt   | catalogue entry                                                                              | plugins are code; recipes, like libraries, are content                                                                                                                                                |
| Selection              | adapt   | selection, plus object selection of a set, path or item                                      | an object selection is never truncated by the selection cap                                                                                                                                           |
| Viewport               | adopt   | camera; saved only inside a saved view                                                       | --                                                                                                                                                                                                    |

## Behaviours borrowed or refused

| Figma behaviour                                                                            | graphty                                                                                                                      | Why                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Eye on a layer row: the layer leaves auto layout and export (`design/ui/figma/flows.md` 7) | means Filter out, not a style                                                                                                | an eye on a filter step would teach a Figma user the right thing and a Gephi user the wrong thing, so filter steps get a checkbox and a funnel until a first-click test decides (`interaction-patterns.md`) |
| Eye on a fill or effect row: that paint is off                                             | the eye on a style-layer row                                                                                                 | the same meaning                                                                                                                                                                                            |
| Opacity 0                                                                                  | a style layer the reader chose; the elements stay in every count                                                             | --                                                                                                                                                                                                          |
| Tidy up                                                                                    | running a layout                                                                                                             | a one-shot arrange command                                                                                                                                                                                  |
| Auto layout                                                                                | reject                                                                                                                       | a force layout over overlapping sets cannot reflow live, and one frame owns each child in Figma, while a node belongs to many sets                                                                          |
| Nothing is kept until a command makes it lasting (`research/figma.md` 4.3, 4.4)            | adopt: Find, Select neighbors and Compare with... leave nothing; Create set, Create path, Save view and Add note keep things | the same rule                                                                                                                                                                                               |
| Missing-fonts dialog                                                                       | the recipe binding step                                                                                                      | one list, one picker per row, nothing guessed                                                                                                                                                               |
| "Update available" for a library                                                           | offered recipe updates; the offer shown when a run's automatic paint was suppressed                                          | nothing changes under the analyst without a command                                                                                                                                                         |
| Creating a variable paints nothing                                                         | departure: a completed run paints its result unless an authored layer writes that channel                                    | 15 of 20 figure-producing workflows encode a result (`top-tasks.md` 8)                                                                                                                                      |

## Open objections from the information architecture

Raised while the structure was settled. Each is this document's to decide; the placement in
`information-architecture.md` 9 comes out the same either way.

- **Component to set.** A Figma user who hears "component" expects instances, overrides and
  detaching; a set has none of them. An analogy that teaches the wrong behaviour may be worse than
  none. Proposed verdict: reject, "graphty-native".
- **Variable to result attribute only, or to every attribute.** The object map gives imported and
  computed attributes one object with "0..1 producing run" (`conceptual-model.md` 1.3), and an
  analyst binds colour to an imported score as readily as to a computed one. If the verdict widens
  to every attribute, `glossary.md` must say that imported attributes have no runs and no
  freshness.
- **Variables grid to the table.** Figma's one grid of values is the closest analogue of the table,
  and argues for a table that is a peer of the canvas. graphty docks it rather than opening it full
  screen, because selection is shared with the drawing. Proposed as a row of the object map.
- **Mode to Look.** A Figma mode re-skins what is bound and never decides what is bound. A Look is
  a set of `template` layers, and graphty-element counts `template` as authored when it decides
  whether to paint a run's suggestion (`src/session/styles/autoApply.ts:147`), so a Look that sets
  node colour silences every later run's colour. The analogy holds only once that changes
  (`one-way-doors.md` 26).

## Sources

- `research/figma.md` 2.1-2.4, 4.3, 4.4
- `design/ui/figma/flows.md` section 7; `design/ui/figma/right-sidebar-selection/README.md`
- `conceptual-model.md`; `research/archive/conceptual-model-long-form.md` section 1 (the Figma
  column of the earlier spine)
- `principles.md`, the departures table
