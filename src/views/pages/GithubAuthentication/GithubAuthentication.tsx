import {
  ArrowLeftIcon,
  KeyIcon,
  LinkExternalIcon,
  LinkIcon,
  MarkGithubIcon,
} from "@primer/octicons-react";
import {
  Box,
  Button,
  Callout,
  Card,
  Flex,
  Text,
  TextField,
} from "@radix-ui/themes";
import Logger from "electron-log";
import { useState } from "react";
import Confetti from "react-confetti";
import { CozyWatch } from "../../components/SVG/CozyWatch";
import { usePATauthenticationMutation } from "./api/usePATauthenticationMutation";
import { useAuthentication } from "./useGithubAuthentication";

export const GithubAuthentication = () => {
  const [showOtherOptions, setShowOtherOptions] = useState(false);
  const [patValue, setPatValue] = useState("");

  const { error, mutateAsync } = usePATauthenticationMutation();

  const {
    data: { authData },
    action: { authenticate, authenticateGitHubApp, setAuthData },
  } = useAuthentication();

  if (authData) {
    return (
      <Flex
        direction="column"
        justify="between"
        align="center"
        flexGrow="1"
        gap="4"
        style={{
          background:
            "linear-gradient(180deg,var(--accent-2) 50%, var(--accent-4) 100%)",
        }}
        height="100%"
        p="9"
      >
        <Flex direction="column" align="center" gap="4">
          <Flex align="center" gap="2">
            <img src="./images/icon.png" width="38" />

            <CozyWatch
              style={{ marginBottom: "-4px" }}
              src="./images/cozywatch.svg"
              height="28"
              className="inverse-accent-text-shadow"
            />

          </Flex>
        </Flex>

        <Flex
          direction="column"
          align="center"
          justify="center"
          gap="4"
          flexGrow="1"
        >
          <Text className="inverse-accent-text-shadow" size="8">
            Almost there!
          </Text>

          <Text size="2" align="center" className="inverse-accent-text-shadow">
            Please enter the code below on the GitHub authentication page to
            complete the process.
          </Text>

          <Card>
            <Text size="8" weight="bold" color="iris" align="center">
              {authData.user_code}
            </Text>
          </Card>

          <Flex direction="column" gap="1">
            <Button
              variant="soft"
              className="inverse-accent-text-shadow"
              onClick={() => {
                window.electronAPI.openExternalLink(authData.verification_uri);
              }}
              size="1"
            >
              Manually Open GitHub Authentication Page
              <LinkExternalIcon size={12} />
            </Button>
          </Flex>

          <Button
            variant="outline"
            size="1"
            onClick={async () => {
              setAuthData(null);
            }}
          >
            <ArrowLeftIcon size={16} />
            Back
          </Button>
        </Flex>
      </Flex>
    );
  }

  if (showOtherOptions) {
    return (
      <Flex
        direction="column"
        justify="between"
        align="center"
        flexGrow="1"
        gap="4"
        style={{
          background:
            "linear-gradient(180deg,var(--accent-2) 50%, var(--accent-4) 100%)",
        }}
        height="100%"
        p="9"
      >
        <Flex direction="column" align="center" gap="4">
          <Flex align="center" gap="2">
            <img src="./images/icon.png" width="38" />

            <CozyWatch
              style={{ marginBottom: "-4px" }}
              src="./images/cozywatch.svg"
              height="28"
              className="inverse-accent-text-shadow"
            />

          </Flex>
        </Flex>
        <Flex
          direction="column"
          align="center"
          justify="center"
          gap="4"
          flexGrow="1"
        >
          <Text className="bright-background-text-shadow" size="6">
            Almost there!
          </Text>

          <Flex direction="column" gap="3" align="center">
            <Flex align="center" gap="2" flexGrow="1">
              <TextField.Root
                color="indigo"
                placeholder="Enter PAT (Personal Access Token)"
                value={patValue}
                onChange={({ target: { value } }) => {
                  setPatValue(value);
                }}
                style={{ width: "290px" }}
                type="password"
              >
                <TextField.Slot>
                  <KeyIcon size={12} />
                </TextField.Slot>
              </TextField.Root>

              <Button
                variant="soft"
                size="2"
                className="inverse-accent-text-shadow"
                color="indigo"
                disabled={!patValue}
                onClick={async () => {
                  try {
                    await mutateAsync(patValue);
                  } catch (e) {
                    Logger.error("Error storing PAT:", e);
                  }
                }}
              >
                <MarkGithubIcon size={16} />
                Use PAT
              </Button>
            </Flex>

            {error && (
              <Flex width="100%" align="center" justify="center">
                <Callout.Root variant="soft" color="red" size="1">
                  <Callout.Text size="1">{error.message}</Callout.Text>
                </Callout.Root>
              </Flex>
            )}

            <Flex gap="3">
              <Callout.Root variant="outline" color="gray">
                <Box width="200px">
                  <Callout.Text weight="bold" size="2">
                    Classic PAT scopes:
                  </Callout.Text>

                  <Flex direction="column" gap="1" mt="2">
                    <Text weight="bold" size="1">
                      repo
                    </Text>

                    <Text weight="bold" size="1">
                      read:org
                    </Text>
                  </Flex>
                  <Text size="1" mt="3">
                    Create an expiring token and revoke it at any time from
                    GitHub. Cozy Watch stores it securely on this Mac.
                  </Text>
                </Box>
              </Callout.Root>
            </Flex>
          </Flex>

          <Button
            color="indigo"
            variant="soft"
            size="1"
            onClick={() => {
              window.electronAPI.openExternalLink(
                "https://github.com/settings/tokens/new",
              );
            }}
          >
            Generate PAT
            <LinkIcon size={12} />
          </Button>

          <Button
            mt="4"
            variant="outline"
            size="1"
            onClick={async () => {
              setShowOtherOptions((state) => !state);
            }}
          >
            <ArrowLeftIcon size={16} />
            Back
          </Button>
        </Flex>
      </Flex>
    );
  }

  return (
    <Flex
      direction="column"
      justify="center"
      align="center"
      flexGrow="1"
      gap="4"
      style={{
        background:
          "linear-gradient(180deg,var(--accent-2) 50%, var(--accent-4) 100%)",
      }}
      height="100%"
    >
      <Confetti
        width={window.innerWidth - 10}
        height={window.innerHeight - 10}
        recycle={false}
        colors={["#6550b9", "#c2b5f5", "#e1d9ff"]}
      />

      <Flex direction="column" align="center" gap="4" mt="-4">
        <Flex direction="column" align="center" gap="9">
          <Flex direction="column" align="center" gap="3">
            <Flex align="center" gap="2">
              <img src="./images/icon.png" width="38" />

              <CozyWatch
                style={{ marginBottom: "-4px" }}
                src="./images/cozywatch.svg"
                height="28"
                className="inverse-accent-text-shadow"
              />

            </Flex>
          </Flex>

          <Flex align="center" justify="center" gap="6">
            <Card>
              <Flex align="center" gap="2" direction="column">
                <Button
                  variant="soft"
                  size="2"
                  className="inverse-accent-text-shadow accent-shadow-low"
                  onClick={() => {
                    authenticate();
                  }}
                >
                  <MarkGithubIcon size={16} />
                  Authenticate using GitHub OAuth
                </Button>

                <Text size="1">Ideal for public repositories</Text>
              </Flex>
            </Card>

            <Card>
              <Flex align="center" gap="2" direction="column">
                <Button
                  variant="soft"
                  size="2"
                  className="inverse-accent-text-shadow accent-shadow-low"
                  color="indigo"
                  onClick={async () => {
                    setShowOtherOptions((state) => !state);
                  }}
                >
                  <MarkGithubIcon size={16} />
                  Authenticate using GitHub PAT
                </Button>

                <Text size="1">
                  For private repositories you can access
                </Text>
              </Flex>
            </Card>

            <Card>
              <Flex align="center" gap="2" direction="column">
                <Button
                  variant="soft"
                  size="2"
                  className="inverse-accent-text-shadow accent-shadow-low"
                  color="cyan"
                  onClick={() => {
                    authenticateGitHubApp();
                  }}
                >
                  <MarkGithubIcon size={16} />
                  Authenticate using GitHub App
                </Button>

                <Text size="1">
                  For organization repositories where the app is installed
                  and granted access
                </Text>
              </Flex>
            </Card>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
};
