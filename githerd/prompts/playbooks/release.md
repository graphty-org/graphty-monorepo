# Playbook: release

The release workflow failed, a release has stalled, or a lane run is stuck. You can read but not
change anything.

1. Call `githerd_run_context`, then read the failed job with `githerd_ci_log`.
2. Match it against the known causes:
    - **"previously staged version" (npm 409).** The publish succeeded and the registry has not
      shown it yet; this clears within minutes. Check the package version with `githerd_gh_get`
      and the run context. Nothing for the owner to do: `outcome: "nothing-to-do"`.
    - **First publish of a new package.** The owner must publish it once by hand. Escalate
      `credential` with the exact package, the `npm login` step and the one-time-password step.
    - **A red GPU or host lane.** Treat it as the default branch being red: say so in the summary
      and escalate `blocked` with the failing job.
3. Anything else: escalate only when the owner must act, as `decision` or `credential`, with the
   failing step and the evidence. Otherwise describe it in the summary.

Terminal states: a known cause named; or an escalation the owner can act on.
