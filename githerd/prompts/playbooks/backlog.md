# Playbook: backlog

Implement one ready issue on the branch you were given.

1. Call `githerd_run_context`: the issue, the owner's comments on it, the green SHA and the branch.
2. Read the code the issue concerns. Size alone never goes to the owner: a large issue is yours to
   do. If it is really several separate pieces of work, call `githerd_split_issue` with the pieces
   (each a title and a body that stands on its own) and finish with `outcome: "done"` without
   changing code. If the issue is unclear, or needs a decision that cannot be undone cheaply (a
   public API, a package name, a data format), call `githerd_escalate` (`kind: "decision"`) and
   finish with `outcome: "escalated"` without changing code.
3. Implement the smallest change that resolves the issue, with a test that fails without it.
4. Run lint, the build and the affected tests until they pass.
5. Commit with a conventional commit message (`timeout 30 git commit -S -m "<type>(<scope>): ..."`)
   and call `githerd_finish_branch` with a title and a body that say what changed and why.

Terminal states: a branch finished; the issue split; or an escalation.
