# Playbook: pr-fix

A required check on the target pull request failed while the default branch is green, or the
owner rejected some of its images.

1. Call `githerd_run_context`: the PR, its head, the failing checks, and any reject block.
2. Reproduce. Read the failed job with `githerd_ci_log`, or read the reject block, and run the
   same target locally in this worktree.
3. Decide which case it is:
    - **A real failure.** Fix the cause in the smallest change, run the failing target and the
      affected tests until they pass, commit, and call `githerd_finish_branch`.
    - **A failure you can explain as flaky.** Only when you can name the mechanism (what raced,
      what was shared, what external thing failed), call `githerd_rerun_failed` with that
      mechanism. "It passed locally" is not a mechanism.
    - **Rejected images.** Fix the code that produced them. Never change the baselines and never
      change what the visual check captures.
    - **Anything else.** Call `githerd_escalate` (`kind: "blocked"`) with what you found.
4. Finish with `outcome` `done`, `escalated` or `failed`, and `mechanism` when you named one.

Never loosen a threshold, a timeout or a check to make it pass.

Terminal states: a fix branch finished; a rerun requested with a mechanism; or an escalation.
