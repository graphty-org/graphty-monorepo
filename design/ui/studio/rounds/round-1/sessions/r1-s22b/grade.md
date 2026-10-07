# Grade: Grace, the Medici and the families they married into (Florentine families)

**Grade: SD (success with difficulty).** False "done": no.

## Against the success definition

Success B asks for the Medici selected and the six families named from the screen: Acciaiuoli,
Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni. Grace found the Medici by search (05.png),
selected them and read "Degree 6" (06.png), then selected the neighborhood (08.png). She then
clicked each of the six highlighted nodes in turn and read the name at the top of the inspector
(21.png to 26.png). Her final answer, 6 families named Salviati, Acciaiuoli, Tornabuoni, Ridolfi,
Barbadori and Albizzi, is right in count and in every name, and every name was on screen when she
read it.

The answer key grades "neighbors read by clicking around the drawing" as SD, not S: she never
reached the list of the Medici's connections that opens from the Degree value. The last
screenshot (26.png) shows Albizzi selected with Degree 3, the last of the six; it does not show
the six together.

Her "Did I finish? Yes" matches what she read, so it is not a false "done". Her statement of what
the program knows about the Medici (id, name, Degree 6) matches 06.png.

No files were downloaded; none were asked for.

## Steps and wrong turns

- Success path: 6 steps (open the sample, `/`, type, ArrowDown, Enter, click Degree).
- Steps taken: 26 screenshots (about 4x the path). The first 6 steps (01 to 06) are on or near
  the path; step 04 was a tool miss (the search box answered to no name), retried at 05.
- Wrong turns: 11, each abandoned: clicking "Acciaiuoli (1)" (09), the Data rail looking for a
  table (10), the Legend hover (11), hovering a node for its name (12), the selection's "..." menu
  (13), the node table row that opened "Add to Florentine families" (14, cancelled at 15), the
  Style tab (16), the `name` attribute (17), a right-click on the Medici (18), the Style tab again
  (19), Quick actions (20).
- The Neighborhood selection (07, 08) is not the success path but is what let her count and
  locate the six; it is counted as a productive detour, not a wrong turn.

## Problems

| # | Severity | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 3 | behavior | The Degree value is the only route to the list of a node's connections, and nothing marks it as one: "Degree 6" reads as plain text beside id and name. Grace read it twice and never clicked it; she fell back to clicking six nodes one at a time. | 06.png, 18.png |
| 2 | 3 | behavior | With 7 nodes selected, the inspector's id and name rows show a single value, "Acciaiuoli (1)", with no sign that 6 other values exist and no way to open them; clicking it did nothing. Grace read it as "one name, not the list of seven". | 08.png, 09.png |
| 3 | 2 | wording | The selection header says "7 nodes, 0 edges" while the row below says "Edges among them 7". Both are true (no edge is selected; 7 edges join the selected nodes), but read together they contradict each other. | 08.png |
| 4 | 2 | behavior | Clicking the node table row under Data > Sources opens "Add to Florentine families", an import screen, instead of showing the table. Grace was afraid of adding something by accident. On returning, her neighborhood selection was gone (the step also pressed Escape first, so which of the two cleared it is not settled). | 14.png, 15.png |
| 5 | 2 | behavior | No way to see or copy the names of a selection as a list; a user with a list task has to click node by node and remember positions from an earlier screenshot. | 13.png, 21.png to 26.png |
| 6 | 2 | behavior | "Add label line" in Quick actions is greyed out with no reason given, so the one command that would have put names on the drawing could not be used or understood. | 20.png |
| 7 | 1 | opinion | Hovering a node shows nothing; she expected its name. | 12.png |
| 8 | 1 | wording | "Degree" is unexplained jargon for a first-time user; she trusted it only after the Neighborhood selection agreed. | 06.png |
| 9 | 1 | wording | The Neighborhood tooltip reads "NeighborhoodG": the shortcut letter runs into the word. | 07.png |
| 10 | 0 | opinion | No names drawn on the nodes by default; every family looks the same until selected. | 03.png |

None of these is marked as a build defect: each is a design or wording finding, held to the
two-participant rule for confirmation. Problem 2's "clicking does nothing" may be a build defect
if the value is meant to be a control; a scripted repro was not run because every browser slot
stayed busy.

## What worked

- Search found the Medici on the first real try and selected them in one click (05, 06).
- The Neighborhood button (G) highlighted exactly the six families plus the Medici, and its count
  agreed with Degree 6, which gave her confidence in the number (08).
- Each node's inspector showed its name at the top, so the click-through gave correct names.
