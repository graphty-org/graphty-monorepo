/**
 * The survey card (usage-analytics.md section 4.4): when it asks, which survey, what it stores and
 * what it sends. PostHog is a recording stand-in through `setPostHogClientForTests`; the moments
 * are the app's own `count()` and `detail()` calls.
 */
import type { Survey } from "posthog-js";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import {
    count,
    detail,
    readSurveyState,
    resetAnalyticsForTests,
    setPostHogClientForTests,
    stopPostHog,
    SURVEYS_KEY,
} from "../../../lib/analytics";
import { act, render, screen } from "../../../test/test-utils";
import { SurveyCard } from "../SurveyCard";
import { EXPORT_EASE_SURVEY, USE_CASE_SURVEY } from "./surveyFixtures";

/** Every capture the stand-in received, after `cleanPostHogEvent`. */
let captured: { event: string; properties: Record<string, unknown> }[] = [];
/** How often the card asked PostHog for surveys. */
let asks = 0;
let undo: () => void = () => undefined;

/**
 * Turns PostHog on with a stand-in that offers these surveys.
 * @param surveys - the active surveys.
 */
function share(surveys: Survey[] = [USE_CASE_SURVEY, EXPORT_EASE_SURVEY]): void {
    undo = setPostHogClientForTests({
        getActiveMatchingSurveys: (callback) => {
            asks++;
            callback(surveys);
        },
        capture: (event, properties) => {
            captured.push({ event, properties: { ...properties } });
            return undefined;
        },
    });
}

/**
 * Fires a moment outside React, as the workspace's hooks do.
 * @param fire - the count or detail call.
 */
function moment(fire: () => void): void {
    act(fire);
}

const succeeded = (): void => {
    count("algorithm_run", { algorithm: "pagerank", outcome: "succeeded" });
};
const exported = (): void => {
    count("export_done", { kind: "graph", format: "json", destination: "download" });
};

const card = (): HTMLElement | null => screen.queryByRole("complementary", { name: "Survey" });

beforeEach(() => {
    resetAnalyticsForTests();
    localStorage.removeItem(SURVEYS_KEY);
    captured = [];
    asks = 0;
});
afterEach(() => {
    undo();
    vi.useRealTimers();
    localStorage.removeItem(SURVEYS_KEY);
});

