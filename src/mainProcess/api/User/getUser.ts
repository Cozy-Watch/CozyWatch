import { User } from "src/mainProcess/safeStorage/safeStorage.types";
import { getData, storeData } from "../../safeStorage/safeStorage";
import { getGithubClient } from "../githubClient";
import Logger from "electron-log";

export const getUser = async (): Promise<User> => {
  Logger.info("[User] Fetching user details");
  const cachedData = await getData("user");

  if (cachedData) {
    return cachedData;
  }

  try {
    const octokit = await getGithubClient();

    const {
      data: { login, avatar_url: avatarUrl, name, id, company },
    } = await octokit.rest.users.getAuthenticated();

    const userData = { login, avatarUrl, name, id, company };

    Logger.info("[User] User details fetched successfully");
    await storeData({
      name: "user",
      data: userData,
    });

    return userData;
  } catch (error) {
    Logger.error("[User] Error fetching user details", error);
    throw error;
  }
};
