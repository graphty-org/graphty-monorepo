import { assert, describe, it } from "vitest";

import { rescaleLayout } from "../src/utils/rescale.js";

// Golden outputs of rescaleLayout over arrays and maps, 2D and 3D, scale and center variants and edge cases (one node,
// zero spread, NaN and Infinity components, rows of different lengths, centers shorter or longer than the rows).
// Non-finite numbers are written as strings so the expected values survive JSON.

type Input = number[][] | Record<string, (number | string)[]>;

interface Case {
    name: string;
    input: Input;
    scale?: number;
    center?: number[] | null;
    expected: string;
}

const CASES: Case[] = [
    {
        name: "2d square, array, scale undefined, center undefined",
        input: [
            [1, 1],
            [-1, 1],
            [-1, -1],
            [1, -1],
        ],
        expected:
            "[[0.7071067811865475,0.7071067811865475],[-0.7071067811865475,0.7071067811865475],[-0.7071067811865475,-0.7071067811865475],[0.7071067811865475,-0.7071067811865475]]",
    },
    {
        name: "2d square, map, scale undefined, center undefined",
        input: {
            n0: [1, 1],
            n1: [-1, 1],
            n2: [-1, -1],
            n3: [1, -1],
        },
        expected:
            '{"n0":[0.7071067811865475,0.7071067811865475],"n1":[-0.7071067811865475,0.7071067811865475],"n2":[-0.7071067811865475,-0.7071067811865475],"n3":[0.7071067811865475,-0.7071067811865475]}',
    },
    {
        name: "2d square, array, scale 2, center null",
        input: [
            [1, 1],
            [-1, 1],
            [-1, -1],
            [1, -1],
        ],
        scale: 2,
        center: null,
        expected:
            "[[1.414213562373095,1.414213562373095],[-1.414213562373095,1.414213562373095],[-1.414213562373095,-1.414213562373095],[1.414213562373095,-1.414213562373095]]",
    },
    {
        name: "2d square, map, scale 2, center null",
        input: {
            n0: [1, 1],
            n1: [-1, 1],
            n2: [-1, -1],
            n3: [1, -1],
        },
        scale: 2,
        center: null,
        expected:
            '{"n0":[1.414213562373095,1.414213562373095],"n1":[-1.414213562373095,1.414213562373095],"n2":[-1.414213562373095,-1.414213562373095],"n3":[1.414213562373095,-1.414213562373095]}',
    },
    {
        name: "2d square, array, scale 0.5, center [1,-1]",
        input: [
            [1, 1],
            [-1, 1],
            [-1, -1],
            [1, -1],
        ],
        scale: 0.5,
        center: [1, -1],
        expected:
            "[[1.3535533905932737,-0.6464466094067263],[0.6464466094067263,-0.6464466094067263],[0.6464466094067263,-1.3535533905932737],[1.3535533905932737,-1.3535533905932737]]",
    },
    {
        name: "2d square, map, scale 0.5, center [1,-1]",
        input: {
            n0: [1, 1],
            n1: [-1, 1],
            n2: [-1, -1],
            n3: [1, -1],
        },
        scale: 0.5,
        center: [1, -1],
        expected:
            '{"n0":[1.3535533905932737,-0.6464466094067263],"n1":[0.6464466094067263,-0.6464466094067263],"n2":[0.6464466094067263,-1.3535533905932737],"n3":[1.3535533905932737,-1.3535533905932737]}',
    },
    {
        name: "2d square, array, scale 3, center [1,2,3]",
        input: [
            [1, 1],
            [-1, 1],
            [-1, -1],
            [1, -1],
        ],
        scale: 3,
        center: [1, 2, 3],
        expected:
            "[[3.1213203435596424,4.121320343559642,3],[-1.1213203435596424,4.121320343559642,3],[-1.1213203435596424,-0.12132034355964239,3],[3.1213203435596424,-0.12132034355964239,3]]",
    },
    {
        name: "2d square, map, scale 3, center [1,2,3]",
        input: {
            n0: [1, 1],
            n1: [-1, 1],
            n2: [-1, -1],
            n3: [1, -1],
        },
        scale: 3,
        center: [1, 2, 3],
        expected:
            '{"n0":[3.1213203435596424,4.121320343559642,3],"n1":[-1.1213203435596424,4.121320343559642,3],"n2":[-1.1213203435596424,-0.12132034355964239,3],"n3":[3.1213203435596424,-0.12132034355964239,3]}',
    },
    {
        name: "2d square, array, scale 1, center [5]",
        input: [
            [1, 1],
            [-1, 1],
            [-1, -1],
            [1, -1],
        ],
        scale: 1,
        center: [5],
        expected:
            '[[5.707106781186548,"NaN"],[4.292893218813452,"NaN"],[4.292893218813452,"NaN"],[5.707106781186548,"NaN"]]',
    },
    {
        name: "2d square, map, scale 1, center [5]",
        input: {
            n0: [1, 1],
            n1: [-1, 1],
            n2: [-1, -1],
            n3: [1, -1],
        },
        scale: 1,
        center: [5],
        expected:
            '{"n0":[5.707106781186548,"NaN"],"n1":[4.292893218813452,"NaN"],"n2":[4.292893218813452,"NaN"],"n3":[5.707106781186548,"NaN"]}',
    },
    {
        name: "2d square, array, scale 0, center [0,0]",
        input: [
            [1, 1],
            [-1, 1],
            [-1, -1],
            [1, -1],
        ],
        scale: 0,
        center: [0, 0],
        expected: "[[0,0],[0,0],[0,0],[0,0]]",
    },
    {
        name: "2d square, map, scale 0, center [0,0]",
        input: {
            n0: [1, 1],
            n1: [-1, 1],
            n2: [-1, -1],
            n3: [1, -1],
        },
        scale: 0,
        center: [0, 0],
        expected: '{"n0":[0,0],"n1":[0,0],"n2":[0,0],"n3":[0,0]}',
    },
    {
        name: "2d square, array, scale -2, center [1,1,1,1]",
        input: [
            [1, 1],
            [-1, 1],
            [-1, -1],
            [1, -1],
        ],
        scale: -2,
        center: [1, 1, 1, 1],
        expected:
            "[[-0.4142135623730949,-0.4142135623730949,1,1],[2.414213562373095,-0.4142135623730949,1,1],[2.414213562373095,2.414213562373095,1,1],[-0.4142135623730949,2.414213562373095,1,1]]",
    },
    {
        name: "2d square, map, scale -2, center [1,1,1,1]",
        input: {
            n0: [1, 1],
            n1: [-1, 1],
            n2: [-1, -1],
            n3: [1, -1],
        },
        scale: -2,
        center: [1, 1, 1, 1],
        expected:
            '{"n0":[-0.4142135623730949,-0.4142135623730949,1,1],"n1":[2.414213562373095,-0.4142135623730949,1,1],"n2":[2.414213562373095,2.414213562373095,1,1],"n3":[-0.4142135623730949,2.414213562373095,1,1]}',
    },
    {
        name: "2d offset, array, scale undefined, center undefined",
        input: [
            [3, 7],
            [5, 2],
            [10, 4],
        ],
        expected:
            "[[-0.7474093186836597,0.6643638388299198],[-0.2491364395612199,-0.5813183589761797],[0.9965457582448796,-0.08304547985373989]]",
    },
    {
        name: "2d offset, map, scale undefined, center undefined",
        input: {
            n0: [3, 7],
            n1: [5, 2],
            n2: [10, 4],
        },
        expected:
            '{"n0":[-0.7474093186836597,0.6643638388299198],"n1":[-0.2491364395612199,-0.5813183589761797],"n2":[0.9965457582448796,-0.08304547985373989]}',
    },
    {
        name: "2d offset, array, scale 2, center null",
        input: [
            [3, 7],
            [5, 2],
            [10, 4],
        ],
        scale: 2,
        center: null,
        expected:
            "[[-1.4948186373673193,1.3287276776598396],[-0.4982728791224398,-1.1626367179523593],[1.9930915164897591,-0.16609095970747978]]",
    },
    {
        name: "2d offset, map, scale 2, center null",
        input: {
            n0: [3, 7],
            n1: [5, 2],
            n2: [10, 4],
        },
        scale: 2,
        center: null,
        expected:
            '{"n0":[-1.4948186373673193,1.3287276776598396],"n1":[-0.4982728791224398,-1.1626367179523593],"n2":[1.9930915164897591,-0.16609095970747978]}',
    },
    {
        name: "2d offset, array, scale 0.5, center [1,-1]",
        input: [
            [3, 7],
            [5, 2],
            [10, 4],
        ],
        scale: 0.5,
        center: [1, -1],
        expected:
            "[[0.6262953406581702,-0.6678180805850401],[0.87543178021939,-1.29065917948809],[1.4982728791224398,-1.04152273992687]]",
    },
    {
        name: "2d offset, map, scale 0.5, center [1,-1]",
        input: {
            n0: [3, 7],
            n1: [5, 2],
            n2: [10, 4],
        },
        scale: 0.5,
        center: [1, -1],
        expected:
            '{"n0":[0.6262953406581702,-0.6678180805850401],"n1":[0.87543178021939,-1.29065917948809],"n2":[1.4982728791224398,-1.04152273992687]}',
    },
    {
        name: "2d offset, array, scale 3, center [1,2,3]",
        input: [
            [3, 7],
            [5, 2],
            [10, 4],
        ],
        scale: 3,
        center: [1, 2, 3],
        expected:
            "[[-1.242227956050979,3.993091516489759,3],[0.2525906813163403,0.256044923071461,3],[3.9896372747346387,1.7508635604387803,3]]",
    },
    {
        name: "2d offset, map, scale 3, center [1,2,3]",
        input: {
            n0: [3, 7],
            n1: [5, 2],
            n2: [10, 4],
        },
        scale: 3,
        center: [1, 2, 3],
        expected:
            '{"n0":[-1.242227956050979,3.993091516489759,3],"n1":[0.2525906813163403,0.256044923071461,3],"n2":[3.9896372747346387,1.7508635604387803,3]}',
    },
    {
        name: "2d offset, array, scale 1, center [5]",
        input: [
            [3, 7],
            [5, 2],
            [10, 4],
        ],
        scale: 1,
        center: [5],
        expected: '[[4.25259068131634,"NaN"],[4.7508635604387806,"NaN"],[5.99654575824488,"NaN"]]',
    },
    {
        name: "2d offset, map, scale 1, center [5]",
        input: {
            n0: [3, 7],
            n1: [5, 2],
            n2: [10, 4],
        },
        scale: 1,
        center: [5],
        expected: '{"n0":[4.25259068131634,"NaN"],"n1":[4.7508635604387806,"NaN"],"n2":[5.99654575824488,"NaN"]}',
    },
    {
        name: "2d offset, array, scale 0, center [0,0]",
        input: [
            [3, 7],
            [5, 2],
            [10, 4],
        ],
        scale: 0,
        center: [0, 0],
        expected: "[[0,0],[0,0],[0,0]]",
    },
    {
        name: "2d offset, map, scale 0, center [0,0]",
        input: {
            n0: [3, 7],
            n1: [5, 2],
            n2: [10, 4],
        },
        scale: 0,
        center: [0, 0],
        expected: '{"n0":[0,0],"n1":[0,0],"n2":[0,0]}',
    },
    {
        name: "2d offset, array, scale -2, center [1,1,1,1]",
        input: [
            [3, 7],
            [5, 2],
            [10, 4],
        ],
        scale: -2,
        center: [1, 1, 1, 1],
        expected:
            "[[2.4948186373673193,-0.32872767765983957,1,1],[1.4982728791224398,2.1626367179523593,1,1],[-0.9930915164897591,1.1660909597074798,1,1]]",
    },
    {
        name: "2d offset, map, scale -2, center [1,1,1,1]",
        input: {
            n0: [3, 7],
            n1: [5, 2],
            n2: [10, 4],
        },
        scale: -2,
        center: [1, 1, 1, 1],
        expected:
            '{"n0":[2.4948186373673193,-0.32872767765983957,1,1],"n1":[1.4982728791224398,2.1626367179523593,1,1],"n2":[-0.9930915164897591,1.1660909597074798,1,1]}',
    },
    {
        name: "3d, array, scale undefined, center undefined",
        input: [
            [1, 2, 3],
            [-4, 0, 2],
            [0, 5, -1],
        ],
        expected:
            "[[0.518321055348816,-0.08638684255813604,0.43193421279068],[-0.777481583023224,-0.604707897906952,0.17277368511627203],[0.259160527674408,0.691094740465088,-0.6047078979069519]]",
    },
    {
        name: "3d, map, scale undefined, center undefined",
        input: {
            n0: [1, 2, 3],
            n1: [-4, 0, 2],
            n2: [0, 5, -1],
        },
        expected:
            '{"n0":[0.518321055348816,-0.08638684255813604,0.43193421279068],"n1":[-0.777481583023224,-0.604707897906952,0.17277368511627203],"n2":[0.259160527674408,0.691094740465088,-0.6047078979069519]}',
    },
    {
        name: "3d, array, scale 2, center null",
        input: [
            [1, 2, 3],
            [-4, 0, 2],
            [0, 5, -1],
        ],
        scale: 2,
        center: null,
        expected:
            "[[1.036642110697632,-0.17277368511627209,0.86386842558136],[-1.554963166046448,-1.209415795813904,0.34554737023254406],[0.518321055348816,1.382189480930176,-1.2094157958139038]]",
    },
    {
        name: "3d, map, scale 2, center null",
        input: {
            n0: [1, 2, 3],
            n1: [-4, 0, 2],
            n2: [0, 5, -1],
        },
        scale: 2,
        center: null,
        expected:
            '{"n0":[1.036642110697632,-0.17277368511627209,0.86386842558136],"n1":[-1.554963166046448,-1.209415795813904,0.34554737023254406],"n2":[0.518321055348816,1.382189480930176,-1.2094157958139038]}',
    },
    {
        name: "3d, array, scale 0.5, center [1,-1]",
        input: [
            [1, 2, 3],
            [-4, 0, 2],
            [0, 5, -1],
        ],
        scale: 0.5,
        center: [1, -1],
        expected:
            '[[1.259160527674408,-1.0431934212790681,"NaN"],[0.611259208488388,-1.302353948953476,"NaN"],[1.129580263837204,-0.654452629767456,"NaN"]]',
    },
    {
        name: "3d, map, scale 0.5, center [1,-1]",
        input: {
            n0: [1, 2, 3],
            n1: [-4, 0, 2],
            n2: [0, 5, -1],
        },
        scale: 0.5,
        center: [1, -1],
        expected:
            '{"n0":[1.259160527674408,-1.0431934212790681,"NaN"],"n1":[0.611259208488388,-1.302353948953476,"NaN"],"n2":[1.129580263837204,-0.654452629767456,"NaN"]}',
    },
    {
        name: "3d, array, scale 3, center [1,2,3]",
        input: [
            [1, 2, 3],
            [-4, 0, 2],
            [0, 5, -1],
        ],
        scale: 3,
        center: [1, 2, 3],
        expected:
            "[[2.554963166046448,1.7408394723255918,4.29580263837204],[-1.3324447490696718,0.18587630627914375,3.518321055348816],[1.777481583023224,4.073284221395264,1.1858763062791442]]",
    },
    {
        name: "3d, map, scale 3, center [1,2,3]",
        input: {
            n0: [1, 2, 3],
            n1: [-4, 0, 2],
            n2: [0, 5, -1],
        },
        scale: 3,
        center: [1, 2, 3],
        expected:
            '{"n0":[2.554963166046448,1.7408394723255918,4.29580263837204],"n1":[-1.3324447490696718,0.18587630627914375,3.518321055348816],"n2":[1.777481583023224,4.073284221395264,1.1858763062791442]}',
    },
    {
        name: "3d, array, scale 1, center [5]",
        input: [
            [1, 2, 3],
            [-4, 0, 2],
            [0, 5, -1],
        ],
        scale: 1,
        center: [5],
        expected: '[[5.518321055348816,"NaN","NaN"],[4.222518416976776,"NaN","NaN"],[5.259160527674408,"NaN","NaN"]]',
    },
    {
        name: "3d, map, scale 1, center [5]",
        input: {
            n0: [1, 2, 3],
            n1: [-4, 0, 2],
            n2: [0, 5, -1],
        },
        scale: 1,
        center: [5],
        expected:
            '{"n0":[5.518321055348816,"NaN","NaN"],"n1":[4.222518416976776,"NaN","NaN"],"n2":[5.259160527674408,"NaN","NaN"]}',
    },
    {
        name: "3d, array, scale 0, center [0,0]",
        input: [
            [1, 2, 3],
            [-4, 0, 2],
            [0, 5, -1],
        ],
        scale: 0,
        center: [0, 0],
        expected: '[[0,0,"NaN"],[0,0,"NaN"],[0,0,"NaN"]]',
    },
    {
        name: "3d, map, scale 0, center [0,0]",
        input: {
            n0: [1, 2, 3],
            n1: [-4, 0, 2],
            n2: [0, 5, -1],
        },
        scale: 0,
        center: [0, 0],
        expected: '{"n0":[0,0,"NaN"],"n1":[0,0,"NaN"],"n2":[0,0,"NaN"]}',
    },
    {
        name: "3d, array, scale -2, center [1,1,1,1]",
        input: [
            [1, 2, 3],
            [-4, 0, 2],
            [0, 5, -1],
        ],
        scale: -2,
        center: [1, 1, 1, 1],
        expected:
            "[[-0.03664211069763201,1.172773685116272,0.13613157441864,1],[2.554963166046448,2.209415795813904,0.654452629767456,1],[0.481678944651184,-0.382189480930176,2.2094157958139036,1]]",
    },
    {
        name: "3d, map, scale -2, center [1,1,1,1]",
        input: {
            n0: [1, 2, 3],
            n1: [-4, 0, 2],
            n2: [0, 5, -1],
        },
        scale: -2,
        center: [1, 1, 1, 1],
        expected:
            '{"n0":[-0.03664211069763201,1.172773685116272,0.13613157441864,1],"n1":[2.554963166046448,2.209415795813904,0.654452629767456,1],"n2":[0.481678944651184,-0.382189480930176,2.2094157958139036,1]}',
    },
    {
        name: "one node, array, scale undefined, center undefined",
        input: [[2, 3]],
        expected: "[[0,0]]",
    },
    {
        name: "one node, map, scale undefined, center undefined",
        input: {
            n0: [2, 3],
        },
        expected: '{"n0":[0,0]}',
    },
    {
        name: "one node, array, scale 2, center null",
        input: [[2, 3]],
        scale: 2,
        center: null,
        expected: "[[0,0]]",
    },
    {
        name: "one node, map, scale 2, center null",
        input: {
            n0: [2, 3],
        },
        scale: 2,
        center: null,
        expected: '{"n0":[0,0]}',
    },
    {
        name: "one node, array, scale 0.5, center [1,-1]",
        input: [[2, 3]],
        scale: 0.5,
        center: [1, -1],
        expected: "[[1,-1]]",
    },
    {
        name: "one node, map, scale 0.5, center [1,-1]",
        input: {
            n0: [2, 3],
        },
        scale: 0.5,
        center: [1, -1],
        expected: '{"n0":[1,-1]}',
    },
    {
        name: "one node, array, scale 3, center [1,2,3]",
        input: [[2, 3]],
        scale: 3,
        center: [1, 2, 3],
        expected: "[[1,2,3]]",
    },
    {
        name: "one node, map, scale 3, center [1,2,3]",
        input: {
            n0: [2, 3],
        },
        scale: 3,
        center: [1, 2, 3],
        expected: '{"n0":[1,2,3]}',
    },
    {
        name: "one node, array, scale 1, center [5]",
        input: [[2, 3]],
        scale: 1,
        center: [5],
        expected: '[[5,"undefined"]]',
    },
    {
        name: "one node, map, scale 1, center [5]",
        input: {
            n0: [2, 3],
        },
        scale: 1,
        center: [5],
        expected: '{"n0":[5,"undefined"]}',
    },
    {
        name: "one node, array, scale 0, center [0,0]",
        input: [[2, 3]],
        scale: 0,
        center: [0, 0],
        expected: "[[0,0]]",
    },
    {
        name: "one node, map, scale 0, center [0,0]",
        input: {
            n0: [2, 3],
        },
        scale: 0,
        center: [0, 0],
        expected: '{"n0":[0,0]}',
    },
    {
        name: "one node, array, scale -2, center [1,1,1,1]",
        input: [[2, 3]],
        scale: -2,
        center: [1, 1, 1, 1],
        expected: "[[1,1,1,1]]",
    },
    {
        name: "one node, map, scale -2, center [1,1,1,1]",
        input: {
            n0: [2, 3],
        },
        scale: -2,
        center: [1, 1, 1, 1],
        expected: '{"n0":[1,1,1,1]}',
    },
    {
        name: "all same, array, scale undefined, center undefined",
        input: [
            [4, 4],
            [4, 4],
            [4, 4],
        ],
        expected: "[[0,0],[0,0],[0,0]]",
    },
    {
        name: "all same, map, scale undefined, center undefined",
        input: {
            n0: [4, 4],
            n1: [4, 4],
            n2: [4, 4],
        },
        expected: '{"n0":[0,0],"n1":[0,0],"n2":[0,0]}',
    },
    {
        name: "all same, array, scale 2, center null",
        input: [
            [4, 4],
            [4, 4],
            [4, 4],
        ],
        scale: 2,
        center: null,
        expected: "[[0,0],[0,0],[0,0]]",
    },
    {
        name: "all same, map, scale 2, center null",
        input: {
            n0: [4, 4],
            n1: [4, 4],
            n2: [4, 4],
        },
        scale: 2,
        center: null,
        expected: '{"n0":[0,0],"n1":[0,0],"n2":[0,0]}',
    },
    {
        name: "all same, array, scale 0.5, center [1,-1]",
        input: [
            [4, 4],
            [4, 4],
            [4, 4],
        ],
        scale: 0.5,
        center: [1, -1],
        expected: "[[1,-1],[1,-1],[1,-1]]",
    },
    {
        name: "all same, map, scale 0.5, center [1,-1]",
        input: {
            n0: [4, 4],
            n1: [4, 4],
            n2: [4, 4],
        },
        scale: 0.5,
        center: [1, -1],
        expected: '{"n0":[1,-1],"n1":[1,-1],"n2":[1,-1]}',
    },
    {
        name: "all same, array, scale 3, center [1,2,3]",
        input: [
            [4, 4],
            [4, 4],
            [4, 4],
        ],
        scale: 3,
        center: [1, 2, 3],
        expected: "[[1,2,3],[1,2,3],[1,2,3]]",
    },
    {
        name: "all same, map, scale 3, center [1,2,3]",
        input: {
            n0: [4, 4],
            n1: [4, 4],
            n2: [4, 4],
        },
        scale: 3,
        center: [1, 2, 3],
        expected: '{"n0":[1,2,3],"n1":[1,2,3],"n2":[1,2,3]}',
    },
    {
        name: "all same, array, scale 1, center [5]",
        input: [
            [4, 4],
            [4, 4],
            [4, 4],
        ],
        scale: 1,
        center: [5],
        expected: '[[5,"undefined"],[5,"undefined"],[5,"undefined"]]',
    },
    {
        name: "all same, map, scale 1, center [5]",
        input: {
            n0: [4, 4],
            n1: [4, 4],
            n2: [4, 4],
        },
        scale: 1,
        center: [5],
        expected: '{"n0":[5,"undefined"],"n1":[5,"undefined"],"n2":[5,"undefined"]}',
    },
    {
        name: "all same, array, scale 0, center [0,0]",
        input: [
            [4, 4],
            [4, 4],
            [4, 4],
        ],
        scale: 0,
        center: [0, 0],
        expected: "[[0,0],[0,0],[0,0]]",
    },
    {
        name: "all same, map, scale 0, center [0,0]",
        input: {
            n0: [4, 4],
            n1: [4, 4],
            n2: [4, 4],
        },
        scale: 0,
        center: [0, 0],
        expected: '{"n0":[0,0],"n1":[0,0],"n2":[0,0]}',
    },
    {
        name: "all same, array, scale -2, center [1,1,1,1]",
        input: [
            [4, 4],
            [4, 4],
            [4, 4],
        ],
        scale: -2,
        center: [1, 1, 1, 1],
        expected: "[[1,1,1,1],[1,1,1,1],[1,1,1,1]]",
    },
    {
        name: "all same, map, scale -2, center [1,1,1,1]",
        input: {
            n0: [4, 4],
            n1: [4, 4],
            n2: [4, 4],
        },
        scale: -2,
        center: [1, 1, 1, 1],
        expected: '{"n0":[1,1,1,1],"n1":[1,1,1,1],"n2":[1,1,1,1]}',
    },
    {
        name: "nan component, array, scale undefined, center undefined",
        input: [
            [1, "NaN"],
            [3, 2],
            [-2, 4],
        ],
        expected:
            '[[0.11704114719613058,"NaN"],[0.819288030372914,-0.3511234415883917],[-0.9363291775690445,0.3511234415883917]]',
    },
    {
        name: "nan component, map, scale undefined, center undefined",
        input: {
            n0: [1, "NaN"],
            n1: [3, 2],
            n2: [-2, 4],
        },
        expected:
            '{"n0":[0.11704114719613058,"NaN"],"n1":[0.819288030372914,-0.3511234415883917],"n2":[-0.9363291775690445,0.3511234415883917]}',
    },
    {
        name: "nan component, array, scale 2, center null",
        input: [
            [1, "NaN"],
            [3, 2],
            [-2, 4],
        ],
        scale: 2,
        center: null,
        expected:
            '[[0.23408229439226116,"NaN"],[1.638576060745828,-0.7022468831767834],[-1.872658355138089,0.7022468831767834]]',
    },
    {
        name: "nan component, map, scale 2, center null",
        input: {
            n0: [1, "NaN"],
            n1: [3, 2],
            n2: [-2, 4],
        },
        scale: 2,
        center: null,
        expected:
            '{"n0":[0.23408229439226116,"NaN"],"n1":[1.638576060745828,-0.7022468831767834],"n2":[-1.872658355138089,0.7022468831767834]}',
    },
    {
        name: "nan component, array, scale 0.5, center [1,-1]",
        input: [
            [1, "NaN"],
            [3, 2],
            [-2, 4],
        ],
        scale: 0.5,
        center: [1, -1],
        expected:
            '[[1.0585205735980654,"NaN"],[1.409644015186457,-1.175561720794196],[0.5318354112154777,-0.8244382792058041]]',
    },
    {
        name: "nan component, map, scale 0.5, center [1,-1]",
        input: {
            n0: [1, "NaN"],
            n1: [3, 2],
            n2: [-2, 4],
        },
        scale: 0.5,
        center: [1, -1],
        expected:
            '{"n0":[1.0585205735980654,"NaN"],"n1":[1.409644015186457,-1.175561720794196],"n2":[0.5318354112154777,-0.8244382792058041]}',
    },
    {
        name: "nan component, array, scale 3, center [1,2,3]",
        input: [
            [1, "NaN"],
            [3, 2],
            [-2, 4],
        ],
        scale: 3,
        center: [1, 2, 3],
        expected:
            '[[1.3511234415883917,"NaN",3],[3.457864091118742,0.9466296752348249,3],[-1.8089875327071336,3.053370324765175,3]]',
    },
    {
        name: "nan component, map, scale 3, center [1,2,3]",
        input: {
            n0: [1, "NaN"],
            n1: [3, 2],
            n2: [-2, 4],
        },
        scale: 3,
        center: [1, 2, 3],
        expected:
            '{"n0":[1.3511234415883917,"NaN",3],"n1":[3.457864091118742,0.9466296752348249,3],"n2":[-1.8089875327071336,3.053370324765175,3]}',
    },
    {
        name: "nan component, array, scale 1, center [5]",
        input: [
            [1, "NaN"],
            [3, 2],
            [-2, 4],
        ],
        scale: 1,
        center: [5],
        expected: '[[5.11704114719613,"NaN"],[5.819288030372914,"NaN"],[4.0636708224309555,"NaN"]]',
    },
    {
        name: "nan component, map, scale 1, center [5]",
        input: {
            n0: [1, "NaN"],
            n1: [3, 2],
            n2: [-2, 4],
        },
        scale: 1,
        center: [5],
        expected: '{"n0":[5.11704114719613,"NaN"],"n1":[5.819288030372914,"NaN"],"n2":[4.0636708224309555,"NaN"]}',
    },
    {
        name: "nan component, array, scale 0, center [0,0]",
        input: [
            [1, "NaN"],
            [3, 2],
            [-2, 4],
        ],
        scale: 0,
        center: [0, 0],
        expected: '[[0,"NaN"],[0,0],[0,0]]',
    },
    {
        name: "nan component, map, scale 0, center [0,0]",
        input: {
            n0: [1, "NaN"],
            n1: [3, 2],
            n2: [-2, 4],
        },
        scale: 0,
        center: [0, 0],
        expected: '{"n0":[0,"NaN"],"n1":[0,0],"n2":[0,0]}',
    },
    {
        name: "nan component, array, scale -2, center [1,1,1,1]",
        input: [
            [1, "NaN"],
            [3, 2],
            [-2, 4],
        ],
        scale: -2,
        center: [1, 1, 1, 1],
        expected:
            '[[0.7659177056077389,"NaN",1,1],[-0.638576060745828,1.7022468831767834,1,1],[2.872658355138089,0.2977531168232166,1,1]]',
    },
    {
        name: "nan component, map, scale -2, center [1,1,1,1]",
        input: {
            n0: [1, "NaN"],
            n1: [3, 2],
            n2: [-2, 4],
        },
        scale: -2,
        center: [1, 1, 1, 1],
        expected:
            '{"n0":[0.7659177056077389,"NaN",1,1],"n1":[-0.638576060745828,1.7022468831767834,1,1],"n2":[2.872658355138089,0.2977531168232166,1,1]}',
    },
    {
        name: "all nan column, array, scale undefined, center undefined",
        input: [
            ["NaN", 1],
            ["NaN", 3],
        ],
        expected: '[["NaN",-1],["NaN",1]]',
    },
    {
        name: "all nan column, map, scale undefined, center undefined",
        input: {
            n0: ["NaN", 1],
            n1: ["NaN", 3],
        },
        expected: '{"n0":["NaN",-1],"n1":["NaN",1]}',
    },
    {
        name: "all nan column, array, scale 2, center null",
        input: [
            ["NaN", 1],
            ["NaN", 3],
        ],
        scale: 2,
        center: null,
        expected: '[["NaN",-2],["NaN",2]]',
    },
    {
        name: "all nan column, map, scale 2, center null",
        input: {
            n0: ["NaN", 1],
            n1: ["NaN", 3],
        },
        scale: 2,
        center: null,
        expected: '{"n0":["NaN",-2],"n1":["NaN",2]}',
    },
    {
        name: "all nan column, array, scale 0.5, center [1,-1]",
        input: [
            ["NaN", 1],
            ["NaN", 3],
        ],
        scale: 0.5,
        center: [1, -1],
        expected: '[["NaN",-1.5],["NaN",-0.5]]',
    },
    {
        name: "all nan column, map, scale 0.5, center [1,-1]",
        input: {
            n0: ["NaN", 1],
            n1: ["NaN", 3],
        },
        scale: 0.5,
        center: [1, -1],
        expected: '{"n0":["NaN",-1.5],"n1":["NaN",-0.5]}',
    },
    {
        name: "all nan column, array, scale 3, center [1,2,3]",
        input: [
            ["NaN", 1],
            ["NaN", 3],
        ],
        scale: 3,
        center: [1, 2, 3],
        expected: '[["NaN",-1,3],["NaN",5,3]]',
    },
    {
        name: "all nan column, map, scale 3, center [1,2,3]",
        input: {
            n0: ["NaN", 1],
            n1: ["NaN", 3],
        },
        scale: 3,
        center: [1, 2, 3],
        expected: '{"n0":["NaN",-1,3],"n1":["NaN",5,3]}',
    },
    {
        name: "all nan column, array, scale 1, center [5]",
        input: [
            ["NaN", 1],
            ["NaN", 3],
        ],
        scale: 1,
        center: [5],
        expected: '[["NaN","NaN"],["NaN","NaN"]]',
    },
    {
        name: "all nan column, map, scale 1, center [5]",
        input: {
            n0: ["NaN", 1],
            n1: ["NaN", 3],
        },
        scale: 1,
        center: [5],
        expected: '{"n0":["NaN","NaN"],"n1":["NaN","NaN"]}',
    },
    {
        name: "all nan column, array, scale 0, center [0,0]",
        input: [
            ["NaN", 1],
            ["NaN", 3],
        ],
        scale: 0,
        center: [0, 0],
        expected: '[["NaN",0],["NaN",0]]',
    },
    {
        name: "all nan column, map, scale 0, center [0,0]",
        input: {
            n0: ["NaN", 1],
            n1: ["NaN", 3],
        },
        scale: 0,
        center: [0, 0],
        expected: '{"n0":["NaN",0],"n1":["NaN",0]}',
    },
    {
        name: "all nan column, array, scale -2, center [1,1,1,1]",
        input: [
            ["NaN", 1],
            ["NaN", 3],
        ],
        scale: -2,
        center: [1, 1, 1, 1],
        expected: '[["NaN",3,1,1],["NaN",-1,1,1]]',
    },
    {
        name: "all nan column, map, scale -2, center [1,1,1,1]",
        input: {
            n0: ["NaN", 1],
            n1: ["NaN", 3],
        },
        scale: -2,
        center: [1, 1, 1, 1],
        expected: '{"n0":["NaN",3,1,1],"n1":["NaN",-1,1,1]}',
    },
    {
        name: "all nan, array, scale undefined, center undefined",
        input: [
            ["NaN", "NaN"],
            ["NaN", "NaN"],
        ],
        expected: '[["NaN","NaN"],["NaN","NaN"]]',
    },
    {
        name: "all nan, map, scale undefined, center undefined",
        input: {
            n0: ["NaN", "NaN"],
            n1: ["NaN", "NaN"],
        },
        expected: '{"n0":["NaN","NaN"],"n1":["NaN","NaN"]}',
    },
    {
        name: "all nan, array, scale 2, center null",
        input: [
            ["NaN", "NaN"],
            ["NaN", "NaN"],
        ],
        scale: 2,
        center: null,
        expected: '[["NaN","NaN"],["NaN","NaN"]]',
    },
    {
        name: "all nan, map, scale 2, center null",
        input: {
            n0: ["NaN", "NaN"],
            n1: ["NaN", "NaN"],
        },
        scale: 2,
        center: null,
        expected: '{"n0":["NaN","NaN"],"n1":["NaN","NaN"]}',
    },
    {
        name: "all nan, array, scale 0.5, center [1,-1]",
        input: [
            ["NaN", "NaN"],
            ["NaN", "NaN"],
        ],
        scale: 0.5,
        center: [1, -1],
        expected: '[["NaN","NaN"],["NaN","NaN"]]',
    },
    {
        name: "all nan, map, scale 0.5, center [1,-1]",
        input: {
            n0: ["NaN", "NaN"],
            n1: ["NaN", "NaN"],
        },
        scale: 0.5,
        center: [1, -1],
        expected: '{"n0":["NaN","NaN"],"n1":["NaN","NaN"]}',
    },
    {
        name: "all nan, array, scale 3, center [1,2,3]",
        input: [
            ["NaN", "NaN"],
            ["NaN", "NaN"],
        ],
        scale: 3,
        center: [1, 2, 3],
        expected: '[["NaN","NaN",3],["NaN","NaN",3]]',
    },
    {
        name: "all nan, map, scale 3, center [1,2,3]",
        input: {
            n0: ["NaN", "NaN"],
            n1: ["NaN", "NaN"],
        },
        scale: 3,
        center: [1, 2, 3],
        expected: '{"n0":["NaN","NaN",3],"n1":["NaN","NaN",3]}',
    },
    {
        name: "all nan, array, scale 1, center [5]",
        input: [
            ["NaN", "NaN"],
            ["NaN", "NaN"],
        ],
        scale: 1,
        center: [5],
        expected: '[["NaN","NaN"],["NaN","NaN"]]',
    },
    {
        name: "all nan, map, scale 1, center [5]",
        input: {
            n0: ["NaN", "NaN"],
            n1: ["NaN", "NaN"],
        },
        scale: 1,
        center: [5],
        expected: '{"n0":["NaN","NaN"],"n1":["NaN","NaN"]}',
    },
    {
        name: "all nan, array, scale 0, center [0,0]",
        input: [
            ["NaN", "NaN"],
            ["NaN", "NaN"],
        ],
        scale: 0,
        center: [0, 0],
        expected: '[["NaN","NaN"],["NaN","NaN"]]',
    },
    {
        name: "all nan, map, scale 0, center [0,0]",
        input: {
            n0: ["NaN", "NaN"],
            n1: ["NaN", "NaN"],
        },
        scale: 0,
        center: [0, 0],
        expected: '{"n0":["NaN","NaN"],"n1":["NaN","NaN"]}',
    },
    {
        name: "all nan, array, scale -2, center [1,1,1,1]",
        input: [
            ["NaN", "NaN"],
            ["NaN", "NaN"],
        ],
        scale: -2,
        center: [1, 1, 1, 1],
        expected: '[["NaN","NaN",1,1],["NaN","NaN",1,1]]',
    },
    {
        name: "all nan, map, scale -2, center [1,1,1,1]",
        input: {
            n0: ["NaN", "NaN"],
            n1: ["NaN", "NaN"],
        },
        scale: -2,
        center: [1, 1, 1, 1],
        expected: '{"n0":["NaN","NaN",1,1],"n1":["NaN","NaN",1,1]}',
    },
    {
        name: "nan in same, array, scale undefined, center undefined",
        input: [
            [1, "NaN"],
            [1, 2],
        ],
        expected: '[[0,"NaN"],[0,0]]',
    },
    {
        name: "nan in same, map, scale undefined, center undefined",
        input: {
            n0: [1, "NaN"],
            n1: [1, 2],
        },
        expected: '{"n0":[0,"NaN"],"n1":[0,0]}',
    },
    {
        name: "nan in same, array, scale 2, center null",
        input: [
            [1, "NaN"],
            [1, 2],
        ],
        scale: 2,
        center: null,
        expected: '[[0,"NaN"],[0,0]]',
    },
    {
        name: "nan in same, map, scale 2, center null",
        input: {
            n0: [1, "NaN"],
            n1: [1, 2],
        },
        scale: 2,
        center: null,
        expected: '{"n0":[0,"NaN"],"n1":[0,0]}',
    },
    {
        name: "nan in same, array, scale 0.5, center [1,-1]",
        input: [
            [1, "NaN"],
            [1, 2],
        ],
        scale: 0.5,
        center: [1, -1],
        expected: '[[1,"NaN"],[1,-1]]',
    },
    {
        name: "nan in same, map, scale 0.5, center [1,-1]",
        input: {
            n0: [1, "NaN"],
            n1: [1, 2],
        },
        scale: 0.5,
        center: [1, -1],
        expected: '{"n0":[1,"NaN"],"n1":[1,-1]}',
    },
    {
        name: "nan in same, array, scale 3, center [1,2,3]",
        input: [
            [1, "NaN"],
            [1, 2],
        ],
        scale: 3,
        center: [1, 2, 3],
        expected: '[[1,"NaN",3],[1,2,3]]',
    },
    {
        name: "nan in same, map, scale 3, center [1,2,3]",
        input: {
            n0: [1, "NaN"],
            n1: [1, 2],
        },
        scale: 3,
        center: [1, 2, 3],
        expected: '{"n0":[1,"NaN",3],"n1":[1,2,3]}',
    },
    {
        name: "nan in same, array, scale 1, center [5]",
        input: [
            [1, "NaN"],
            [1, 2],
        ],
        scale: 1,
        center: [5],
        expected: '[[5,"NaN"],[5,"undefined"]]',
    },
    {
        name: "nan in same, map, scale 1, center [5]",
        input: {
            n0: [1, "NaN"],
            n1: [1, 2],
        },
        scale: 1,
        center: [5],
        expected: '{"n0":[5,"NaN"],"n1":[5,"undefined"]}',
    },
    {
        name: "nan in same, array, scale 0, center [0,0]",
        input: [
            [1, "NaN"],
            [1, 2],
        ],
        scale: 0,
        center: [0, 0],
        expected: '[[0,"NaN"],[0,0]]',
    },
    {
        name: "nan in same, map, scale 0, center [0,0]",
        input: {
            n0: [1, "NaN"],
            n1: [1, 2],
        },
        scale: 0,
        center: [0, 0],
        expected: '{"n0":[0,"NaN"],"n1":[0,0]}',
    },
    {
        name: "nan in same, array, scale -2, center [1,1,1,1]",
        input: [
            [1, "NaN"],
            [1, 2],
        ],
        scale: -2,
        center: [1, 1, 1, 1],
        expected: '[[1,"NaN",1,1],[1,1,1,1]]',
    },
    {
        name: "nan in same, map, scale -2, center [1,1,1,1]",
        input: {
            n0: [1, "NaN"],
            n1: [1, 2],
        },
        scale: -2,
        center: [1, 1, 1, 1],
        expected: '{"n0":[1,"NaN",1,1],"n1":[1,1,1,1]}',
    },
    {
        name: "shorter row, array, scale undefined, center undefined",
        input: [
            [1, 2, 3],
            [4, 5],
            [0, 1, 2],
        ],
        expected:
            "[[-0.16103393644569494,-0.1610339364456949,0.12077545233427119],[0.5636187775599322,0.5636187775599323,0],[-0.4025848411142373,-0.40258484111423726,-0.12077545233427119]]",
    },
    {
        name: "shorter row, map, scale undefined, center undefined",
        input: {
            n0: [1, 2, 3],
            n1: [4, 5],
            n2: [0, 1, 2],
        },
        expected:
            '{"n0":[-0.16103393644569494,-0.1610339364456949,0.12077545233427119],"n1":[0.5636187775599322,0.5636187775599323,0],"n2":[-0.4025848411142373,-0.40258484111423726,-0.12077545233427119]}',
    },
    {
        name: "shorter row, array, scale 2, center null",
        input: [
            [1, 2, 3],
            [4, 5],
            [0, 1, 2],
        ],
        scale: 2,
        center: null,
        expected:
            "[[-0.3220678728913899,-0.3220678728913898,0.24155090466854237],[1.1272375551198643,1.1272375551198646,0],[-0.8051696822284746,-0.8051696822284745,-0.24155090466854237]]",
    },
    {
        name: "shorter row, map, scale 2, center null",
        input: {
            n0: [1, 2, 3],
            n1: [4, 5],
            n2: [0, 1, 2],
        },
        scale: 2,
        center: null,
        expected:
            '{"n0":[-0.3220678728913899,-0.3220678728913898,0.24155090466854237],"n1":[1.1272375551198643,1.1272375551198646,0],"n2":[-0.8051696822284746,-0.8051696822284745,-0.24155090466854237]}',
    },
    {
        name: "shorter row, array, scale 0.5, center [1,-1]",
        input: [
            [1, 2, 3],
            [4, 5],
            [0, 1, 2],
        ],
        scale: 0.5,
        center: [1, -1],
        expected:
            '[[0.9194830317771525,-1.0805169682228475,"NaN"],[1.281809388779966,-0.7181906112200338,"undefined"],[0.7987075794428813,-1.2012924205571187,"NaN"]]',
    },
    {
        name: "shorter row, map, scale 0.5, center [1,-1]",
        input: {
            n0: [1, 2, 3],
            n1: [4, 5],
            n2: [0, 1, 2],
        },
        scale: 0.5,
        center: [1, -1],
        expected:
            '{"n0":[0.9194830317771525,-1.0805169682228475,"NaN"],"n1":[1.281809388779966,-0.7181906112200338,"undefined"],"n2":[0.7987075794428813,-1.2012924205571187,"NaN"]}',
    },
    {
        name: "shorter row, array, scale 3, center [1,2,3]",
        input: [
            [1, 2, 3],
            [4, 5],
            [0, 1, 2],
        ],
        scale: 3,
        center: [1, 2, 3],
        expected:
            "[[0.5168981906629152,1.5168981906629153,3.3623263570028135],[2.6908563326797967,3.6908563326797967,3],[-0.20775452334271205,0.7922454766572882,2.6376736429971865]]",
    },
    {
        name: "shorter row, map, scale 3, center [1,2,3]",
        input: {
            n0: [1, 2, 3],
            n1: [4, 5],
            n2: [0, 1, 2],
        },
        scale: 3,
        center: [1, 2, 3],
        expected:
            '{"n0":[0.5168981906629152,1.5168981906629153,3.3623263570028135],"n1":[2.6908563326797967,3.6908563326797967,3],"n2":[-0.20775452334271205,0.7922454766572882,2.6376736429971865]}',
    },
    {
        name: "shorter row, array, scale 1, center [5]",
        input: [
            [1, 2, 3],
            [4, 5],
            [0, 1, 2],
        ],
        scale: 1,
        center: [5],
        expected:
            '[[4.838966063554305,"NaN","NaN"],[5.563618777559932,"NaN","undefined"],[4.597415158885763,"NaN","NaN"]]',
    },
    {
        name: "shorter row, map, scale 1, center [5]",
        input: {
            n0: [1, 2, 3],
            n1: [4, 5],
            n2: [0, 1, 2],
        },
        scale: 1,
        center: [5],
        expected:
            '{"n0":[4.838966063554305,"NaN","NaN"],"n1":[5.563618777559932,"NaN","undefined"],"n2":[4.597415158885763,"NaN","NaN"]}',
    },
    {
        name: "shorter row, array, scale 0, center [0,0]",
        input: [
            [1, 2, 3],
            [4, 5],
            [0, 1, 2],
        ],
        scale: 0,
        center: [0, 0],
        expected: '[[0,0,"NaN"],[0,0,"undefined"],[0,0,"NaN"]]',
    },
    {
        name: "shorter row, map, scale 0, center [0,0]",
        input: {
            n0: [1, 2, 3],
            n1: [4, 5],
            n2: [0, 1, 2],
        },
        scale: 0,
        center: [0, 0],
        expected: '{"n0":[0,0,"NaN"],"n1":[0,0,"undefined"],"n2":[0,0,"NaN"]}',
    },
    {
        name: "shorter row, array, scale -2, center [1,1,1,1]",
        input: [
            [1, 2, 3],
            [4, 5],
            [0, 1, 2],
        ],
        scale: -2,
        center: [1, 1, 1, 1],
        expected:
            "[[1.32206787289139,1.3220678728913897,0.7584490953314577,1],[-0.12723755511986434,-0.12723755511986456,1,1],[1.8051696822284746,1.8051696822284744,1.2415509046685425,1]]",
    },
    {
        name: "shorter row, map, scale -2, center [1,1,1,1]",
        input: {
            n0: [1, 2, 3],
            n1: [4, 5],
            n2: [0, 1, 2],
        },
        scale: -2,
        center: [1, 1, 1, 1],
        expected:
            '{"n0":[1.32206787289139,1.3220678728913897,0.7584490953314577,1],"n1":[-0.12723755511986434,-0.12723755511986456,1,1],"n2":[1.8051696822284746,1.8051696822284744,1.2415509046685425,1]}',
    },
    {
        name: "longer row, array, scale undefined, center undefined",
        input: [
            [1, 2],
            [4, 5, 6],
            [0, 1],
        ],
        expected:
            "[[-0.2020305089104422,-0.2020305089104421],[0.7071067811865475,0.7071067811865476],[-0.5050762722761054,-0.5050762722761054]]",
    },
    {
        name: "longer row, map, scale undefined, center undefined",
        input: {
            n0: [1, 2],
            n1: [4, 5, 6],
            n2: [0, 1],
        },
        expected:
            '{"n0":[-0.2020305089104422,-0.2020305089104421],"n1":[0.7071067811865475,0.7071067811865476],"n2":[-0.5050762722761054,-0.5050762722761054]}',
    },
    {
        name: "longer row, array, scale 2, center null",
        input: [
            [1, 2],
            [4, 5, 6],
            [0, 1],
        ],
        scale: 2,
        center: null,
        expected:
            "[[-0.4040610178208844,-0.4040610178208842],[1.414213562373095,1.4142135623730951],[-1.0101525445522108,-1.0101525445522108]]",
    },
    {
        name: "longer row, map, scale 2, center null",
        input: {
            n0: [1, 2],
            n1: [4, 5, 6],
            n2: [0, 1],
        },
        scale: 2,
        center: null,
        expected:
            '{"n0":[-0.4040610178208844,-0.4040610178208842],"n1":[1.414213562373095,1.4142135623730951],"n2":[-1.0101525445522108,-1.0101525445522108]}',
    },
    {
        name: "longer row, array, scale 0.5, center [1,-1]",
        input: [
            [1, 2],
            [4, 5, 6],
            [0, 1],
        ],
        scale: 0.5,
        center: [1, -1],
        expected:
            "[[0.8989847455447789,-1.101015254455221],[1.3535533905932737,-0.6464466094067263],[0.7474618638619472,-1.2525381361380528]]",
    },
    {
        name: "longer row, map, scale 0.5, center [1,-1]",
        input: {
            n0: [1, 2],
            n1: [4, 5, 6],
            n2: [0, 1],
        },
        scale: 0.5,
        center: [1, -1],
        expected:
            '{"n0":[0.8989847455447789,-1.101015254455221],"n1":[1.3535533905932737,-0.6464466094067263],"n2":[0.7474618638619472,-1.2525381361380528]}',
    },
    {
        name: "longer row, array, scale 3, center [1,2,3]",
        input: [
            [1, 2],
            [4, 5, 6],
            [0, 1],
        ],
        scale: 3,
        center: [1, 2, 3],
        expected:
            "[[0.7079245698932586,1.7079245698932588,3],[2.0222640053735947,3.0222640053735947,5.628678870960671],[0.2698114247331467,1.2698114247331467,3]]",
    },
    {
        name: "longer row, map, scale 3, center [1,2,3]",
        input: {
            n0: [1, 2],
            n1: [4, 5, 6],
            n2: [0, 1],
        },
        scale: 3,
        center: [1, 2, 3],
        expected:
            '{"n0":[0.7079245698932586,1.7079245698932588,3],"n1":[2.0222640053735947,3.0222640053735947,5.628678870960671],"n2":[0.2698114247331467,1.2698114247331467,3]}',
    },
    {
        name: "longer row, array, scale 1, center [5]",
        input: [
            [1, 2],
            [4, 5, 6],
            [0, 1],
        ],
        scale: 1,
        center: [5],
        expected: '[[4.797969491089558,"NaN"],[5.707106781186548,"NaN"],[4.4949237277238945,"NaN"]]',
    },
    {
        name: "longer row, map, scale 1, center [5]",
        input: {
            n0: [1, 2],
            n1: [4, 5, 6],
            n2: [0, 1],
        },
        scale: 1,
        center: [5],
        expected: '{"n0":[4.797969491089558,"NaN"],"n1":[5.707106781186548,"NaN"],"n2":[4.4949237277238945,"NaN"]}',
    },
    {
        name: "longer row, array, scale 0, center [0,0]",
        input: [
            [1, 2],
            [4, 5, 6],
            [0, 1],
        ],
        scale: 0,
        center: [0, 0],
        expected: "[[0,0],[0,0],[0,0]]",
    },
    {
        name: "longer row, map, scale 0, center [0,0]",
        input: {
            n0: [1, 2],
            n1: [4, 5, 6],
            n2: [0, 1],
        },
        scale: 0,
        center: [0, 0],
        expected: '{"n0":[0,0],"n1":[0,0],"n2":[0,0]}',
    },
    {
        name: "longer row, array, scale -2, center [1,1,1,1]",
        input: [
            [1, 2],
            [4, 5, 6],
            [0, 1],
        ],
        scale: -2,
        center: [1, 1, 1, 1],
        expected:
            "[[1.1947169534044941,1.1947169534044941,1,1],[0.3184906630842703,0.3184906630842702,-0.7524525806404478,1],[1.4867923835112355,1.4867923835112355,1,1]]",
    },
    {
        name: "longer row, map, scale -2, center [1,1,1,1]",
        input: {
            n0: [1, 2],
            n1: [4, 5, 6],
            n2: [0, 1],
        },
        scale: -2,
        center: [1, 1, 1, 1],
        expected:
            '{"n0":[1.1947169534044941,1.1947169534044941,1,1],"n1":[0.3184906630842703,0.3184906630842702,-0.7524525806404478,1],"n2":[1.4867923835112355,1.4867923835112355,1,1]}',
    },
    {
        name: "shorter row same, array, scale undefined, center undefined",
        input: [
            [1, 1, 1],
            [1, 1],
        ],
        expected: "[[0,0,0],[0,0,0]]",
    },
    {
        name: "shorter row same, map, scale undefined, center undefined",
        input: {
            n0: [1, 1, 1],
            n1: [1, 1],
        },
        expected: '{"n0":[0,0,0],"n1":[0,0,0]}',
    },
    {
        name: "shorter row same, array, scale 2, center null",
        input: [
            [1, 1, 1],
            [1, 1],
        ],
        scale: 2,
        center: null,
        expected: "[[0,0,0],[0,0,0]]",
    },
    {
        name: "shorter row same, map, scale 2, center null",
        input: {
            n0: [1, 1, 1],
            n1: [1, 1],
        },
        scale: 2,
        center: null,
        expected: '{"n0":[0,0,0],"n1":[0,0,0]}',
    },
    {
        name: "shorter row same, array, scale 0.5, center [1,-1]",
        input: [
            [1, 1, 1],
            [1, 1],
        ],
        scale: 0.5,
        center: [1, -1],
        expected: '[[1,-1,"NaN"],[1,-1,"undefined"]]',
    },
    {
        name: "shorter row same, map, scale 0.5, center [1,-1]",
        input: {
            n0: [1, 1, 1],
            n1: [1, 1],
        },
        scale: 0.5,
        center: [1, -1],
        expected: '{"n0":[1,-1,"NaN"],"n1":[1,-1,"undefined"]}',
    },
    {
        name: "shorter row same, array, scale 3, center [1,2,3]",
        input: [
            [1, 1, 1],
            [1, 1],
        ],
        scale: 3,
        center: [1, 2, 3],
        expected: "[[1,2,3],[1,2,3]]",
    },
    {
        name: "shorter row same, map, scale 3, center [1,2,3]",
        input: {
            n0: [1, 1, 1],
            n1: [1, 1],
        },
        scale: 3,
        center: [1, 2, 3],
        expected: '{"n0":[1,2,3],"n1":[1,2,3]}',
    },
    {
        name: "shorter row same, array, scale 1, center [5]",
        input: [
            [1, 1, 1],
            [1, 1],
        ],
        scale: 1,
        center: [5],
        expected: '[[5,"NaN","NaN"],[5,"NaN","undefined"]]',
    },
    {
        name: "shorter row same, map, scale 1, center [5]",
        input: {
            n0: [1, 1, 1],
            n1: [1, 1],
        },
        scale: 1,
        center: [5],
        expected: '{"n0":[5,"NaN","NaN"],"n1":[5,"NaN","undefined"]}',
    },
    {
        name: "shorter row same, array, scale 0, center [0,0]",
        input: [
            [1, 1, 1],
            [1, 1],
        ],
        scale: 0,
        center: [0, 0],
        expected: '[[0,0,"NaN"],[0,0,"undefined"]]',
    },
    {
        name: "shorter row same, map, scale 0, center [0,0]",
        input: {
            n0: [1, 1, 1],
            n1: [1, 1],
        },
        scale: 0,
        center: [0, 0],
        expected: '{"n0":[0,0,"NaN"],"n1":[0,0,"undefined"]}',
    },
    {
        name: "shorter row same, array, scale -2, center [1,1,1,1]",
        input: [
            [1, 1, 1],
            [1, 1],
        ],
        scale: -2,
        center: [1, 1, 1, 1],
        expected: "[[1,1,1,1],[1,1,1,1]]",
    },
    {
        name: "shorter row same, map, scale -2, center [1,1,1,1]",
        input: {
            n0: [1, 1, 1],
            n1: [1, 1],
        },
        scale: -2,
        center: [1, 1, 1, 1],
        expected: '{"n0":[1,1,1,1],"n1":[1,1,1,1]}',
    },
    {
        name: "infinity, array, scale undefined, center undefined",
        input: [
            ["Infinity", 0],
            [1, 1],
        ],
        expected: '[["NaN",0],["NaN",0]]',
    },
    {
        name: "infinity, map, scale undefined, center undefined",
        input: {
            n0: ["Infinity", 0],
            n1: [1, 1],
        },
        expected: '{"n0":["NaN",0],"n1":["NaN",0]}',
    },
    {
        name: "infinity, array, scale 2, center null",
        input: [
            ["Infinity", 0],
            [1, 1],
        ],
        scale: 2,
        center: null,
        expected: '[["NaN",0],["NaN",0]]',
    },
    {
        name: "infinity, map, scale 2, center null",
        input: {
            n0: ["Infinity", 0],
            n1: [1, 1],
        },
        scale: 2,
        center: null,
        expected: '{"n0":["NaN",0],"n1":["NaN",0]}',
    },
    {
        name: "infinity, array, scale 0.5, center [1,-1]",
        input: [
            ["Infinity", 0],
            [1, 1],
        ],
        scale: 0.5,
        center: [1, -1],
        expected: '[["NaN",-1],["NaN",-1]]',
    },
    {
        name: "infinity, map, scale 0.5, center [1,-1]",
        input: {
            n0: ["Infinity", 0],
            n1: [1, 1],
        },
        scale: 0.5,
        center: [1, -1],
        expected: '{"n0":["NaN",-1],"n1":["NaN",-1]}',
    },
    {
        name: "infinity, array, scale 3, center [1,2,3]",
        input: [
            ["Infinity", 0],
            [1, 1],
        ],
        scale: 3,
        center: [1, 2, 3],
        expected: '[["NaN",2,3],["NaN",2,3]]',
    },
    {
        name: "infinity, map, scale 3, center [1,2,3]",
        input: {
            n0: ["Infinity", 0],
            n1: [1, 1],
        },
        scale: 3,
        center: [1, 2, 3],
        expected: '{"n0":["NaN",2,3],"n1":["NaN",2,3]}',
    },
    {
        name: "infinity, array, scale 1, center [5]",
        input: [
            ["Infinity", 0],
            [1, 1],
        ],
        scale: 1,
        center: [5],
        expected: '[["NaN","NaN"],["NaN","NaN"]]',
    },
    {
        name: "infinity, map, scale 1, center [5]",
        input: {
            n0: ["Infinity", 0],
            n1: [1, 1],
        },
        scale: 1,
        center: [5],
        expected: '{"n0":["NaN","NaN"],"n1":["NaN","NaN"]}',
    },
    {
        name: "infinity, array, scale 0, center [0,0]",
        input: [
            ["Infinity", 0],
            [1, 1],
        ],
        scale: 0,
        center: [0, 0],
        expected: '[["NaN",0],["NaN",0]]',
    },
    {
        name: "infinity, map, scale 0, center [0,0]",
        input: {
            n0: ["Infinity", 0],
            n1: [1, 1],
        },
        scale: 0,
        center: [0, 0],
        expected: '{"n0":["NaN",0],"n1":["NaN",0]}',
    },
    {
        name: "infinity, array, scale -2, center [1,1,1,1]",
        input: [
            ["Infinity", 0],
            [1, 1],
        ],
        scale: -2,
        center: [1, 1, 1, 1],
        expected: '[["NaN",1,1,1],["NaN",1,1,1]]',
    },
    {
        name: "infinity, map, scale -2, center [1,1,1,1]",
        input: {
            n0: ["Infinity", 0],
            n1: [1, 1],
        },
        scale: -2,
        center: [1, 1, 1, 1],
        expected: '{"n0":["NaN",1,1,1],"n1":["NaN",1,1,1]}',
    },
    {
        name: "empty array",
        input: [],
        expected: "[]",
    },
    {
        name: "empty map",
        input: {},
        expected: "{}",
    },
];

const revive = (v: unknown): unknown => {
    if (Array.isArray(v)) {
        return v.map(revive);
    }
    if (typeof v === "string") {
        return Number(v);
    }
    if (v !== null && typeof v === "object") {
        return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, revive(x)]));
    }
    return v;
};

const ser = (v: unknown): string =>
    JSON.stringify(v, (_k, x: unknown) => {
        if (typeof x === "number" && !Number.isFinite(x)) {
            return String(x);
        }
        return x === undefined ? "undefined" : x;
    });

describe("rescaleLayout golden outputs", () => {
    for (const c of CASES) {
        it(c.name, () => {
            const input = revive(c.input) as Parameters<typeof rescaleLayout>[0];
            assert.strictEqual(ser(rescaleLayout(input, c.scale, c.center)), c.expected);
        });
    }
});
