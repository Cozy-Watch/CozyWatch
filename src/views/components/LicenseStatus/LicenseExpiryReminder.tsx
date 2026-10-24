import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Button, Callout, Flex, Text } from "@radix-ui/themes";
import type { LicenseState } from "../../../mainProcess/licensing/licenseState.types";
import { getTrialDaysRemaining } from "./licenseStatus.utils";

export const LicenseExpiryReminder = ({
  state,
  onManageLicense,
}: {
  state?: LicenseState;
  onManageLicense: () => void;
}) => {
  if (!state || state.status !== "trial") return null;
  if (state.transitionPending) {
    return (
      <Flex
        className="license-transition-notice"
        role="note"
        aria-label="License update"
        align="center"
        justify="between"
        gap="3"
        wrap="wrap"
        mt="3"
        px="3"
        py="2"
        style={{ background: "var(--accent-a2)", border: "1px solid var(--gray-a4)", borderRadius: "var(--radius-2)" }}
      >
        <Flex align="center" gap="2" style={{ flex: "1 1 260px", minWidth: 0 }}>
          <InfoCircledIcon aria-hidden="true" style={{ flexShrink: 0, color: "var(--accent-11)" }} />
          <Text size="1" color="gray"><strong>New license terms.</strong> Your 30-day transition trial is ready.</Text>
        </Flex>
        <Button size="1" variant="ghost" color="gray" m="0" style={{ flexShrink: 0 }} aria-label="Review license terms and transition trial" onClick={onManageLicense}>
          Review terms
        </Button>
      </Flex>
    );
  }
  const days = getTrialDaysRemaining(state);
  if (days === null || days > 3) return null;
  return (
    <Callout.Root size="1" color="amber" mt="2">
      <Flex align="center" gap="3" justify="between" wrap="wrap">
        <Text size="2" style={{ flex: "1 1 260px" }}>
          Your full-feature trial ends in {days} {days === 1 ? "day" : "days"}. Keep your flow with a lifetime license.
        </Text>
        <Button size="1" variant="soft" style={{ flexShrink: 0 }} onClick={onManageLicense}>
          Manage license
        </Button>
      </Flex>
    </Callout.Root>
  );
};
