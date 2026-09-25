#!/bin/bash
# Assembles the graphty.app GitHub Pages site from the build outputs into one directory.
#
# Used by .github/workflows/deploy-pages.yml to build what it publishes, and by the link check in
# .github/workflows/ci.yml (tools/check-links.sh --site) to check links to graphty.app against
# exactly what the next deploy would publish -- so a pull request that adds a page and links to it
# passes, and one that links to a page the deploy never publishes fails.
#
# Usage: tools/assemble-pages-site.sh <out-dir>
#
# Reads, relative to the repository root (each is a CI artifact the workflows download):
#   graphty/dist                        -> /                     the graphty app
#   docs/.vitepress/dist                -> /docs/                unified VitePress docs
#   graphty-element/storybook-static    -> /storybook/graphty-element/  (and /storybook/element/ redirects)
#   graphty/storybook-static            -> /storybook/app/
#   compact-mantine/storybook-static    -> /storybook/compact-mantine/
#   algorithms/storybook-static         -> /storybook/algorithms/
#   layout/storybook-static             -> /storybook/layout/
#   algorithms/gh-pages                 -> /algorithms/          examples + benchmarks
#   layout/gh-pages                     -> /layout/              examples
#   graph-samples/public-data/v1        -> /data/graph-samples/v1/  (only if built)
#
# A missing input is reported and skipped, as the deploy always did; the link check then fails on
# every link into it.
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:?usage: tools/assemble-pages-site.sh <out-dir>}"
mkdir -p "$OUT"
OUT="$(cd "$OUT" && pwd)"
cd "$ROOT_DIR"

copy() {
    local src="$1" dest="$OUT/$2"
    if [ -d "$src" ]; then
        mkdir -p "$dest"
        cp -r "$src"/. "$dest"/
        echo "Copied $src -> /$2"
    else
        echo "WARNING: $src not found, /$2 will be missing"
    fi
}

copy graphty/dist ""
copy docs/.vitepress/dist docs
copy graphty-element/storybook-static storybook/graphty-element
copy graphty/storybook-static storybook/app
copy compact-mantine/storybook-static storybook/compact-mantine
copy algorithms/storybook-static storybook/algorithms
copy layout/storybook-static storybook/layout
copy algorithms/gh-pages algorithms
copy layout/gh-pages layout
if [ -d graph-samples/public-data/v1 ]; then
    copy graph-samples/public-data/v1 data/graph-samples/v1
fi

# graphty-element's Storybook was published at /storybook/element/ before /storybook/graphty-element/
# became its canonical path. Those links are out in the world, so both entry points (the manager
# and the iframe a story embed loads) forward to the same file, query and hash under the new path.
mkdir -p "$OUT/storybook/element"
for page in index.html iframe.html; do
    cat > "$OUT/storybook/element/$page" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>graphty-element Storybook has moved</title>
<link rel="canonical" href="/storybook/graphty-element/">
<script>
location.replace(location.pathname.replace("/storybook/element/", "/storybook/graphty-element/") + location.search + location.hash);
</script>
<meta http-equiv="refresh" content="0; url=/storybook/graphty-element/">
</head>
<body>
<p>The graphty-element Storybook is now at <a href="/storybook/graphty-element/">/storybook/graphty-element/</a>.</p>
</body>
</html>
EOF
done
echo "Wrote /storybook/element/ redirects"

cat > "$OUT/storybook/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Graphty Storybooks</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 1rem; }
    h1 { color: #333; }
    ul { list-style: none; padding: 0; }
    li { margin: 1rem 0; }
    a { color: #0066cc; text-decoration: none; font-size: 1.2rem; }
    a:hover { text-decoration: underline; }
    .desc { color: #666; font-size: 0.9rem; margin-top: 0.25rem; }
  </style>
</head>
<body>
  <h1>Graphty Storybooks</h1>
  <ul>
    <li>
      <a href="/storybook/graphty-element/">graphty-element</a>
      <div class="desc">Web Component library for graph visualization</div>
    </li>
    <li>
      <a href="/storybook/app/">graphty app</a>
      <div class="desc">React application components</div>
    </li>
    <li>
      <a href="/storybook/compact-mantine/">compact-mantine</a>
      <div class="desc">Mantine theme and components for dense, compact UIs</div>
    </li>
    <li>
      <a href="/storybook/algorithms/">algorithms</a>
      <div class="desc">Interactive graph algorithm visualizations</div>
    </li>
    <li>
      <a href="/storybook/layout/">layout</a>
      <div class="desc">Graph layout algorithm demonstrations</div>
    </li>
  </ul>
  <p><a href="/">&larr; Back to graphty.app</a></p>
</body>
</html>
EOF
echo "Wrote /storybook/ index"
