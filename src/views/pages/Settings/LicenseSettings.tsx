import { Button, Card, Flex, Text } from "@radix-ui/themes";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LicenseModal } from "../../components/LicenseModal/LicenseModal";
import { LicenseStatusCard } from "../../components/LicenseStatus/LicenseStatusCard";
import {
  licenseStatusQueryKey,
  useLicenseStatusQuery,
} from "../../api/useLicenseStatusQuery";
import {
  LICENSE_URL,
  PURCHASE_HELP_URL,
  CUSTOMER_ORDERS_URL,
  OPEN_SOURCE_CONTACT_URL,
} from "../../components/BuyLicenseButton/BuyLicenseButton.meta";
import { SettingsSection } from "./SettingsSection";

export const LicenseSettings = () => {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const openLink = async (url: string) => {
    setLinkError(null);
    try {
      await window.electronAPI.openExternalLink(url);
    } catch {
      setLinkError("Couldn’t open the link. Check your default browser or email app. You can also email tiago@cozywatch.com directly.");
    }
  };
  const { data: state, isPending, error: queryError } = useLicenseStatusQuery();
  const client = useQueryClient();
  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    setPending(true);
    try {
      await action();
      await client.invalidateQueries({ queryKey: licenseStatusQueryKey });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to update your license. Please try again.",
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <SettingsSection>
      <LicenseStatusCard
        state={state}
        isPending={isPending || pending}
        error={error ?? queryError?.message}
        onOpenLicenseModal={() => setOpen(true)}
        onPurchase={() => void openLink(LICENSE_URL)}
        onAcceptTransition={() =>
          void run(() => window.electronAPI.license.acceptTransition())
        }
        onValidate={() => void run(() => window.electronAPI.license.validate())}
        onDeactivate={() => {
          if (
            window.confirm(
              "Deactivate this Mac? You can then activate your license on another Mac. Your GitHub connection and saved preferences will stay here.",
            )
          )
            void run(() => window.electronAPI.license.deactivate());
        }}
      />
      {state?.status !== "community" && (
        <Flex gap="4" px="2" align="center" wrap="wrap">
          <Button
            variant="ghost"
            color="gray"
            size="2"
            onClick={() =>
              void openLink(CUSTOMER_ORDERS_URL)
            }
          >
            Find my purchase
          </Button>
          <Button
            variant="ghost"
            color="gray"
            size="2"
            onClick={() =>
              void openLink(PURCHASE_HELP_URL)
            }
          >
            Purchase help
          </Button>
        </Flex>
      )}
      {linkError && <Text role="alert" size="2" color="red">{linkError}</Text>}
      <Card className="settings-card">
        <Flex direction="column" align="start" gap="3" p="2">
          <Text size="3" weight="medium">Working on open-source projects?</Text>
          <Text size="2" color="gray">Send me an email. Let’s talk about using Cozy Watch for your project.</Text>
          <Button variant="soft" color="gray" size="2" onClick={() => void openLink(OPEN_SOURCE_CONTACT_URL)}>
            tiago@cozywatch.com
          </Button>
        </Flex>
      </Card>
      <LicenseModal isOpen={open} onClose={() => setOpen(false)} />
    </SettingsSection>
  );
};
