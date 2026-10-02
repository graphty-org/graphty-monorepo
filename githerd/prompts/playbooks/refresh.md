# Playbook: refresh

Recently merged pull requests changed files that these open issues mention. Check whether each
issue is still true.

For each issue in the batch:

1. Read the issue (`githerd_gh_get`, `query: "issue"`) and the merged changes the run context
   lists for it (`query: "prFiles"`, or the files themselves).
2. Decide:
    - **Unaffected.** Do nothing.
    - **Changed but still open.** Comment once with what changed and what remains, citing the
      pull request.
    - **Fixed or obsolete.** Propose closing with `githerd_propose` (`kind: "close-issue"`,
      `closeAs: "completed"` or `"not_planned"`), with the merged pull request or the commit as
      evidence and a one-paragraph reason. The owner can veto it during the grace period.
3. When you cannot tell, do nothing and say so in the summary.

Terminal state: every issue in the batch decided, in the summary.
