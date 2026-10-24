import { Button, Flex, Heading, Spinner, Text } from "@radix-ui/themes";
import { useState, type ReactNode } from "react";
import { useLicenseStatusQuery } from "../../api/useLicenseStatusQuery";
import { LicenseModal } from "../LicenseModal/LicenseModal";
import {
  LICENSE_URL,
  PURCHASE_HELP_URL,
} from "../BuyLicenseButton/BuyLicenseButton.meta";

export const LicenseGate = ({ children }: { children: ReactNode }) => {
  const { data: state, isPending, error, refetch } = useLicenseStatusQuery();
  const [open, setOpen] = useState(false);
  if (isPending)
    return (
      <Flex align="center" justify="center" flexGrow="1">
        <Spinner />
      </Flex>
    );
  if (error)
    return (
      <Flex direction="column" gap="3" p="5">
        <Text>
          Unable to read your saved activation. Your data has been preserved.
        </Text>
        <Button onClick={() => void refetch()}>Try again</Button>
      </Flex>
    );
  if (state?.status !== "trial-ended" && state?.status !== "revoked")
    return <>{children}</>;
  return (
    <Flex
      className="license-gate"
      direction="column"
      align="center"
      justify="center"
      gap="4"
      p="5"
      flexGrow="1"
    >
      <img src="./images/icon.png" width="72" alt="" />
      <Heading size="7" align="center">
        {state.status === "revoked"
          ? "Let’s restore your license."
          : "Keep your flow going."}
      </Heading>
      <Text align="center" size="3" color="gray" style={{ maxWidth: 470 }}>
        {state.status === "revoked"
          ? "This activation is no longer valid. Enter another license key or contact purchase support."
          : "Your trial has ended. Activate Cozy Watch to resume GitHub monitoring and notifications."}
      </Text>
      <Text align="center" size="2" color="gray">
        Your account, preferences, and cached pull requests are safe.
      </Text>
      <Flex gap="3" wrap="wrap" justify="center">
        <Button
          onClick={() => window.electronAPI.openExternalLink(LICENSE_URL)}
        >
          Buy Cozy Watch · $29 once
        </Button>
        <Button variant="soft" onClick={() => setOpen(true)}>
          Enter license key
        </Button>
      </Flex>
      <Flex gap="3">
        <Button
          size="1"
          variant="ghost"
          onClick={() => window.electronAPI.openExternalLink(PURCHASE_HELP_URL)}
        >
          Purchase help
        </Button>
        <Button
          size="1"
          variant="ghost"
          color="gray"
          onClick={() => window.electronAPI.license.quit()}
        >
          Quit
        </Button>
      </Flex>
      <LicenseModal isOpen={open} onClose={() => setOpen(false)} />
    </Flex>
  );
};
