import { ChatBubbleIcon } from "@radix-ui/react-icons";
import { LinkExternalIcon } from "@primer/octicons-react";
import { Button, Card, Flex, Text } from "@radix-ui/themes";
import { SettingsSection } from "./SettingsSection";

const feedbackCardStyle = {
  background:
    "linear-gradient(135deg, var(--accent-1), var(--accent-2), var(--accent-1))",
};

export const FeedbackSettings = () => (
  <SettingsSection>
    <Card className="accent-shadow-low" style={feedbackCardStyle}>
      <Flex align="center" justify="between" gap="3">
        <Text weight="medium">Feedback</Text>
        <Button
          variant="outline"
          onClick={() => {
            window.electronAPI.openExternalLink("mailto:tiago@cozywatch.com");
          }}
        >
          Let’s chat
          <ChatBubbleIcon />
        </Button>
      </Flex>
    </Card>
    <Card className="accent-shadow-low" style={feedbackCardStyle}>
      <Flex align="center" justify="between" gap="3">
        <Text weight="medium">See what’s new</Text>
        <Button
          variant="outline"
          onClick={() => {
            window.electronAPI.openExternalLink(
              "https://www.cozywatch.com/changelog/",
            );
          }}
        >
          Open Release Notes
          <LinkExternalIcon size={12} />
        </Button>
      </Flex>
    </Card>
  </SettingsSection>
);
