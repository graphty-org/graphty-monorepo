// The layout build to compare against: layout/dist/layout.js built at commit 77c84820 (the end of
// phase 5), named by the LAYOUT_BEFORE environment variable. See the README one level up.
import { pathToFileURL } from "node:url";

export function beforeLayout(): string {
    const file = process.env.LAYOUT_BEFORE;
    if (!file) {
        throw new Error("set LAYOUT_BEFORE to layout/dist/layout.js built at 77c84820");
    }
    return pathToFileURL(file).href;
}
