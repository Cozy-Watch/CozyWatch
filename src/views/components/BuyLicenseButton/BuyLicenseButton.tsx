import { Button, ButtonProps } from "@radix-ui/themes";
import { useState } from "react";
import { useLicenseStatusQuery } from "../../api/useLicenseStatusQuery";
import { LicenseModal } from "../LicenseModal/LicenseModal";
import { isCommercialUseLicensed } from "../LicenseStatus/licenseStatus.utils";

interface Props extends ButtonProps {
  showImage: boolean;
}

export const BuyLicenseButton = (props: Props) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const licenseQueryInfo = useLicenseStatusQuery();

  if (isCommercialUseLicensed(licenseQueryInfo.data)) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        {...props}
        onClick={() => {
          setIsModalOpen(true);
        }}
      >
        Official distribution license
        {props.showImage && (
          <img src={`./images/armchair.png`} width="20" height="20" />
        )}
      </Button>

      <LicenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
