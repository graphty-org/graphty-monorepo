# shellcheck shell=bash
# Sourced by tools/prepush.sh and tools/check-quick.sh: whether a change reaches the documentation site.
# The caller defines `affected <project>` (exit 0 when nx calls it affected) and sets BASE.
#
# DOCS_API_PACKAGES: the packages with an API reference in the site (a root `docs:api:<package>` script).
# docs_site_affected: an affected package has an API reference, or the change since BASE touches docs/, a
# package's docs/ that tools/copy-docs-content.js copies in, or the scripts that assemble the site.
DOCS_API_PACKAGES=$(node -p 'Object.keys(require("./package.json").scripts).filter((k) => k.startsWith("docs:api:")).map((k) => k.slice(9)).join(" ")')
docs_site_affected() {
    local p
    for p in $DOCS_API_PACKAGES; do affected "$p" && return 0; done
    [ -z "${BASE:-}" ] && return 0
    ! git diff --quiet "$BASE" HEAD -- docs/ $(sed -nE 's#^ *src: "([^"]+)".*#\1/#p' tools/copy-docs-content.js) \
        tools/copy-docs-content.js tools/sanitize-api-docs.js
}
