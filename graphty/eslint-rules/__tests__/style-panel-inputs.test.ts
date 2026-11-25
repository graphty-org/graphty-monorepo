/**
 * The style-panel-inputs rule: an input control imported from anywhere but compact-mantine, or a native input drawn
 * by hand, is refused in the Style panel; a gap the config names is let through from Mantine only.
 */

import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { describe, it } from "vitest";

import rule from "../style-panel-inputs.js";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
    languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
});

const gaps = [{ gaps: { Checkbox: "no compact-mantine check box" } }];

tester.run("style-panel-inputs", rule, {
    valid: [
        'import { AnglePicker, FontPicker, ImagePicker, PanelField } from "@graphty/compact-mantine";',
        // Layout takes no input.
        'import { Group, Stack, Tooltip, VisuallyHidden } from "@mantine/core";',
        // An app component wrapping compact-mantine is checked in its own file.
        'import { ImageField } from "../ImageField";',
        'import type { TextInputProps } from "@mantine/core";',
        { code: 'import { Checkbox } from "@mantine/core";', options: gaps },
        "<div><span>x</span></div>;",
        // A namespace's layout, and compact-mantine's inputs read through a namespace.
        'import * as MC from "@mantine/core"; <MC.Group />;',
        'import * as CM from "@graphty/compact-mantine"; <CM.SegmentedControl />;',
        { code: 'import * as MC from "@mantine/core"; <MC.Checkbox />;', options: gaps },
    ],
    invalid: [
        { code: 'import { TextInput } from "@mantine/core";', errors: [{ messageId: "imported" }] },
        { code: 'import { Checkbox } from "@mantine/core";', errors: [{ messageId: "imported" }] },
        // A gap is Mantine's only: the same name from elsewhere is still refused.
        { code: 'import { Checkbox } from "./MyCheckbox";', options: gaps, errors: [{ messageId: "imported" }] },
        { code: 'import { Select } from "../parts/Select";', errors: [{ messageId: "imported" }] },
        { code: '<input type="range" />;', errors: [{ messageId: "native" }] },
        // An input read through a namespace import, in JSX or as a value.
        { code: 'import * as MC from "@mantine/core"; <MC.Select data={[]} />;', errors: [{ messageId: "imported" }] },
        { code: 'import * as MC from "@mantine/core"; const S = MC.TextInput;', errors: [{ messageId: "imported" }] },
        { code: "<button>Go</button>;", errors: [{ messageId: "native" }] },
    ],
});
