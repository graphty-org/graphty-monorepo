# compare-stories

Renders the same Storybook stories at two git references and says what changed, without asking
the visual-regression service anything.

```bash
tools/compare-stories.mjs                                  # HEAD against its baseline
tools/compare-stories.mjs master                           # HEAD against master
tools/compare-stories.mjs master my-branch                 # any two references
tools/compare-stories.mjs baseline my-branch               # a branch against ITS baseline
tools/compare-stories.mjs master my-branch --stories layout-2d--spring
```

It builds a Storybook for each reference in a throwaway git worktree, serves both, renders each
story twice -- once at each reference -- and produces, per story: the two pictures and an image
marking every pixel where they disagree; a reading of the Babylon scene that owes nothing to
where the camera ended up; and one verdict in ordinary words.

Everything lands in `tmp/compare-stories/<before>..<after>/`, with `report.json` holding the full
reading story by story.

## The two traps this exists to avoid

**Pixels lie about movement.** The camera auto-frames whatever it is handed. A graph whose nodes
really moved gets reframed, and the picture can come back differing by the same handful of
anti-aliased pixels as a graph that did not move at all. Twice in one day a pixel count sent an
investigation in the wrong direction. So the verdict here is decided by node positions read off
the scene, in world units, and the pixel count only describes what the verdict already settled.

**A change is reported once and then goes quiet.** The visual-regression service compares each
build against the previous build on the same branch, not against the base. Push twice and the
second build says "no changes" because it matches the first -- including the regression nobody
reviewed. The service's own answer shows it: graphty-element build 712 reported four changes, and
`tools/chromatic-api.sh baseline 712` says it was compared against build 709, which is three
commits earlier on the same branch, not against master. This tool compares two references you
name, so nothing goes quiet.

## What it prints

One story, from the comparison between the commit that fixed the simulation reheat and the branch
tip:

```
layout-2d--spring   Layout/2D Spring
  verdict       genuinely different
  arrangement   1.387 -> 2.897   (spread per unit of edge; the camera cannot change it)
  node shape    1.0263 apart   (0 = arranged the same, once position and scale are removed)
  camera        moved 9.280 units, looking 9.280 units away
  pixels        47117 of 1080000 differ (4.36%)
  did it run    before: every node sat on one point until a frame ran, then spread to a radius of 41.0
                after:  every node sat on one point until a frame ran, then spread to a radius of 50.8
  images        layout-2d--spring-before.png  layout-2d--spring-after.png  layout-2d--spring-diff.png
```

**arrangement** is the graph's rms radius about its own centroid, divided by its mean edge
length. Both halves scale together, so the figure says nothing about how large the drawing is or
where the camera put it, and everything about how the graph is arranged. A layout that converged
and one that stopped halfway give different figures even when they photograph the same.

**node shape** is how far apart the two arrangements are: each cloud is centred on its own
centroid and divided by its own rms radius, then compared node by node, matched by node ID. A
graph that was moved, or drawn twice the size, measures zero. Only the shape is left.

**camera** is how far the active camera moved, and how far its target moved with it. A story
whose nodes did not move and whose camera did is the reframing trap, caught.

**pixels** is an exact count -- any channel differing by one counts. It is deliberately not the
verdict. A few dozen pixels is anti-aliasing; tens of thousands with an unmoved arrangement is
the camera.

**did it run** compares the story against itself with no frame ever drawn, which leaves the
layout engine holding exactly what it had before anything was stepped. A one-shot layout has
finished placing its nodes by then and says so. A simulation has every node on a single point
until the first frame, and says that instead. Either way the line answers "did the layout run",
which no picture can.

**still moving** appears when the element never called the picture final. Anything measured on
such a story is a snapshot of something in flight.

## The verdicts

| verdict | what it means |
|---|---|
| `identical` | the nodes are arranged the same and the pictures agree to within a noise floor of a thousandth of the frame |
| `moved but equivalently arranged` | the nodes are in the same arrangement and the picture still changed, which is the camera reframing the same graph |
| `genuinely different` | the arrangement itself changed: either the node shape moved more than 0.01, or the arrangement figure moved by more than 2 percent |
| `did not run` | the story threw, never rendered, or drew no nodes at one of the two references |

