/**
 * The example datasets and images the stories load, served by Storybook itself so no story
 * reaches the network. Vite's `?url` import turns each file into a path that resolves in the dev
 * server, the static build and the `storybook` test project alike.
 *
 * The graph-samples datasets come from graph-samples' own build (`graph-samples/dist/data/v1/`, the
 * files graphty.app publishes), so a story that downloads one reads the same bytes with no network.
 * They are inlined as data URLs (`?url&inline`): imported as served files (`?url`), their download
 * failed under the `storybook` test project with "Failed to fetch".
 *
 * Each path is made absolute against the page, because the element accepts only absolute URLs for
 * a JSON data source's `data` string and for a skybox image.
 */
import dolphinsPath from "../../graph-samples/dist/data/v1/dolphins.gsnp.gz?url&inline";
import florentineFamiliesPath from "../../graph-samples/dist/data/v1/florentine-families.gsnp.gz?url&inline";
import footballPath from "../../graph-samples/dist/data/v1/football.gsnp.gz?url&inline";
import karatePath from "../../graph-samples/dist/data/v1/karate.gsnp.gz?url&inline";
import lesMiserablesPath from "../../graph-samples/dist/data/v1/les-miserables.gsnp.gz?url&inline";
import catSocialNetwork2Path from "../test/helpers/cat-social-network-2.json?url";
import catSocialNetwork2FixedPath from "../test/helpers/cat-social-network-2-fixed-positions-actual-engine.json?url";
import data2Path from "../test/helpers/data2.json?url";
import data3Path from "../test/helpers/data3.json?url";
import data3FixedPath from "../test/helpers/data3-fixed-positions.json?url";
import data5Path from "../test/helpers/data5.json?url";
import karateGraphmlPath from "../test/helpers/karate.graphml?url";
import skyboxPath from "../test/helpers/rolling_hills_equirectangular_skybox.png?url";

/** Resolves a served path against the page, so the element receives an absolute URL. */
const absolute = (path: string): string => new URL(path, document.baseURI).href;

export const catSocialNetwork2Url = absolute(catSocialNetwork2Path);
export const catSocialNetwork2FixedUrl = absolute(catSocialNetwork2FixedPath);
export const data2Url = absolute(data2Path);
export const data3Url = absolute(data3Path);
export const data3FixedUrl = absolute(data3FixedPath);
export const data5Url = absolute(data5Path);
export const karateGraphmlUrl = absolute(karateGraphmlPath);
export const skyboxUrl = absolute(skyboxPath);

/** The graph-samples datasets the Sample graphs stories offer, by dataset name. */
export const sampleDatasetUrls: Readonly<Record<string, string>> = {
    karate: absolute(karatePath),
    "florentine-families": absolute(florentineFamiliesPath),
    "les-miserables": absolute(lesMiserablesPath),
    dolphins: absolute(dolphinsPath),
    football: absolute(footballPath),
};
