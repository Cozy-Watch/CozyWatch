import { getLicenseState } from "./licenseState";
import { canUseDesktop } from "./licenseState.utils";

export const assertMonitoringAllowed = async () => {
  if (!canUseDesktop(await getLicenseState())) {
    throw new Error(
      "GitHub monitoring is paused. Open Settings → License to activate Cozy Watch.",
    );
  }
};
