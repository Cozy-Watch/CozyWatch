import {
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
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
  Heading,
  Text,
  TextField,
} from "@radix-ui/themes";
import Logger from "electron-log";
import { useState } from "react";
import { WhiteCozyWatch } from "../../components/SVG/WhiteCozyWatch";
import { AuthenticationNotice } from "../../components/AuthenticationNotice/AuthenticationNotice";
import { CozyWatch } from "../../components/SVG/CozyWatch";
import { useLicenseStatusQuery } from "../../api/useLicenseStatusQuery";
import { usePATauthenticationMutation } from "./api/usePATauthenticationMutation";
import { useAuthentication } from "./useGithubAuthentication";

export const GithubAuthentication = () => {
  const { data: licenseState } = useLicenseStatusQuery();
  const [showOtherOptions, setShowOtherOptions] = useState(false);
  const [patValue, setPatValue] = useState("");
  const [copyResult, setCopyResult] = useState<{ code: string; status: "copied" | "failed" } | null>(null);

  const { error, mutateAsync } = usePATauthenticationMutation();

  const {
    data: { authData, isPending: connecting, error: connectionError },
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
            Copy this code, then paste it on the GitHub authentication page to
            finish connecting.
          </Text>

          <Text size="1" align="center" className="inverse-accent-text-shadow">
            GitHub uses the account signed in to your browser. Switch accounts
            in GitHub first if needed.
          </Text>

          <Card>
            <Flex align="center" justify="center" gap="4" wrap="wrap">
              <Text size="8" weight="bold" color="iris" align="center" aria-label="GitHub authentication code" style={{ userSelect: "all" }}>
                {authData.user_code}
              </Text>
              <Button
                variant="soft"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(authData.user_code);
                    setCopyResult({ code: authData.user_code, status: "copied" });
                  } catch {
                    setCopyResult({ code: authData.user_code, status: "failed" });
                  }
                }}
              >
                {copyResult?.code === authData.user_code && copyResult.status === "copied" ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                {copyResult?.code === authData.user_code && copyResult.status === "copied" ? "Copied" : "Copy code"}
              </Button>
            </Flex>
          </Card>
          {copyResult?.code === authData.user_code && copyResult.status === "failed" && (
            <Text role="alert" size="2" color="red">Couldn’t copy. Select the code and copy it manually.</Text>
          )}
          {copyResult?.code === authData.user_code && copyResult.status === "copied" && (
            <Text role="status" size="2">Code copied. Paste it on GitHub to continue.</Text>
          )}

          <Flex direction="column" gap="1">
            <Button
              variant="soft"
              className="inverse-accent-text-shadow"
              onClick={() => {
                window.electronAPI.openExternalLink(authData.verification_uri);
              }}
              size="1"
            >
              Open GitHub authentication page
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
              <img src="./images/icon.png" width="38" alt="" />

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

            <AuthenticationNotice />
          {connectionError && <Text role="alert" size="2" color="red" align="center">{connectionError}</Text>}

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
    <Flex className="welcome-screen" direction="column" align="center" justify="center" height="100%" p="5" style={{ overflowY: "auto" }}>
      <Flex direction="column" align="center" gap="4" style={{ width: "100%", maxWidth: 440, flexShrink: 0 }}>
        <Flex className="welcome-brand-icon" align="center" justify="center" aria-hidden="true">
          <WhiteCozyWatch width="44" height="44" />
        </Flex>
        <Flex direction="column" align="center" gap="3">
          <Text size="2" weight="medium" color="gray">Cozy Watch</Text>
          <Heading size="8" align="center" style={{ letterSpacing: "-0.035em", lineHeight: 1.15 }}>
            Your pull requests.<br />A little less noise.
          </Heading>
          <Text size="3" color="gray" align="center" style={{ maxWidth: 350, lineHeight: 1.6 }}>
            See what needs you, right from your Mac menu bar.
          </Text>
        </Flex>
        <AuthenticationNotice />
          {connectionError && <Text role="alert" size="2" color="red" align="center">{connectionError}</Text>}
        <Flex direction="column" gap="4" pt="2" width="100%" style={{ maxWidth: 360 }}>
          <Flex direction="column" align="center" gap="2">
            <Button size="3" loading={connecting} onClick={() => authenticate()} style={{ width: "100%" }}>
              <MarkGithubIcon size={18} />Connect GitHub
            </Button>
            <Text size="1" color="gray" align="center">Sign in through your browser. Best for most users.</Text>
          </Flex>
          <Flex direction="column" align="center" gap="2">
            <Button size="3" disabled={connecting} color="gray" variant="soft" onClick={() => setShowOtherOptions(true)} style={{ width: "100%" }}>
              <KeyIcon size={18} />Use a personal access token
            </Button>
            <Text size="1" color="gray" align="center">Connect with a token you create on GitHub.</Text>
          </Flex>
          <Flex direction="column" align="center" gap="2">
            <Button size="3" disabled={connecting} color="gray" variant="soft" onClick={() => authenticateGitHubApp()} style={{ width: "100%" }}>
              <MarkGithubIcon size={18} />Connect with GitHub App
            </Button>
            <Text size="1" color="gray" align="center">For organizations using GitHub Apps. May need admin approval.</Text>
          </Flex>
        </Flex>
        {licenseState?.status === "unconfigured" && (
          <Flex direction="column" align="center" gap="1" pt="2">
            <Text size="1" color="gray" align="center">14 days free · All features · No payment details</Text>
            <Text size="1" color="gray" align="center">Your trial starts after GitHub connects.</Text>
          </Flex>
        )}
      </Flex>
    </Flex>
  );
};
