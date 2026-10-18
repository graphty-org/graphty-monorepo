/**
 * @file The first example of the styles-from-files guide (docs/guide/file-styles.md): load a file
 * with its own styles, read what could not be drawn, and save the graph with its styles. The guide
 * shows the "example" region verbatim; test/simple/file-styles-guide.test.ts holds the guide to it
 * and test/browser/simple/file-styles-guide.test.ts runs it. It imports only the published
 * package, and tsconfig.strict-consumer.json compiles it against the published declarations.
 */

// #region example
import type { Graphty } from "@graphty/graphty-element";

export async function openAndSave(el: Graphty, url: string): Promise<string> {
    // Draw the file's own colors, sizes, shapes and labels as style layers.
    await el.loadFromUrl(url, { styles: "file" });

    // The layers the file made, and what could not be drawn as the file draws it.
    const styles = el.session.data.lastImport()?.styles;
    console.log(styles?.layers.length, "layers");
    for (const note of styles?.notes ?? []) console.warn(note.code, note.params);

    // Save the graph with its styles; loading the file back with styles: "file" rebuilds the layers.
    const out = await el.exportGraph("graphml", { styles: true });
    for (const loss of out.losses) console.warn(loss.code, loss.params); // your app words each code
    return out.text();
}
// #endregion example
