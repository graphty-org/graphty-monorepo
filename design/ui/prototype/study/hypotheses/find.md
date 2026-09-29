# Design hypotheses: Find and Quick actions

For the design team and session runners only. Do NOT include this file in the prompt that plays a
participant: a simulated user who knows the intended answer will find it, and the session proves
nothing. The tasks below never name Find, filter, step or scope.

The screen these come from is `screens/find.html` (nine states). Each hypothesis is a design
belief, not a finding, until sessions support it.

## H1. "in all 77 nodes" tells a filtered analyst that the search looked past the filter

- **Belief:** the result header "14 results in all 77 nodes", on a graph filtered to 28 nodes, is
  enough for an analyst to know that some hits are outside what the canvas shows, before they read
  any hit's second line.
- **Start state:** state 3 of the mock, with the list's second lines covered.
- **Probe (say exactly this):** "How many characters did that search look through, and are all of
  the ones it found on the picture right now?"
- **Holds if:** at least two participants in three answer 77 and "no" unprompted.
- **Does not hold if:** participants answer 28, or say every hit is on the canvas. Then try the
  alternative wording "Includes nodes the filter leaves out: 77 searched" in the next round.
- **Record:** the number said, and whether they looked at the chip ("Filtered: 28 of 77 nodes").

## H2. "Filtered out by "Filter out group 8"" is read as a reason, and Edit step... as the way back

- **Belief:** after committing Marius (state 3), an analyst can say why he is not on the canvas and
  what to press to bring him back, without help.
- **Task:** "You wanted to look at Marius. Where is he, and how would you get him onto the picture?"
- **Holds if:** participants name the group 8 step as the reason and choose Edit step... (on the
  hit or in the inspector) as the route.
- **Record:** which of the three places they read the reason from (the hit, the inspector, the
  legend), and whether anyone expected a verb on the legend line.

## H3. The first highlight on Betweenness, not Degree, is noticed as a choice

- **Belief:** in Quick actions, asked "who matters most" (state 8), a first-time analyst reads
  "already shown as size" on Degree and understands why the highlight starts one row lower.
- **Probe:** "Before you press anything: what would happen if you pressed Enter now?"
- **Holds if:** participants say Betweenness would run, and can say what Degree's line means.
