# Physical tools: the sieve and the probe

Two hand-held tools that wait on a rack beside the graph (to its right, lower and nearer you).

## How to use them

- **Take a tool:** point at it on the rack (or reach it) and pinch or pull the trigger, then let
  go or pull it toward you. It docks in that hand and points where the hand points.
- **The sieve** is a ring you look through, with a slider, Keep and Put back under it.
    - While you hold it, the nodes it would remove dim (color toward the background and smaller;
      never transparent), and the label above the ring reads `PageRank 0.070: keeps 5 of 15`.
    - Set the threshold with the slider, using your other hand (ray or poke). With the setting
      "Roll the wrist to set the sieve" on, rolling the holding wrist a quarter turn sweeps the
      whole range.
    - **Keep** (or a pinch or trigger with the holding hand) commits the filter; undo names it
      ("Undo: Keep PageRank at least 0.070 (5 of 15)").
    - **Put back** (or a fist or the grip with the holding hand) cancels the preview, and the
      sieve returns to the rack.
- **The probe** is a pen.
    - Touch a node with its tip, or point at a node, and a card beside the node shows its name,
      degree, PageRank and rank, and community.
    - Point at nothing and the card shows the current result (the one the graph is colored by,
      sized by or filtered by; else the sieve's) as its range and top three.
    - Every new reading is logged (`probe` and `physical-tools.reading`); readings never enter the
      undo history.
    - A pinch, trigger, fist or grip with the holding hand puts it back.
- Other techniques can hand you a tool by name, `ctx.tools.take("sieve" | "probe", hand)`; while
  physical tools is off they get the reason "Physical tools is off".

Settings (gear panel): what the sieve filters by (PageRank, degree, betweenness), wrist roll on or
off, and whether the probe reads what it points at (off: touch only).

## What it reuses

| Piece                      | Reused                                                                         |
| -------------------------- | ------------------------------------------------------------------------------ |
| Taking a tool off the rack | Babylon `SixDofDragBehavior` (ray grab and near grab, hands and controllers)   |
| Threshold slider           | Babylon GUI `Slider` on a framework panel (ray and poke, like every panel)     |
| Keep, Put back, probe card | The framework's panels, chips and `guiButton`                                  |
| Preview, commit, cancel    | The framework's command layer (`commands.preview("filter")`), and its labels   |
| Values, ranks, communities | Computed at load by `@graphty/algorithms` (PageRank, Louvain) in the framework |

## Known gaps, and what we would fix or replace

- **`Slider3D` was not used.** The design names Babylon's `Slider3D`, but it downloads its model
  and textures from `assets.babylonjs.com` at run time, which the sandbox forbids (nothing is
  fetched during a session, and the dry run fails any request off the page's own address). The 2D
  GUI slider on a panel does the same job. To use `Slider3D`, mirror its glb and two textures into
  the package and point `Slider3D.MODEL_BASE_URL` and the MRDL texture URLs at them.
- **One threshold only:** a slider has one thumb, so there is no range filter (keep between two
  values), and rules cannot be combined; the sieve keeps "at least" only.
- **The rack's place is a guess** (right of the graph, 20 cm lower, 30 cm nearer). It follows the
  graph when the graph moves; it may sit where the Figma inspector would be.
- **A preview another technique replaces is lost:** if pull to grow (or an undo) cancels the
  sieve's preview while you hold it, Keep then does nothing until you take the sieve again.
- **Wrist roll is untested on a headset**: its direction and its quarter-turn range are guesses,
  so it is off by default.
- **Hands: putting back by fist** depends on the framework's fist pose; the emulated headset has
  no fist pose, so the dry run uses the Put back button with hands and the grip with controllers.
- **The probe card follows the node** it reads; with the graph scaled down, the card can overlap
  neighbors.
- **Taking a tool picks the hand** whose ray is on the tool (else the nearer hand); two hands
  grabbing the same tool at once is not handled.
