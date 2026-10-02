# Grades: first open at work, decide what may leave the computer

The task: "This is your first time opening graphty at work. Your IT policy says nothing about your
work may leave your computer. Decide what you are comfortable with, then start on the sample of
characters."

The intended path: on the start screen, open "What is collected" in the usage-data banner, read it,
answer (No thanks, or Share usage data with a reason), see the confirmation, and know that Settings >
Privacy is where the answer can be changed.

Grading rule: success means the participant read what is collected before answering, answered, and
the screen confirmed the choice. Success with difficulty means they answered without reading the
list and then went to Settings > Privacy to check, or reached the end after a wrong turn or a long
search. Failure means they believed their graph data would be sent by usage data, or could not find
where to change the answer. Grades go by what was on screen and what they concluded, not by how
they rated themselves.

What the grade does not count: everything the participants did after the privacy decision (the
Assistant settings, the table, exports, filters). Those detours are reported as findings below.
Two things all three ran into are artifacts of the clickable skeleton, not of the design, and are
not held against the task: the "Local only" chip opening Settings over a Les Miserables project
already full of layers (the skeleton has one routed Settings state, and it sits on that project),
and a key already filled in on the Assistant page of a "first run" (the same seeded state).

## Results

| Participant | Their own verdict | Grade | Why |
|---|---|---|---|
| Fraud analyst | success with difficulty | success | Opened "What is collected" first, read the session-replay line and decided no; hovered "Local only" (tooltip: "Change this in Settings > Privacy"), pressed No thanks and got "Usage data stays off." (04.png), then opened Privacy from the chip and read "Usage data: Off. Nothing is sent." Concluded correctly that files never leave and usage data is off, and correctly that the Assistant, not usage data, is what would send node names. Her lower rating comes from the Assistant having no off switch and the pre-filled key, which are outside this task. |
| Cybersecurity analyst | success with difficulty | success | Opened "What is collected" first, then pressed the "Local only" chip before answering and read the Privacy page, then pressed No thanks and got the toast. Reading Privacy before answering is a check, not a wrong turn. Concluded correctly on all four rows of "Where your data goes". She noticed the Privacy page said "Usage data: Off" while the banner was still unanswered and asked whether that meant off or undecided; she settled on off, which is right, but the question is a finding. Her lower rating is the Assistant off switch and the key, as above. |
| Screen-reader analyst | failure | success | Opened "What is collected" first and decided no on the replay line, pressed No thanks (02.png), then reached Settings > Privacy from the chip and read the whole statement correctly (03.png). The privacy part was complete and correctly understood by step 3. Her "failure" is about what came later: pressing the "37 of 77 nodes" filter chip after Filter to neighbors landed her in the "Transfers, March 2026" sample with "Nothing to undo" (21.png, 22.png). That jump is the skeleton's route for that chip pointing at another sample's state, not a design the participant could have navigated, and it happened well after this task's goal. It is a severe finding for the filter chip task, not evidence against this one. |

Totals: 3 success, 0 success with difficulty, 0 failure, 0 gave up. Ease scores: 5, 5, 3 out of 7
(the 3 is driven by the post-task dead end).

All three opened "What is collected" before answering without being prompted, all three declined on
the same line (the masked session replay), and all three found the Privacy page from the "Local
only" chip on the first try. None believed their graph data would be sent by usage data.

## Findings

Severity is Nielsen's 0-4 scale. Counts are participants out of 3.

1. **No way to switch the Assistant off (3 of 3, severity 3).** Every participant read "The
   Assistant ... sends your question with node names and statistics to Anthropic" on the Privacy
   page and went looking for an Off. The only route was "Forget all keys", which all three
   described as "off by accident": anyone who pastes a key turns it back on with nothing visible.
   Two of the three asked for a switch an administrator can see or lock. This is the strongest
   finding of the task and sits on the Privacy and Assistant pages, not the banner.

2. **The masked session replay ends the conversation at work (3 of 3, severity 2).** All three
   declined on that line: "Masked or not, a recording of my work leaving the building." The list is
   doing its job (they decided with the facts), so this is a product finding, not a usability one.
   Two of three also flagged "his Claude Code sessions" in the banner as "an AI reads it", which
   pushed them toward no before they opened the list.

3. **The header chip does not state the usage-data choice (3 of 3 saw it, severity 1).** "Local
   only" reads the same before and after the answer; the only confirmation is a toast that
   disappears (the screen-reader analyst: "gone by the time I hear the next thing"). Its tooltip,
   "Change this in Settings > Privacy", made the fraud analyst think local-only itself could be
   turned off. The chip should either name both states (files local, usage data off) or its
   tooltip should say what can be changed.

4. **"Usage data: Off" before the question is answered (1 of 3, severity 1).** The Privacy page
   shows Off while the banner is still waiting. One participant asked whether Off meant
   "not yet decided". A single voice; worth one word ("Off until you answer") rather than a change.

5. **"In this browser" listed as an Assistant provider but not choosable (1 of 3, severity 2,
   possibly the study tool).** The one option that matched the policy could not be picked. The
   other two never opened the list because pressing the shown value did nothing. Check whether
   the skeleton's list is clickable before treating this as a design defect.

## Not counted (skeleton artifacts, 3 of 3)

- Pressing "Local only" on the start screen opened a project behind the Settings dialog.
- The Assistant page showed a stored key on a first run.
- (Screen-reader analyst only) the "37 of 77 nodes" chip led into a different sample.

All three are worth fixing in the skeleton so the next round does not spend participant attention
on them; none is a claim about the intended design.
