import { Badge } from "@radix-ui/themes";
import type { LicenseState } from "../../../mainProcess/licensing/licenseState.types";
import { getLicenseStatusLabel } from "./licenseStatus.utils";
export const LicenseStatusBadge = ({ state }: { state?: LicenseState }) => (
  <Badge
    color={
      state?.status === "licensed"
        ? "green"
        : state?.status === "revoked" || state?.status === "trial-ended"
          ? "amber"
          : "iris"
    }
    variant="soft"
  >
    {getLicenseStatusLabel(state)}
  </Badge>
);
