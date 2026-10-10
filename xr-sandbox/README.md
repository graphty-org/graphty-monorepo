# XR technique sandbox

A private playground for trying VR control techniques on a graph and forming opinions about them,
on Meta Quest 3 (Quest Browser) and Samsung Galaxy XR (Chrome on Android XR), with hands and with
controllers. Every technique is a module that can be switched on and off, in a preset or in the
headset. The design is in `design/xr/sandbox/design.md`; the build order in `plan.md` beside it.

## Opening it

The headsets open the production build served over HTTPS by servherd (`npm run serve` is
`vite build && vite preview`); a new build reaches the headset only after that server is restarted
and the page reloaded. The landing page lists the presets, one link per technique alone, the step
lists, the session id, VR or passthrough AR, and the microphone arming box. Press Enter VR.

In the headset, the gear panel (the Gear button low on the left, the off-hand stick click, or both
palms up for 1 s) switches techniques and settings, and shows the input map. Flag (gear panel,
Framework tab, or both stick clicks) logs the last 10 s of input with a short id such as "F3".

URL parameters: `preset=<id>`, `on=a,b`, `off=c`, `s.<technique>.<key>=<value>`,
`graph=florentine|dense&n=480&seed=7`, `steps=journey|q2|q3|q4|q6`, `mode=ar`,
`emulate=quest3-controllers|quest3-hands|galaxyxr-hands|galaxyxr-controllers|galaxyxr-no-hands`
(installs the IWER emulator), `still=1` (no time-driven redraws).

## Logs

Every entry carries the session id shown on the landing page and in the gear panel's title bar.
The page posts to `/remote-log` on its own origin; the server forwards it to the log server
(`REMOTE_LOG_TARGET`). Read them with `curl -s http://127.0.0.1:<log port>/logs/recent?n=200`, or
the JSONL file under `/tmp/remote-logger/<worktree>/`.

## Adding a technique

1. Make `src/techniques/<id>/index.ts` exporting `technique: Technique` (`src/framework/technique.ts`).
   `src/techniques/example/index.ts` is the smallest working one: copy it.
2. `prepare(ctx)` builds everything hidden (panels and chips from `ctx.ui`, parented to
   `ctx.anchor(...)`), `activate()` shows it, `deactivate()` hides it. Build nothing at activate.
3. Input arrives only through the arbiter: declare `claims` (channel, contexts, priority, optional
   `decide`) and implement `onPress(press, hand)`, returning `{ move, end, cancel }` to follow the
   press. Read hover with `ctx.hover(hand)` and hand poses with `ctx.poses(hand)`; never subscribe to
   Babylon input yourself.
4. Change the graph only with `ctx.commands.run(code, params, hand)` (or `ctx.commands.preview`),
   so undo names the step and the log records it.
5. Declare `settings`; the gear panel draws them. Read them with `ctx.settings.bool/num/str`.
6. Add it to `src/techniques/index.ts` in its input-map priority order and to presets in
   `src/presets.ts`. `npm test` fails if a claim shadows another (`test/arbiter.test.ts`).

## Dry run

Before the owner tries a build, run it in a browser slot against the preview server:

```
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tool/with-browser.sh \
  node xr-sandbox/dryrun/run.mjs --url https://dev.ato.ms:<port>/ --logs http://127.0.0.1:<log port> \
  --out /home/apowers/Projects/graphty-monorepo/tmp/xr-sandbox/dryrun
```

It opens every preset on an emulated Quest 3 with controllers and with hands (`--profiles`,
`--presets` to narrow), enters VR, and checks console errors and off-origin requests, frame time,
still-head jitter, idle GUI textures, selecting a node by trigger or pinch, the gear panel by ray and
stick click, the example module, and the log reaching the log server. It writes `report.json` and a
screenshot per run, and exits non-zero on any failure. Headless pacing is not headset pacing: it
catches runaway work, not the device's frame rate.
