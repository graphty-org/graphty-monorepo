import { Button, Group, Modal, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";
import { Link } from "lucide-react";
import React, { useState } from "react";

/** The network sources being built (issue #2907): what each is, in the reader's words. */
const SOURCES = [
    { name: "NDEx", what: "Public biology networks" },
    { name: "Neo4j", what: "Run a Cypher query" },
    { name: "Web API", what: "JSON results as nodes and edges" },
] as const;

/**
 * Open network data: the sources that are on the way, and, for now, Open from a link, which opens
 * a graph file at a web address.
 * @param props - Component props
 * @param props.opened - Whether the chooser is open
 * @param props.onClose - Closes it
 * @param props.onOpenLink - Opens the graph file at an address
 * @returns The chooser
 */
export function NetworkDataDialog({
    opened,
    onClose,
    onOpenLink,
}: Readonly<{ opened: boolean; onClose: () => void; onOpenLink: (url: string) => void }>): React.JSX.Element {
    const [address, setAddress] = useState("");
    const valid = URL.canParse(address.trim(), globalThis.location.href) && address.trim() !== "";

    return (
        <Modal opened={opened} onClose={onClose} title="Open network data" size="md" centered>
            <Stack gap="sm">
                <Text size="sm" c="dimmed">
                    Connecting to these sources is on the way. For now, open a graph file from a link.
                </Text>
                <SimpleGrid cols={3} spacing="xs">
                    {SOURCES.map((source) => (
                        <div key={source.name} className="ws-land-source" aria-disabled="true">
                            <Text size="sm" fw={600}>
                                {source.name}
                            </Text>
                            <Text size="xs" c="dimmed">
                                {source.what}
                            </Text>
                            <Text size="xs" c="dimmed" fs="italic">
                                On the way
                            </Text>
                        </div>
                    ))}
                </SimpleGrid>
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (valid) {
                            onOpenLink(new URL(address.trim(), globalThis.location.href).href);
                        }
                    }}
                >
                    <Group gap="xs" align="flex-end" wrap="nowrap">
                        <TextInput
                            label="Open from a link"
                            placeholder="https://example.com/network.graphml"
                            leftSection={<Link size={14} aria-hidden />}
                            value={address}
                            onChange={(event) => {
                                setAddress(event.currentTarget.value);
                            }}
                            style={{ flex: 1 }}
                            data-autofocus
                        />
                        <Button type="submit" disabled={!valid}>
                            Open
                        </Button>
                    </Group>
                </form>
            </Stack>
        </Modal>
    );
}
