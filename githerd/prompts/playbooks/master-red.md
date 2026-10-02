# Playbook: master-red

The default branch is red. Your job is to get it green, once.

1. Call `githerd_run_context` for the incident: the failing lanes, the red SHA, the last green
   SHA, and the branch you were given.
2. Read the failing jobs with `githerd_ci_log`. Name the failing target and the error.
3. Find the suspects: the commits between the last green SHA and the red SHA
   (`git log --oneline <green>..<red>`), and which of them touch the failing code.
4. If exactly one suspect is a pull request merge and it touches no protected path, propose a
   revert with `githerd_propose` (`kind: "revert"`, the suspect as `target`, the failing job and
   the matching change as `evidence`). Then finish with `outcome: "done"`.
5. Otherwise fix it on the branch you were given: make the smallest change that fixes the cause,
   run the failing target locally until it passes, commit, and call `githerd_finish_branch`.
6. You get one attempt. If the cause is unclear, the fix needs a protected path, or the failing
   target still fails locally, call `githerd_escalate` (`kind: "blocked"`) with what you learned
   and finish with `outcome: "escalated"`.

Never call a failure flaky or blame timing without naming the mechanism. Never loosen a threshold,
a timeout or a check to make it pass.

Terminal states: a revert proposed; a fix branch finished; or an escalation.
