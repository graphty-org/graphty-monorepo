# Session r1-s16b -- T10, prompt B (College football), participant Sam

Persona: Sam, a keyboard-only business-intelligence analyst (RSI in both wrists, no mouse).
Source file: design/ui/studio/personas/keyboard-only-sam.md. He uses only `--key`, never clicks.

Task prompt: "You have never used this program before. You will practice on the ready-made network
of American college football teams and the games they played, which comes with the program, not on
your own data. Right now no names are written on the drawing. Get every team's name written next
to its dot."

Start: empty. Build under study: commit 4522851420998602a015e60ae2cbf339049a2c97, graphty@0.8.53.

Note on the session: the start waited about 25 minutes for a free browser slot (about 20 sessions
were queued for 4 slots). The session was cut short after step 13, before the task was finished,
and ended with `--end`. The findings below cover only what Sam reached.

All commands were run from `design/ui/studio` with `S=rounds/round-1/sessions/r1-s16b`.

## Steps

1. `node tool/real.mjs --start $S empty` -> 01.png
   Start page: Start (Open project or file..., New from data...), Recent projects (empty),
   Samples (Les Miserables, Zachary's karate club, College football, Florentine families), and a
   usage-data consent panel at the bottom.
   Sam: "Nothing has focus that I can see. College football is in the Samples list. Tab."

2. `--step $S --key Tab` -> 02.png
   Focus ring on "Local only" (top right), with a tooltip "Nothing is sent. Opens Settings >
   Privacy".
   Sam: "One tab, visible ring. Good. Keep going toward the samples."

3. `--step $S --key Tab --key Tab --key Tab` -> 03.png
   Focus ring on "New from data..." (the order was Local only, gear, Open project, New from data).
   Sam: "Four tabs. Samples next."

4. `--step $S --key Tab --key Tab --key Tab` -> 04.png
   No focus ring visible anywhere on the page.
   Sam: "Seven tabs and I've lost focus. I can't see where I am." (hesitation)

5. `--step $S --key Shift+Tab` -> 05.png -- still no ring visible.
6. `--step $S --key Shift+Tab` -> 06.png -- still no ring visible.
7. `--step $S --key Shift+Tab` -> 07.png -- ring back on "New from data...".
   Sam: "So the three stops after 'New from data' show no ring at all. My guess is they are the
   first three samples in order. That cost me three extra presses to find out."

8. `--step $S --key Tab --key Tab --key Tab --key Enter` -> 08.png
   College football opened: 115 nodes, 613 edges, one component. No names on the dots. Left
   panel: search box, Selection, Everything. Right panel: Graph, Style / Values tabs (Values
   showing). Bottom toolbar of five icon buttons.
   Sam: "It worked, but blind. 16 key presses to open the sample, 3 of them with no visible focus."

9. `--step $S --key Tab` -> 09.png
   Focus went to the bottom toolbar, "Legend" button, tooltip "Legend L".
   Sam: "It shows the shortcut letter. I like that."

10. `--step $S --key Tab` -> 10.png
    Focus skipped the rest of the toolbar and landed on the "From College football" link in the
    right panel.
    Sam: "The toolbar is one tab stop; the other buttons must be on arrow keys. Fine, but nothing
    told me so."

11. `--step $S --key Tab --key Tab` -> 11.png
    Focus ring on the "Values" tab.

12. `--step $S --key ArrowLeft` -> 12.png
    The Style tab opened: Canvas (Background F5F5F5), Method (Force - Recommended), Seed (1).
    Nothing about names or labels.
    Sam: "Graph-wide style is background and layout only. Names belong to the nodes, so I probably
    need 'Everything' in the left list first."

13. `--step $S --key Shift+Tab` x4 -> 13.png
    No focus ring visible anywhere. The Style tab is still selected but no longer outlined.
    Sam: "Lost focus again. I expected to be on 'Everything' in the left list. I can't see it."

Session stopped here and was ended (`--end $S`).

## Where Sam hesitated

- The sample list on the start page: three tab stops with no visible focus indicator.
- After four Shift+Tabs from the Style tab: focus not visible anywhere.
- Graph Style tab: expected a place to turn on names; found only background, layout and seed.

## Sam, in character, at the end

- **Did you finish?** No. The football network is open, but I never got the team names on the
  dots. I stopped while trying to reach the node list to look for a names setting.
- **How hard was it (1 = easy, 7 = very hard)?** 5 so far. Opening the sample worked, but I did it
  blind. Twice in a few minutes I could not see where focus was, and that is exactly what makes me
  avoid a tool.
- **What confused me:**
    - The sample entries on the start page take focus but show no ring. I had to guess my way to
      College football by counting.
    - The bottom toolbar is a single tab stop with arrow keys inside; nothing on screen said so.
    - The Style tab for the whole graph has no labels or names option, so I didn't know where names
      live.
    - Walking back from the right panel toward the left list, focus disappeared again.
    - Key presses: 16 to open the sample, 9 more on the graph screen without getting to the
      names setting.
