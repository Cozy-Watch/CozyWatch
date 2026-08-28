import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Button, Callout, Flex } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import type { LicenseState } from "../../../mainProcess/licensing/licenseState.types";
import { shouldShowExpiryReminder } from "../../../mainProcess/licensing/licenseState.utils";

interface Props {
  state?: LicenseState;
  onManageLicense: () => void;
}

export const LicenseExpiryReminder = ({ state, onManageLicense }: Props) => {
  const [visible, setVisible] = useState(false);
  const [hasRecordedReminder, setHasRecordedReminder] = useState(false);

  useEffect(() => {
    if (!state || state.status !== "expired") {
      setVisible(false);
      setHasRecordedReminder(false);
      return;
    }

    if (!hasRecordedReminder && shouldShowExpiryReminder(state)) {
      setVisible(true);
      setHasRecordedReminder(true);
      void window.electronAPI.license
        .markExpiryReminderShown()
        .catch(() => undefined);
    }
  }, [hasRecordedReminder, state]);

  if (!visible) {
    return null;
  }

  return (
    <Callout.Root size="1" color="amber" mt="2">
      <Callout.Icon>
        <InfoCircledIcon />
      </Callout.Icon>
      <Callout.Text>
        <Flex align="center" gap="3" justify="between">
          CozyWatch is now for personal use only. All features remain available.
          <Button size="1" variant="soft" onClick={onManageLicense}>
            Manage license
          </Button>
        </Flex>
      </Callout.Text>
    </Callout.Root>
  );
};
