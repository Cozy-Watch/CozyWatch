import { Badge } from "@radix-ui/themes";
import type { LicenseState } from "../../../mainProcess/licensing/licenseState.types";
import { getLicenseStatusLabel } from "./licenseStatus.utils";

interface Props {
  state?: LicenseState;
}

export const LicenseStatusBadge = ({ state }: Props) => {
  const color =
    state?.status === "commercial-active" ||
    state?.status === "lifetime-active"
      ? "green"
      : state?.status === "commercial-trial"
        ? "amber"
        : "gray";

  return (
    <Badge radius="full" color={color} variant="soft">
      {getLicenseStatusLabel(state)}
    </Badge>
  );
};
