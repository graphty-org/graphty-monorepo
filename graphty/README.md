# graphty

graphty is a graph visualization app that runs in the browser: open a graph file, lay it out in 2D
or 3D, run graph algorithms over it and style the result. It is the app at
[graphty.app](https://graphty.app/), built on the
[graphty-element](https://www.npmjs.com/package/@graphty/graphty-element) web component.

To use it, open [graphty.app](https://graphty.app/). This package is for hosting your own copy.

## Features

- Open graph files in every format graphty-element reads, from a file, a URL or pasted text
- Layouts, and about thirty graph algorithms whose results can drive the styling
- Style layers: color, size, shape, labels and more, set by hand or from the data
- Node and edge tables, 2D and 3D views, image and data export
- Projects saved to and reopened from this computer

## What the package holds

The built app, as static files under `dist/`: `index.html`, its scripts and styles under
`dist/assets/`, and the start screen's sample graphs under `dist/samples/`. It has no runtime
dependencies and no JavaScript API to import; everything it needs is in those files.

## Hosting your own copy

```bash
npm install @graphty/graphty
npx serve node_modules/@graphty/graphty/dist
```

Any static web server works. Serve the contents of `dist/` at the root of a site (`/`), since the
app loads its files from there, over HTTPS or from `localhost` (browsers allow WebGPU and some
storage features only in a secure context).

The sample datasets the app offers beyond the start screen's own are downloaded from graphty.app
when a reader opens one.

Usage data: every visitor who has not turned on Share usage data sends a few anonymous counts to
PostHog (EU region) in its cookieless mode, with no cookies and no stored id: visits, the site that
sent them, and which sample, file format, layout, measure and export they use (ids only, never file
names or contents). A reader who shares sends the same counts through PostHog's shared mode instead,
with its stored id. Masked session replays,
click, control-change and command events, page speed and survey answers (the same PostHog project) and
error reports with a masked replay of the moments before an error (Sentry) are sent only after a reader
turns on Share usage data in the app. The app's
`/privacy.html` lists every event and property, and how to turn it off.

## License

MIT