The thresholds live at the top of `tools/compare-stories.mjs` under "What counts as a
difference". Two builds that ran the same layout over the same seed agree to floating-point
noise, far inside them.

Stories that exist at only one reference are listed at the end rather than compared.

## Three readings from one real comparison

Between `master` and the element's WebGPU branch, on the layout stories:

| story | verdict | arrangement | node shape | camera | pixels |
|---|---|---|---|---|---|
| Layout/2D Spring | genuinely different | 2.896 -> 2.897 | 0.0995 | 2.460 | 31054 |
| Layout/3D Force Atlas 2 | moved but equivalently arranged | 2.728 -> 2.726 | 0.0033 | 0.125 | 14998 |
| Layout/3D Circular, and 18 others | identical | unchanged | 0.0000 | unchanged | 0 |

The middle row is the trap, in numbers. Fifteen thousand pixels changed -- more than one in a
hundred -- and the nodes are where they were. A camera that moved an eighth of a world unit
shifted the whole drawing by a pixel or so, and every anti-aliased edge in a 254-edge graph
changed colour. The difference image for that row is the entire graph, in red. Judged on pixels
it is the second largest change in the suite; judged on the scene it is nothing at all.

Between the commit that fixed the simulation reheat and the branch tip, the same 24 stories give
two `genuinely different` and 22 `identical`: 2D Spring's arrangement goes 1.387 -> 2.897 and 3D
Spring's 0.750 -> 1.411, and nothing else in any layout moved.

## Options

| option | what it does |
|---|---|
| `--stories <text,text>` | only stories whose id contains one of these pieces of text |
| `--out <dir>` | where the images and the report go. Default `tmp/compare-stories`. The built Storybooks stay in `tmp/compare-stories/built/` whatever this says, so a second question does not rebuild them |
| `--storybook <ref>=<dir>` | use a Storybook that is already built instead of building one |
| `--no-seed` | skip the second pass, and with it the "did it run" line |
| `--keep` | leave the temporary worktrees in place |
| `--self-check` | check the arithmetic against hand-worked cases and stop. Nothing is rendered and nothing is built |

With no reference at all it compares `HEAD` against the commit the visual-regression service used
as its baseline, and falls back to `master` -- saying so in one line -- when that lookup does not
work. Writing `baseline` where the before reference goes asks for the same lookup against a
branch you name, which is how "explain this failing build" becomes one command from anywhere.

That lookup is the only thing the tool ever asks that service. It needs no credentials to run,
and every other answer it gives comes from rendering the stories itself.

## What it costs

The first run at a reference builds its Storybook: a git worktree, `pnpm install`, `nx build
graphty-element`, `build-storybook`. Roughly three minutes. The result is cached by commit under
`tmp/compare-stories/built/`, so the second question about the same pair is free, and the
worktree is deleted as soon as the build is out of it.

Rendering costs a few seconds per story per reference, and the whole suite of 165 is well over an
hour. Name the stories you care about with `--stories`.

## Servers

The two Storybooks are served by an http listener inside the tool's own process, on a port the
operating system picks. It has no life of its own and stops when the tool stops, so nothing can
be left behind. Long-lived servers -- the real Storybook, a dev server -- still go through
servherd, for the reason the root CLAUDE.md gives.

## What the visual-regression service will and will not tell you

Checked against the API rather than the documentation, with the project token this repository
holds in `.env`:

- The command line never names the baseline. It prints `found 1 parent build` and stops there.
- A project token, exchanged for an app token the way the command line itself does it, CAN read a
  build's own `commit`, its `changeCount`, its `committedAt`, its `webUrl`, and `ancestorBuilds`,
  whose first entry is the build this one was compared against. That is where the baseline commit
  comes from, and it is why `tools/compare-stories.mjs` can default to it.
- The same token CANNOT read `branch`, `baselineBuilds` or `tests`. All three answer `Cannot
  access those build fields when authenticating with app code`. So the count of changed stories
  is obtainable and the list of them is not, which is the whole reason this tool renders them
  itself.

`tools/chromatic-api.sh baseline <build number>` is the read-only way to ask by hand, and
`tools/chromatic-api.sh build <build number>` gives the totals.
