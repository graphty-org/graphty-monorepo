/** Which build this page is: the commit and the latest graphty release tag at build time. */
interface BuildStamp {
    readonly commit: string;
    readonly release: string;
}

/**
 * Reads the build stamp the build writes into the page as
 * `<meta name="graphty-build" content="<commit> <release tag>">` (vite.build-stamp.ts). A study
 * transcript and a bug report both record it.
 * @param doc - the document to read; the page's own by default.
 * @returns the stamp, or null when the page has none (a test page, Storybook).
 */
export function readBuildStamp(doc: Document = document): BuildStamp | null {
    const content = doc.querySelector<HTMLMetaElement>('meta[name="graphty-build"]')?.content.trim();
    if (content === undefined || content === "") {
        return null;
    }
    const parts = content.split(/\s+/);
    return { commit: parts[0], release: parts.length > 1 ? parts[1] : "unreleased" };
}
