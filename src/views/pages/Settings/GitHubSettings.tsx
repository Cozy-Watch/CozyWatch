import { MarkGithubIcon, SignOutIcon } from "@primer/octicons-react";
import { Avatar, Button, Card, Flex, Text } from "@radix-ui/themes";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import Logger from "electron-log";
import { useUserQuery } from "../../api/useUserQuery";
import { SettingsSection } from "./SettingsSection";

export const GitHubSettings = () => {
  const router = useRouter();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useUserQuery();

  const onSignOut = async () => {
    try {
      await window.electronAPI.application.signUser(false);
      await queryClient.invalidateQueries();
      await router.invalidate();
      navigate({ to: "/" });
    } catch (error) {
      Logger.error("[GitHubSettings] Error disconnecting GitHub", { error });
    }
  };

  return (
    <SettingsSection>
      <Card
        className="accent-shadow-low"
        style={{
          background:
            "linear-gradient(135deg, var(--accent-1), var(--accent-2), var(--accent-1))",
        }}
      >
        <Flex align="center" justify="between">
          <Flex align="center" gap="2">
            {user ? (
              <Avatar
                src={user.avatarUrl}
                fallback={user.login.slice(0, 2).toUpperCase()}
                size="2"
                radius="full"
              />
            ) : (
              <MarkGithubIcon size={16} />
            )}
            <Flex direction="column">
              <Text weight="medium">GitHub connection</Text>
              {user && (
                <Text size="2" color="gray">
                  Connected as {user.login}
                </Text>
              )}
            </Flex>
          </Flex>
          <Button variant="soft" color="red" size="1" onClick={onSignOut}>
            <SignOutIcon size={12} />
            Disconnect
          </Button>
        </Flex>
      </Card>
    </SettingsSection>
  );
};