describe("SurveyCard", () => {
    it("renders nothing while usage data is not shared", () => {
        render(<SurveyCard />);
        moment(succeeded);
        assert.isNull(card());
    });

    it("asks the use case at a measure's first result, and not before", () => {
        share();
        render(<SurveyCard />);
        assert.isNull(card());
        assert.equal(asks, 0);

        moment(succeeded);

        assert.isNotNull(card());
        assert.isNotNull(screen.getByText("What are you trying to do?"));
        assert.deepEqual(readSurveyState().seen, [USE_CASE_SURVEY.id]);
        const shown = captured.find((entry) => entry.event === "survey shown");
        assert.equal(shown?.properties.$survey_id, USE_CASE_SURVEY.id);
        assert.equal(shown?.properties.$survey_name, "use_case");
    });

    it("asks the use case at a failed load", () => {
        share();
        render(<SurveyCard />);
        moment(() => {
            detail("load_failed", { code: "other", task: "load" });
        });
        assert.isNotNull(screen.getByText("What are you trying to do?"));
    });

    it("asks three minutes after a load with no measure, and only once when a measure came first", () => {
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        share();
        const { unmount } = render(<SurveyCard />);
        moment(() => {
            count("sample_loaded", { sample: "karate" });
        });
        act(() => {
            vi.advanceTimersByTime(179_999);
        });
        assert.isNull(card());
        act(() => {
            vi.advanceTimersByTime(1);
        });
        assert.isNotNull(screen.getByText("What are you trying to do?"));
        unmount();

        // A later page view, with the use case not yet answered.
        localStorage.removeItem(SURVEYS_KEY);
        asks = 0;
        render(<SurveyCard />);
        moment(() => {
            count("own_file_opened", { format: "graphml", via: "file" });
        });
        moment(succeeded);
        assert.equal(asks, 1);
        act(() => {
            vi.advanceTimersByTime(180_000 * 2);
        });
        assert.equal(asks, 1);
        assert.lengthOf(screen.getAllByRole("complementary", { name: "Survey" }), 1);
    });

    it("maps each moment to its own survey and asks at most once per page view", () => {
        share();
        const { unmount } = render(<SurveyCard />);
        moment(succeeded);
        assert.isNotNull(screen.getByText("What are you trying to do?"));
        assert.isNull(screen.queryByText("How easy was it to get this export?"));
        // A second moment on the same page view asks nothing.
        moment(exported);
        assert.equal(asks, 1);
        assert.isNull(screen.queryByText("How easy was it to get this export?"));
        unmount();

        // A later visit, the use case already seen: the export asks how easy it was.
        render(<SurveyCard />);
        moment(succeeded);
        assert.isNull(card());
        moment(exported);
        assert.isNotNull(screen.getByText("How easy was it to get this export?"));
    });

    it("never falls back to another active survey", () => {
        share([EXPORT_EASE_SURVEY]);
        render(<SurveyCard />);
        moment(succeeded);
        assert.equal(asks, 1);
        assert.isNull(card());
    });

    it("asks PostHog nothing after sharing stopped", () => {
        share();
        render(<SurveyCard />);
        act(() => {
            stopPostHog();
        });
        moment(succeeded);
        assert.equal(asks, 0);
        assert.isNull(card());
    });

    it("stores the chosen id, which later events carry as use_case, on this visit and the next", async () => {
        share();
        const { unmount } = render(<SurveyCard />);
        moment(succeeded);

        await userEvent.click(screen.getByRole("radio", { name: "Make a figure for a paper or talk" }));
        await userEvent.click(screen.getByRole("button", { name: "Send" }));

        assert.isNull(card());
        assert.equal(readSurveyState().use_case, "make-a-figure-for-a-paper-or-talk");
        const sent = captured.find((entry) => entry.event === "survey sent");
        assert.equal(sent?.properties.$survey_id, USE_CASE_SURVEY.id);
        assert.equal(sent?.properties["$survey_response_q-use"], "Make a figure for a paper or talk");
        assert.equal(sent?.properties.use_case, "make-a-figure-for-a-paper-or-talk");
        unmount();

        // A later visit: a fresh page, sharing on again.
        undo();
        resetAnalyticsForTests();
        captured = [];
        share();
        render(<SurveyCard />);
        moment(() => {
            detail("command_run", { command: "view.fit" });
        });
        assert.equal(captured[0]?.properties.use_case, "make-a-figure-for-a-paper-or-talk");
    });

    it("never asks again once dismissed or answered", async () => {
        share();
        const first = render(<SurveyCard />);
        moment(succeeded);
        await userEvent.click(screen.getByRole("button", { name: "Dismiss survey" }));
        assert.isNull(card());
        assert.isDefined(captured.find((entry) => entry.event === "survey dismissed"));
        first.unmount();

        const second = render(<SurveyCard />);
        moment(succeeded);
        assert.isNull(card());
        moment(exported);
        await userEvent.click(screen.getByRole("button", { name: "4" }));
        assert.equal(captured.find((entry) => entry.event === "survey sent")?.properties["$survey_response_q-ease"], 4);
        second.unmount();

        render(<SurveyCard />);
        moment(succeeded);
        moment(exported);
        assert.isNull(card());
    });

    it("sends the Other text only as the survey response, next to its warning", async () => {
        share();
        render(<SurveyCard />);
        moment(succeeded);

        await userEvent.click(screen.getByRole("radio", { name: "Other" }));
        assert.isNotNull(screen.getByText("Do not paste data from your graph. What you type here is sent."));
        await userEvent.type(screen.getByRole("textbox", { name: "Your answer" }), "mapping supply chains");
        await userEvent.click(screen.getByRole("button", { name: "Send" }));

        const sent = captured.find((entry) => entry.event === "survey sent");
        assert.equal(sent?.properties["$survey_response_q-use"], "mapping supply chains");
        assert.equal(sent?.properties.use_case, "other");
        assert.equal(readSurveyState().use_case, "other");
        const holding = Object.entries(sent?.properties ?? {}).filter(([, value]) => String(value).includes("supply"));
        assert.deepEqual(
            holding.map(([key]) => key),
            ["$survey_response_q-use"],
        );
        assert.notInclude(localStorage.getItem(SURVEYS_KEY) ?? "", "supply");
    });
});
