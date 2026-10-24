import { beforeAll } from "vitest";

import { loadFrame } from "../workspace/frameLoader";

// The project frame loads on demand in the app (workspace/frameLoader.ts). A test file that opens a
// project imports this module, so the project it opens shows at once instead of after the frame's
// code arrives. Only those files: the frame is most of the app's code, and loading it in every
// browser test file put a dynamic import of all of it in front of each file's first test, which on a
// busy machine with a freshly rebundled dependency cache ran past the 30 second hook limit in files
// that never open a project (issue #3343). The real-element project loads it for every file (its
// setupFiles in vitest.config.ts), since every one of those mounts the workspace.
beforeAll(async () => {
    await loadFrame();
});
