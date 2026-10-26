# Pipeline health

The live health dashboard of the graphty build and release pipeline:
**https://health.graphty.app**

It shows, for the [graphty-monorepo](https://github.com/graphty-org/graphty-monorepo) project:

- whether master builds, and how long a pull request takes from opening to merge;
- the CI runs: queue times, shard times, the runners and who holds them;
- flaky tests and where they cluster;
- the release lanes and npm publishing;
- what the pipeline costs;
- the runs on the maintainers' own machine;
- which data sources are reporting, and when they last did.

Every color is judged on the last hour; the 6-hour and 24-hour views give the context. A gray
"no data", "not set up" or "too few samples" means the dashboard does not know, not that all is
well.

## This repository holds only the built page

The site is served by GitHub Pages from the `gh-pages` branch, which a workflow in graphty-monorepo
overwrites on every change. **Do not edit anything here**: a change would be lost on the next
deploy.

- The page's source is in graphty-monorepo under
  [`tools/pipeline-health/web/`](https://github.com/graphty-org/graphty-monorepo/tree/master/tools/pipeline-health/web),
  and how to run it is in
  [`tools/pipeline-health/README.md`](https://github.com/graphty-org/graphty-monorepo/blob/master/tools/pipeline-health/README.md).
- It is published by
  [`.github/workflows/pipeline-health-pages.yml`](https://github.com/graphty-org/graphty-monorepo/blob/master/.github/workflows/pipeline-health-pages.yml).
- Report a problem or ask a question in
  [graphty-monorepo's issues](https://github.com/graphty-org/graphty-monorepo/issues).

The page holds no data of its own: it reads the public pipeline health API when it loads and every
60 seconds after.

## License

MIT, see [LICENSE](LICENSE).
