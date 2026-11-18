import "./privacy.css";

import { Button, CloseButton, Group, Paper, Radio, Stack, Text, TextInput } from "@mantine/core";
import type { MultipleSurveyQuestion, RatingSurveyQuestion, Survey } from "posthog-js";
import React, { useEffect, useState } from "react";

import { onUsageEvent, postHog, readSurveyState, SURVEY_NAMES, writeSurveyState } from "../../lib/analytics";
import { useUsageAnswer } from "./usageData";

/** How long after a load with no measure run the use case is asked. */
const NO_RUN_DELAY_MS = 180_000;
/** The use case stored for the open ("Other") choice: the typed text is never stored. */
const OTHER_ID = "other";

type Question = MultipleSurveyQuestion | RatingSurveyQuestion;

/**
 * The survey's question, when the card can draw it: a single choice or a rating.
 * @param survey - the survey from PostHog.
 * @returns its first question, or undefined.
 */
function drawable(survey: Survey): Question | undefined {
    const question = survey.questions[0];
    return question?.type === "single_choice" || question?.type === "rating" ? question : undefined;
}

/**
 * The id stored for a choice: a slug of the owner's label, never the label itself.
 * @param label - the choice's label in PostHog.
 * @returns the id.
 */
function choiceId(label: string): string {
    return (
        label
            .toLowerCase()
            .replaceAll(/[^a-z0-9]+/g, "-")
            .replaceAll(/^-|-$/g, "")
            .slice(0, 40) || OTHER_ID
    );
}

/**
 * The property a response is sent in.
 * @param question - the question answered.
 * @returns `$survey_response_<question id>`, or `$survey_response` for a question with no id.
 */
function responseKey(question: Question): string {
    return question.id === undefined ? "$survey_response" : `$survey_response_${question.id}`;
}

/**
 * A short PostHog survey (design/graphty/usage-analytics.md section 4.4), drawn by the app and
 * pinned to the window's foot like the usage data card. It is asked only while usage data is
 * shared, at most once per page view, and each survey only once: at a measure's first result or
 * failure, a failed load or three minutes after a load with no measure (the use case), or at the
 * first export (how easy it was).
 * @returns The card, or nothing
 */
export function SurveyCard(): React.JSX.Element | null {
    const answer = useUsageAnswer();
    const [survey, setSurvey] = useState<{ survey: Survey; question: Question } | undefined>();
    const [choice, setChoice] = useState<string | null>(null);
    const [otherText, setOtherText] = useState("");

    // Sharing turned off drops the card for good: a later Share never brings back a question
    // asked under the earlier id, outside the moments it is asked at.
    useEffect(() => {
        if (answer !== "share") {
            setSurvey(undefined);
            setChoice(null);
            setOtherText("");
        }
    }, [answer]);

    useEffect(() => {
        let asked = false;
        const tried = new Set<string>();
        let timer: ReturnType<typeof setTimeout> | undefined;
        const stopTimer = (): void => {
            clearTimeout(timer);
            timer = undefined;
        };
        const moment = (name: string): void => {
            const client = postHog();
            if (asked || tried.has(name) || client === undefined) {
                return;
            }
            tried.add(name);
            client.getActiveMatchingSurveys((surveys) => {
                const found = surveys.find((candidate) => candidate.name === name);
                const question = found === undefined ? undefined : drawable(found);
                const state = readSurveyState();
                if (asked || postHog() !== client || found === undefined || question === undefined) {
                    return;
                }
                if (state.seen.includes(found.id)) {
                    return;
                }
                asked = true;
                stopTimer();
                writeSurveyState({ ...state, seen: [...state.seen, found.id] });
                client.capture("survey shown", { $survey_id: found.id, $survey_name: found.name });
                setSurvey({ survey: found, question });
            });
        };
        const off = onUsageEvent((name, props) => {
            if (name === "algorithm_run") {
                stopTimer();
                if (props.outcome === "succeeded" || props.outcome === "failed") {
                    moment(SURVEY_NAMES.useCase);
                }
            } else if (name === "load_failed") {
                moment(SURVEY_NAMES.useCase);
            } else if (name === "sample_loaded" || name === "own_file_opened") {
                stopTimer();
                timer = setTimeout(() => {
                    moment(SURVEY_NAMES.useCase);
                }, NO_RUN_DELAY_MS);
            } else if (name === "export_done") {
                moment(SURVEY_NAMES.exportEase);
            }
        });
        return () => {
            off();
            stopTimer();
        };
    }, []);

    const client = postHog();
    if (survey === undefined || client === undefined) {
        return null;
    }
    const { survey: shown, question } = survey;
    const ids = { $survey_id: shown.id, $survey_name: shown.name };
    const send = (response: string | number, useCase?: string): void => {
        if (useCase !== undefined) {
            writeSurveyState({ ...readSurveyState(), use_case: useCase });
        }
        client.capture("survey sent", { ...ids, [responseKey(question)]: response });
        setSurvey(undefined);
    };
    const dismiss = (): void => {
        client.capture("survey dismissed", ids);
        setSurvey(undefined);
    };
    // PostHog's open choice is the last one.
    const otherLabel =
        question.type === "single_choice" && question.hasOpenChoice === true ? question.choices.at(-1) : undefined;

    return (
        <Paper component="aside" aria-label="Survey" withBorder p="sm" className="ws-usage-notice">
            <Stack gap={6}>
                <Group gap="xs" wrap="nowrap" justify="space-between" align="flex-start">
                    <Text size="sm" fw={600}>
                        {question.question}
                    </Text>
                    <CloseButton size="sm" aria-label="Dismiss survey" onClick={dismiss} />
                </Group>
                {question.type === "rating" ? (
                    <Stack gap={4}>
                        <Group gap="xs">
                            {Array.from({ length: question.scale }, (_, index) => index + 1).map((value) => (
                                <Button
                                    key={value}
                                    variant="default"
                                    onClick={() => {
                                        send(value);
                                    }}
                                >
                                    {value}
                                </Button>
                            ))}
                        </Group>
                        <Group justify="space-between">
                            <Text size="xs" c="dimmed">
                                {question.lowerBoundLabel}
                            </Text>
                            <Text size="xs" c="dimmed">
                                {question.upperBoundLabel}
                            </Text>
                        </Group>
                    </Stack>
                ) : (
                    <>
                        <Radio.Group value={choice} onChange={setChoice} aria-label={question.question}>
                            <Stack gap={4}>
                                {question.choices.map((label) => (
                                    <Radio key={label} value={label} label={label} />
                                ))}
                            </Stack>
                        </Radio.Group>
                        {choice !== null && choice === otherLabel ? (
                            <TextInput
                                label="Your answer"
                                description="Do not paste data from your graph. What you type here is sent."
                                value={otherText}
                                onChange={(event) => {
                                    setOtherText(event.currentTarget.value);
                                }}
                            />
                        ) : null}
                        <Group gap="xs">
                            <Button
                                variant="default"
                                disabled={choice === null}
                                onClick={() => {
                                    if (choice === otherLabel) {
                                        send(otherText.trim() === "" ? choice : otherText, OTHER_ID);
                                    } else if (choice !== null) {
                                        send(choice, choiceId(choice));
                                    }
                                }}
                            >
                                Send
                            </Button>
                        </Group>
                    </>
                )}
            </Stack>
        </Paper>
    );
}
