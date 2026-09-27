# Study schedule

**Job.** Plan every study the framework documents rely on, in one place, because studies share
participants. It is a plan of work, not a design fact; each canonical document keeps its own
"Validation" section saying what is tested and what passes. **Owner:** UX researcher. **Status:**
started with the information architecture's studies; the top-task vote (`top-tasks.md`), the
first-click test of filter-step controls (`interaction-patterns.md`), the channel card sort
(`interface-specification.md`), cognitive walkthroughs (`task-flows.md`) and the accessibility
audit are to be added by their owners.

## Structure studies (`information-architecture.md` 12)

The tasks, the pass bars and the decisions each study can reverse are in
`information-architecture.md` 12. This section holds what that document leaves out.

- **Order.** A small qualitative round of the tree test first, to catch wording that gives the
  answer away; then the quantitative tree test and the first-click tests on the same participants
  in one session; the catalogue card sort in a separate session.
- **Material.** The text outline of the places and collections only, with no visual design. The
  large-graph script's lists are seeded from real graphty-element session fixtures, not
  hand-written lists, so participants meet the orders the element actually produces.
- **Participants.** Drawn from the analyst personas (`design/designloom/personas/`), including
  fraud and security analysts. Figma familiarity and Gephi or Cytoscape familiarity are recorded as
  screening variables. Nielsen Norman Group advises that a qualitative tree test needs few
  participants and a quantitative one many; for card sorting it gives 15 as a floor, and Tullis and
  Wood recommend 20 to 30. Fallback when recruiting fails: paper tree tests traced against the 25
  workflows, which test reachability, not recall, and are labelled so.
- **Criteria are fixed before the study runs** and are not tuned afterwards.

## Carried from the earlier information architecture

Settled by a test or a count; each is a two-way door. From
`research/archive/information-architecture-long-form.md` 14.

| Question                                                          | What settles it                                                                               | If it fails                                                    |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Is the catalogue findable with 30 or more results in the project? | first-click, "run Louvain", palette hidden; 80% within two clicks                             | a fixed entry to the catalogue under the Results search        |
| Do returning analysts review notes from the rail?                 | first-click, "what did you conclude last week?"                                               | Notes reached from the Note tool and Find, with no rail button |
| Does the Path tool earn its toolbar slot?                         | count, over the investigation workflows, how often the first endpoint is not already selected | drop it; Find path from a node arms the same bar               |
| Is the table open most of a session?                              | measure it over "Hub Gene Identification and Ranking"                                         | the dock opens on the first run                                |
| Is Run layout on a row found?                                     | first-click, "tidy this graph", nothing selected                                              | add Run layout to the graph's type row                         |
| Is the import report found after a load?                          | first-click, "how many rows were rejected?", after the notice has gone                        | move Last import to rest in Statistics                         |

## Counting method for word and target budgets

From the long form, section 13, for `content-design.md` and `interface-specification.md`: count
app words only; names, values and counts are data; standard terms count; each (i) visible at rest
counts one. Targets are everything that answers a click at rest: a button, a link, a swatch, a
chart, a number that routes; a control shown only on hover is not counted. Figma's resting
counterpart is measured from `design/ui/figma/right-sidebar-selection/dump-nothing-selected.txt`.

## Sources

- `design/ui/framework/document-architecture.md` 3
- `design/ui/framework/information-architecture.md` 12;
  `research/archive/information-architecture-long-form.md` 13, 14
- Nielsen Norman Group, "Tree Testing" and "Card Sorting: How Many Users to Test", as cited in
  `information-architecture.md`
