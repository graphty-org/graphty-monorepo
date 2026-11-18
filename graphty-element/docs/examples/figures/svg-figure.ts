/**
 * @file The vector figure example of the screenshots guide (docs/guide/screenshots.md): export the
 * graph, its labels and its legend as an SVG file. The guide shows the "example" region verbatim;
 * test/simple/figures-guide.test.ts holds the guide to it. It imports only the published package,
 * and tsconfig.strict-consumer.json compiles it against the published declarations.
 */

// #region example
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;

// An SVG file the reader saves: nodes as shapes, labels and the key as text
await element.exportFigure({ legend: true, download: true, downloadFilename: "figure.svg" });

// Or keep the file to upload or embed
const figure = await element.exportFigure({ legend: { position: "top-left" }, transparentBackground: true });
const svg = await figure.blob.text();
console.log(svg.length, figure.width, figure.height);
// #endregion example
