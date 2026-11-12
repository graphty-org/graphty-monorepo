# T77 A pilot, dry run (targeted re-pilot on build f0a9a014cb)

Build f0a9a014cb (`.study-builds/tier5-r1d1-f0a9a014cb`), start `setup:volunteers-thanks.txt`
(the volunteers project: filter card "trained Yes / hours min 10", layer Staff "role staff" in
E4572E). Walks under the main checkout's `tmp/design-studio/tier5/r1d1/pilot/T77A/`. The walks
of the same names made on the earlier build 797a4f6b47 were moved aside to
`success-old-797a4f6b47`, `touched-18-old-797a4f6b47` and `touched-37-old-797a4f6b47`.

This pass walks only the pointer success path and the routes the fix pass touched that belong to
this task: "T77A success path: Or group added to Staff" (touched-18) and "T77A success path and
detour-1: Staff layer under the colleague's filter" (touched-37). Every other route in the
touched list belongs to another task or dataset.

## Routes walked

### success (pointer)

Replayed from the previous pass's success walk (`r1d3/pilot/T77A/success`); all 11 steps
matched the screen.

- Data; the card's row "trained Yes"; the row "hours min 10"; double-click the "hours from" box,
  type 20, Enter; Done (`tmp/design-studio/tier5/r1d1/pilot/T77A/success/06.png`): one filter
  card "trained Yes 10 of 24", outline "trained Yes / hours min 20"; top bar "10 of 24 nodes, 13
  of 63 edges"; key "Color: Staff, 4 of 10 nodes".
- Graph; the Staff layer's row "role staff"; Or...; hours; type 30, Enter; Done
  (`tmp/design-studio/tier5/r1d1/pilot/T77A/success/12.png`): Which nodes "6 of 10", A role
  staff 4, or B hours min 30 6; Staff row 6; key "Color: Staff, 6 of 10 nodes"; six nodes drawn
  orange.
- Counts match the answer key: 10 in the picture, 6 in orange. The data stays the volunteers
  project throughout; one filter card the whole way.

### touched-18: Or group added to Staff

The same route as the success path, replayed from the earlier build's walk; all 11 steps
matched. End screen `tmp/design-studio/tier5/r1d1/pilot/T77A/touched-18/12.png`: 10 of 24 in
the picture, Staff 6 of 10 (A 4, or B 6), key "Color: Staff, 6 of 10 nodes".

### touched-37: a second filter card and a new layer, then the Or group on Staff (detour-1)

Replayed from the earlier build's walk; all 11 steps matched.

- Data, Add filter, hours, type 20, Enter (`touched-37/03.png`): a second card "hours min 20"
  beside "trained Yes"; the Filters heading reads "10 of 24", the top bar 10 of 24.
- Done; Graph; + > Layer; Which nodes; hours, 30; Done; Fill, E4572E, Enter
  (`touched-37/09.png`): Layer 1 "hours min 30", 6 of 10, key "Color: Layer 1, 6 of 10 nodes".
- The Staff row, then its "role staff" row, Or..., hours, 30, Enter, Done (`touched-37/12.png`):
  Staff 6 of 10 (A 4, or B 6), its Fill marked "Covered by Layer 1 on 6 of 6"; the key still
  names Layer 1. Both layers paint the same six nodes the same color, so the counts read 10 and 6
  as the key expects; graded by the answer key's rule on a second filter card and a new layer.

## Mismatches with the answer key

None.

## Defects that can spoil the task or its grade

None seen on these routes.
