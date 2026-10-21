// Licensing test builds exercise the official flow without signing credentials or live keys.
export const isOfficialBuild = () =>
  (typeof __COZYWATCH_OFFICIAL_BUILD__ !== "undefined" &&
    __COZYWATCH_OFFICIAL_BUILD__) ||
  (typeof __COZYWATCH_LICENSE_TEST_MODE__ !== "undefined" &&
    __COZYWATCH_LICENSE_TEST_MODE__);
