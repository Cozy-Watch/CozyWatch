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
  Code,
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

          <Text size="1" align="center" className="inverse-accent-text-shadow">
            GitHub uses the account signed in to your browser. Switch accounts
            in GitHub first if needed.
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
        <Flex
          direction="column"
          align="center"
          justify="center"
          gap="4"
          flexGrow="1"
        >
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

            <Text size="1" color="gray">
              Personal Access Token (PAT) Authentication
            </Text>
          </Flex>
          <Flex direction="column" gap="3" align="center">
            <Flex align="center" gap="2" flexGrow="1">
              <TextField.Root
                color="indigo"
                placeholder="Enter PAT"
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
              <Callout.Root variant="outline" color="blue">
                <Box width="370px">
                  <Callout.Text size="2" color="gray">
                    Classic PAT scopes:
                  </Callout.Text>

                  <Flex direction="column" gap="2" mt="2">
                    <Flex direction="column" gap="1">
                      <Box>
                        <Code>repo</Code>
                      </Box>
                    </Flex>
                    <Text size="1" color="gray">
                      Create an expiring token and revoke it at any time from
                      GitHub. Cozy Watch stores it securely on this device.
                    </Text>
                  </Flex>
                </Box>
              </Callout.Root>
            </Flex>
          </Flex>

          <Flex gap="4" align="center" mt="4" direction="column">
            <Button
              color="indigo"
              variant="soft"
              onClick={() => {
                window.electronAPI.openExternalLink(
                  "https://github.com/settings/tokens/new",
                );
              }}
            >
              Generate a new Personal Access Token (PAT)
              <LinkIcon size={12} />
            </Button>

            <Button
              size="1"
              variant="outline"
              color="gray"
              onClick={async () => {
                setShowOtherOptions((state) => !state);
              }}
            >
              <ArrowLeftIcon size={16} />
              Other Authentication Options
            </Button>
          </Flex>
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

            <Text size="1" color="gray">
              Login to GitHub to start monitoring your repositories
            </Text>
          </Flex>

          <Flex direction="column" align="center" justify="center" gap="6">
            <Flex align="center" gap="2" direction="column">
              <Button
                variant="soft"
                size="2"
                className="inverse-accent-text-shadow accent-shadow-low"
                onClick={() => {
                  authenticate();
                }}
                style={{ width: "280px" }}
              >
                <MarkGithubIcon size={16} />
                GitHub OAuth
              </Button>

              <Text size="1">
                For public repos and private repos available through OAuth
              </Text>
            </Flex>

            <Flex align="center" gap="2" direction="column">
              <Button
                variant="soft"
                size="2"
                className="inverse-accent-text-shadow accent-shadow-low"
                color="indigo"
                onClick={async () => {
                  setShowOtherOptions((state) => !state);
                }}
                style={{ width: "280px" }}
              >
                <MarkGithubIcon size={16} />
                Personal Access Token (PAT)
              </Button>

              <Text size="1">
                For private repos your account can already access
              </Text>
            </Flex>

            <Flex align="center" gap="2" direction="column">
              <Button
                variant="soft"
                size="2"
                className="inverse-accent-text-shadow accent-shadow-low"
                color="cyan"
                onClick={() => {
                  authenticateGitHubApp();
                }}
                style={{ width: "280px" }}
              >
                <MarkGithubIcon size={16} />
                GitHub App
              </Button>

              <Text size="1">
                For organization repos the GitHub App has access to
              </Text>
            </Flex>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
};
