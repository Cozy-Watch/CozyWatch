import { DesktopIcon } from "@radix-ui/react-icons";
import { Badge, Button, Card, Flex, Heading, Text } from "@radix-ui/themes";
import type { LicenseState } from "../../../mainProcess/licensing/licenseState.types";
import { LicenseStatusBadge } from "./LicenseStatusBadge";
import { getTrialDaysRemaining } from "./licenseStatus.utils";

interface Props {
  state?: LicenseState;
  isPending: boolean;
  error?: string | null;
  onOpenLicenseModal: () => void;
  onPurchase: () => void;
  onDeactivate: () => void;
  onAcceptTransition: () => void;
  onValidate: () => void;
}
export const LicenseStatusCard = ({ state, isPending, error, onOpenLicenseModal, onPurchase, onDeactivate, onAcceptTransition, onValidate }: Props) => {
  const licensed = state?.status === "licensed";
  const community = state?.status === "community";
  const days = state ? getTrialDaysRemaining(state) : null;
  const description = community
    ? "All features are available in this community build."
    : licensed
      ? "Activated on this Mac. No expiry or renewal."
      : state?.status === "revoked"
        ? "This activation was revoked. Enter another key or contact purchase support. Your GitHub connection and data are safe."
        : state?.status === "trial-ended"
          ? "Monitoring and notifications are paused. Activate a license to continue. Your GitHub connection and data are safe."
          : state?.transitionPending
            ? "The official app is moving to a lifetime license. Start your free 30-day transition trial when you’re ready. Your current access stays available while you decide."
            : days !== null
              ? `${days} ${days === 1 ? "day" : "days"} remaining. Your trial ends ${new Date(state!.trialEndsAt!).toLocaleDateString()}.`
              : "Your 14-day trial starts when you connect GitHub. All features are included.";

  return (
    <Card className="settings-card license-card">
      <Flex direction="column" gap="4" p="2">
        <Flex align="center" justify="between" gap="3" wrap="wrap">
          <Heading size="4">{community ? "Community build" : licensed ? "Lifetime license" : "Your license"}</Heading>
          <LicenseStatusBadge state={state} />
        </Flex>
        <Text size="2" color="gray" style={{ maxWidth: "65ch", lineHeight: 1.6 }}>{description}</Text>
        {!community && !licensed && (
          <>
            {state?.transitionPending && (
              <Flex>
                <Button color="gray" variant="outline" disabled={isPending} onClick={onAcceptTransition}>Start my 30-day transition trial</Button>
              </Flex>
            )}
            <Flex direction="column" gap="3" pt="4" style={{ borderTop: "1px solid var(--gray-a5)" }}>
              <Flex gap="2" align="baseline" wrap="wrap">
                <Text size="3" weight="medium">$29 once</Text>
                <Text size="2" color="gray">Lifetime license · one person, two Macs</Text>
              </Flex>
              <Flex gap="3" wrap="wrap">
                <Button color="green" onClick={onPurchase}>Buy Cozy Watch</Button>
                <Button color="blue" variant="soft" disabled={isPending} onClick={onOpenLicenseModal}>Enter license key</Button>
              </Flex>
            </Flex>
          </>
        )}
        {licensed && (
          <Flex align="center" gap="3" wrap="wrap">
            <Flex align="center" gap="2"><DesktopIcon /><Badge color="green">Offline ready</Badge></Flex>
            <Button color="gray" variant="soft" disabled={isPending} onClick={onValidate}>Check activation</Button>
            <Button size="1" variant="ghost" color="gray" m="0" disabled={isPending} onClick={onDeactivate}>Deactivate this Mac</Button>
          </Flex>
        )}
        <details className="license-details">
          <summary>{community ? "About community builds" : "What’s included & license terms"}</summary>
          <Flex direction="column" gap="2" pt="3">
            <Text size="2" color="gray">{community ? "Community builds do not use the paid licensing or official update service. Source code is available under the MIT license." : "All features and future desktop updates, for personal and commercial use. One person on two Macs. Activate online once, then keep working offline. Future hosted services are sold separately."}</Text>
            {state?.transitionPending && <Text size="2" color="gray">Your transition trial begins when you choose Start trial. When it ends, a license is required for monitoring and notifications. Your accounts, preferences, and cached data stay in place.</Text>}
          </Flex>
        </details>
        {state?.legacyMigrationPending && <Text size="2" color="gray">Your existing paid access is protected. Contact support to confirm your lifetime migration and stop future renewals.</Text>}
        {state?.lastValidationError && <Text size="2" color="amber" role="status">{state.lastValidationError}</Text>}
        {error && <Text size="2" color="red" role="alert">{error}</Text>}
      </Flex>
    </Card>
  );
};
