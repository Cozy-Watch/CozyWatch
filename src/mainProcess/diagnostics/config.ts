export const isDiagnosticsEnabled = ({
  isPackaged,
  isReleaseCandidateBuild,
}: {
  isPackaged: boolean;
  isReleaseCandidateBuild: boolean;
}) => !isPackaged || isReleaseCandidateBuild;
