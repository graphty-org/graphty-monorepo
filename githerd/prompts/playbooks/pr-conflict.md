# Playbook: pr-conflict

The target pull request conflicts with the default branch.

1. Call `githerd_run_context`: the PR, its branch (checked out here) and the green SHA.
2. Merge the green SHA you were given: `git merge <green SHA>`. Never merge the default branch by
   name and never rebase.
3. Resolve each conflict:
    - Under a protected path (visual baselines, CI workflows, githerd, `.claude/`), take the green
      SHA's side: `git checkout MERGE_HEAD -- <paths>`. This is the only form of `git checkout`
      you may run.
    - Elsewhere, keep both sides' intent. If you cannot tell what one side meant, escalate rather
      than guess.
4. Run the tests affected by the conflicted files, and lint them.
5. Commit the merge with `timeout 30 git commit -S --no-edit` and call `githerd_finish_branch`.
6. If a conflict cannot be resolved without a decision, call `githerd_escalate`
   (`kind: "blocked"`) naming the files and the two intents, and finish with
   `outcome: "escalated"`.

Terminal states: a merge branch finished; or an escalation.
