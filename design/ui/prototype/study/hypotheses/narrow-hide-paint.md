# Design hypotheses: filtering, hiding and painting

For the design team and session runners only. Do NOT include this file in the prompt that plays a
participant: a simulated user who knows the intended answer will find it, and the session proves
nothing. The tasks below are worded so that they never name filter, hide, chip, layer or paint.

The flow these come from is `flows/narrow-hide-paint.html`. Each hypothesis is a design belief, not
a finding, until sessions support it. One that sessions do not support is dropped or reworked, not
defended.

## H1. Hiding or painting is mistaken for filtering

- **Belief:** an analyst who takes a kind of node "out of" the picture by hiding it, or by painting
  it grey, will quote statistics as if that kind had been left out. The filter chip under the
  project name, which is the only place that says a filter is on, is not enough on its own.
- **Participants:** the fraud analyst (`study/personas/fraud-analyst.md`), and one participant
  who uses Figma daily (the hide chord is a Figma habit).
- **Task (say exactly this):** "You want March statistics that describe people and businesses, not
  merchants. Get those numbers, and tell me the largest number of transfers any one account has."
- **Start state:** the March transfers open at rest, nothing filtered, hidden or painted.
- **Holds if:** at least one participant in three quotes a full-graph statistic (3,000 nodes,
  9,113 transfers, or a maximum degree of 907) while believing the merchants were left out. The
  correct answer is 14, on 2,940 nodes.
- **Does not hold if:** every participant either filters, or notices the chip before quoting and
  corrects course unprompted.
- **Record:** which move they made first (filter, hide, paint, other), whether they looked at the
  chip before quoting, the number quoted, and what they said it described.

## H2. The hidden line should say the hidden nodes are still counted

- **Belief:** after hiding, a line that reads "60 nodes, 5,302 edges hidden; still counted" makes
  more analysts realise that the statistics still include them than the design's current line,
  "60 nodes, 5,302 edges hidden".
- **Task (after the participant has hidden the merchants, by whatever route):** "How many accounts
  does the maximum degree in Statistics describe?" Ask it once, with no hint.
- **Conditions:** half the sessions see the current line, half see the "still counted" line.
- **Holds if:** the "still counted" line gets clearly more correct answers (3,000). If both lines
  get the same, keep the shorter current line.

## H3. Statistics needs its own scope line, or a stronger chip is enough

- **Belief being tested:** the design says a value whose scope is the chip's carries no mark of its
  own ("marks only on departure"). A proposal was to put "Full graph, 3,000 nodes" or "Filtered
  graph, 2,940 nodes" above Statistics at all times. The risk: a line that is always there reads
  the same filtered or not, and readers learn to skip it.
- **Task (after a filter is on, then again after it is turned off):** "How many accounts does this
  degree statistic describe?" Point at the maximum degree.
- **Conditions:** (a) the design as it is: chip only; (b) the chip in a stronger treatment (filled,
  with the funnel icon in the text colour) and still no line in Statistics; (c) an always-on scope
  line above Statistics.
- **Holds for a change if:** (c) is clearly better than (b) on both the filtered and unfiltered
  asks. Otherwise the principle stands and only the chip's treatment changes.

## H4. A rule and a fixed list are told apart

- **Belief:** an analyst who filtered from a canvas selection ("Filter out 60 nodes") expects the
  step to catch next month's new merchants, as a rule would.
- **Task (after Replace data with April):** "Are the new merchants in April's numbers?"
- **Holds if:** the participant predicts wrongly before checking, and the step's name ("60 nodes"
  against "kind = merchant") is what corrects them once they look.
