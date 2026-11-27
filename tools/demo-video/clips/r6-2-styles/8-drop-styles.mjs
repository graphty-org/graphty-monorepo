// Chapter 3, Create and load styles, beat 5: drop the style file on another graph. A placeholder: the
// drop itself works (Florentine families takes the file through Add style), but nothing restyles.
// The file Save as > Style only writes from this chapter's styles has no node styles (Everything's
// node half is left out as "Picks nodes by id" because its color follows a Louvain result), and the
// edge layer it does hold (zigzag, arrowheads, labels) is added beside the graph's own Everything and
// painted over by it, so the drawing does not change. The file is made by
// data/r6-styles/make-style-file.mjs; the clip that drops it is kept below for when the app is fixed.
//
// To film it again: delete `placeholder` and `seconds`, add `dataset: "Florentine families"`, and
// write setup and run from the sketch below.
//
// async setup(h) { await h.app.ready2D(); await h.park({ x: 1600, y: 760 }); },
// async run(h) {
//     const canvas = await h.page.getByRole("region", { name: "Graph drawing" }).boundingBox();
//     await h.dropFile(h.file("r6-styles/les-miserables.graphty-style.json"),
//         { x: canvas.x + canvas.width * 0.55, y: canvas.y + canvas.height * 0.45, width: 200, height: 160 },
//         { folder: "Styles", files: ["les-miserables.graphty-style.json", "dark-theme.graphty-style.json"] });
//     then tap Add style in the "Add ..." dialog, Done in the "Added ..." report, and rest the hand.
// },
export default {
    id: "styles-drop",
    chapter: 3,
    caption: "Drop the style file on another graph",
    placeholder:
        "Drop the saved style file on Florentine families and it restyles at once (placeholder: the dropped styles do not show)",
    seconds: 4,
};
