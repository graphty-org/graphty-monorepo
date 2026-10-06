/**
 * The example datasets and images the stories load, served by Storybook itself so no story
 * reaches the network. Vite's `?url` import turns each file into a path that resolves in the dev
 * server, the static build and the `storybook` test project alike.
 *
 * Each path is made absolute against the page, because the element accepts only absolute URLs for
 * a JSON data source's `data` string and for a skybox image.
 */
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
