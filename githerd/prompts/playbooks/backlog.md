# Playbook: backlog

Implement one ready issue on the branch you were given.

1. Call `githerd_run_context`: the issue, its trusted comments, the green SHA and the branch.
2. Read the code the issue concerns. If the issue is unclear, larger than its effort label, or
   needs a decision that cannot be undone cheaply, call `githerd_escalate` (`kind: "decision"`)
   and finish with `outcome: "escalated"` without changing code.
3. Implement the smallest change that resolves the issue, with a test that fails without it.
4. Run lint, the build and the affected tests until they pass.
5. Commit with a conventional commit message (`timeout 30 git commit -S -m "<type>(<scope>): ..."`)
   and call `githerd_finish_branch` with a title and a body that say what changed and why.

Terminal states: a branch finished; or an escalation.
