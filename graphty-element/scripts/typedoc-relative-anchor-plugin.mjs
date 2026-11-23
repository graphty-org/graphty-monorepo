/**
 * A TypeDoc plugin that spells the anchor of a relative link the way VitePress spells headings.
 *
 * VitePress turns a heading such as `DEFAULT_CHUNK_SIZE` into the anchor `default-chunk-size`.
 * typedoc-vitepress-theme rewrites link anchors to match, but it skips every link whose path starts
 * with `.` (`../classes/DataSource.md#default_chunk_size`), so a link to a member whose name holds an
 * underscore or another special character pointed at an anchor no page has (issue #9720). This
 * plugin applies the same rewrite to those relative links. Fenced code blocks are left alone.
 */

import { MarkdownPageEvent } from "typedoc-plugin-markdown";

/** The characters VitePress replaces with a dash in a heading's anchor (its own `slugify`). */
const SPECIAL = /[\s~`!@#$%^&*()\-_+=[\]{}|\\;:"'<>,.?/]+/g;

/**
 * An anchor spelled the way VitePress spells the heading it names.
 * @param {string} anchor The anchor as TypeDoc wrote it.
 * @returns {string} The VitePress anchor.
 */
export function slugifyAnchor(anchor) {
    return anchor
        .normalize("NFKD")
        .replaceAll(/[\u0300-\u036F]/g, "")
        .replaceAll(SPECIAL, "-")
        .replaceAll(/-{2,}/g, "-")
        .replaceAll(/^-+|-+$/g, "")
        .replace(/^(\d)/, "_$1")
        .toLowerCase();
}

/**
 * Rewrites the anchor of every relative markdown link outside fenced code blocks.
 * @param {string} contents A page's markdown.
 * @returns {string} The page with its relative link anchors respelled.
 */
export function fixRelativeAnchors(contents) {
    return contents
        .split(/(```[\s\S]*?```)/)
        .map((part, index) =>
            index % 2 === 1
                ? part
                : part.replaceAll(/\]\((\.[^)#\s]*)#([^)\s]+)\)/g, (_match, path, anchor) => {
                      return `](${path}#${slugifyAnchor(decodeURI(anchor))})`;
                  }),
        )
        .join("");
}

/**
 * Registers the rewrite on every rendered page.
 * @param {import("typedoc").Application} app The TypeDoc application.
 */
export function load(app) {
    app.renderer.on(MarkdownPageEvent.END, (page) => {
        if (page.contents) {
            page.contents = fixRelativeAnchors(page.contents);
        }
    });
}
