import { Button, Card, Flex, Text } from "@radix-ui/themes";
import type { LicenseState } from "../../../mainProcess/licensing/licenseState.types";
import { LicenseStatusBadge } from "./LicenseStatusBadge";
import {
  getTrialDaysRemaining,
  hasStartedCommercialTrial,
} from "./licenseStatus.utils";

interface Props {
  state?: LicenseState;
  isPending: boolean;
  error?: string | null;
  onChoosePersonalUse: () => void;
  onStartCommercialTrial: () => void;
  onOpenLicenseModal: () => void;
  onDeactivate: () => void;
}

export const LicenseStatusCard = ({
  state,
  isPending,
  error,
  onChoosePersonalUse,
  onStartCommercialTrial,
  onOpenLicenseModal,
  onDeactivate,
}: Props) => {
  const trialDaysRemaining = state ? getTrialDaysRemaining(state) : null;
  const canStartTrial = state ? !hasStartedCommercialTrial(state) : false;

  const description = (() => {
    switch (state?.status) {
      case "commercial-trial":
        return `${trialDaysRemaining ?? 0} day${trialDaysRemaining === 1 ? "" : "s"} left in your commercial trial.`;
      case "commercial-active":
        return state.licenseExpiresAt
          ? `Commercial use is licensed until ${new Date(state.licenseExpiresAt).toLocaleDateString()}.`
          : "Commercial use is licensed.";
      case "lifetime-active":
        return "Commercial use is licensed permanently.";
      case "expired":
        return "Your commercial trial or subscription has ended. All features remain available for personal use.";
      case "invalid":
        return "This license needs attention. All features remain available for personal use.";
      case "personal":
        return "All features are free for personal use.";
      case "unconfigured":
      default:
        return "Choose personal use or start a 30-day commercial trial.";
    }
  })();

  return (
    <Card>
      <Flex direction="column" gap="3">
        <Flex align="center" justify="between" gap="3">
          <Text weight="medium">License</Text>
          <LicenseStatusBadge state={state} />
        </Flex>

        <Text size="2" weight="light">
          {description}
        </Text>

        {error && (
          <Text size="2" color="red">
            {error}
          </Text>
        )}

        <Flex align="center" gap="2">
          {state?.status === "unconfigured" && (
            <>
              <Button
                size="1"
                variant="soft"
                disabled={isPending}
                onClick={onChoosePersonalUse}
              >
                Personal use
              </Button>

              <Button
                size="1"
                disabled={isPending}
                onClick={onStartCommercialTrial}
              >
                Start 30-day commercial trial
              </Button>
            </>
          )}

          {state?.status === "personal" && canStartTrial && (
            <Button
              size="1"
              disabled={isPending}
              onClick={onStartCommercialTrial}
            >
              Start 30-day commercial trial
            </Button>
          )}

          {!state ||
          state.status === "personal" ||
          state.status === "expired" ||
          state.status === "invalid" ? (
            <Button
              size="1"
              variant="outline"
              disabled={isPending}
              onClick={onOpenLicenseModal}
            >
              Enter or buy a commercial license
            </Button>
          ) : null}

          {state?.status === "commercial-trial" && (
            <>
              <Button size="1" onClick={onOpenLicenseModal}>
                Enter license key
              </Button>

              <Button
                size="1"
                variant="outline"
                disabled={isPending}
                onClick={onChoosePersonalUse}
              >
                Use personally instead
              </Button>
            </>
          )}

          {(state?.status === "commercial-active" ||
            state?.status === "lifetime-active") && (
            <Button
              size="1"
              color="red"
              variant="soft"
              disabled={isPending}
              onClick={onDeactivate}
            >
              Deactivate this Mac
            </Button>
          )}
        </Flex>
      </Flex>
    </Card>
  );
};
