import { CacheData, ExtendedComment } from "./getDefaultData";

interface Params {
  repositoryName: string;
  initialCache: CacheData;
  finalCache: CacheData;
  username: string;
}

export const getMentions = ({
  repositoryName,
  finalCache,
  initialCache,
  username,
}: Params) => {
  const intialMentionsList = Object.values(
    initialCache.mentions?.[repositoryName] || {}
  ).flat();

  const finalMentionsList = Object.values(
    finalCache.mentions?.[repositoryName] || {}
  ).flat();

  const initialMentions = intialMentionsList.reduce<ExtendedComment[]>(
    (acc, mention) => {
      if (new RegExp(`@${username}(?![a-zA-Z0-9_-])`, "i").test(mention.body ?? "")) {
        return [...acc, mention];
      }
      return acc;
    },
    [],
  );

  const finalMentions = finalMentionsList.reduce<ExtendedComment[]>(
    (acc, mention) => {
      if (new RegExp(`@${username}(?![a-zA-Z0-9_-])`, "i").test(mention.body ?? "")) {
        return [...acc, mention];
      }
      return acc;
    },
    [],
  );

  const initialIds = new Set(initialMentions.map((m) => m.id));
  const finalIds = new Set(finalMentions.map((m) => m.id));

  const addedMentions = finalMentions.filter(
    (mention) => !initialIds.has(mention.id)
  );

  const removedMentions = initialMentions.filter(
    (mention) => !finalIds.has(mention.id)
  );

  return {
    addedMentions,
    removedMentions,
  };
};
