/**
 * The example datasets and images the stories load, served by Storybook itself so no story
 * reaches the network. Vite's `?url` import turns each file into a URL that resolves in the dev
 * server, the static build and the `storybook` test project alike.
 */
import catSocialNetwork2Url from "../test/helpers/cat-social-network-2.json?url";
import catSocialNetwork2FixedUrl from "../test/helpers/cat-social-network-2-fixed-positions-actual-engine.json?url";
import data2Url from "../test/helpers/data2.json?url";
import data3Url from "../test/helpers/data3.json?url";
import data3FixedUrl from "../test/helpers/data3-fixed-positions.json?url";
import data5Url from "../test/helpers/data5.json?url";
import karateGraphmlUrl from "../test/helpers/karate.graphml?url";
import skyboxUrl from "../test/helpers/rolling_hills_equirectangular_skybox.png?url";

export {
    catSocialNetwork2FixedUrl,
    catSocialNetwork2Url,
    data2Url,
    data3FixedUrl,
    data3Url,
    data5Url,
    karateGraphmlUrl,
    skyboxUrl,
};
