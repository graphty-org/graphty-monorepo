// The file guard of every run, with a limit a test can wait out.
import { attach } from "../../../tools/vitest-file-guard.mjs";

/**
 * The globalSetup.
 * @param project - the vitest TestProject
 */
export default function setup(project) {
    attach(project.vitest, { limit: 15_000 }, 200);
}
