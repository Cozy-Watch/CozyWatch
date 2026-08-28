import { getMentions } from "../getMentions";
import {
  createEmptyCache,
  createSyntheticCacheFixture,
  createSyntheticComment,
  SYNTHETIC_REPOSITORY_NAME,
  SYNTHETIC_USERNAME,
} from "./mocks/syntheticCache.mock";

describe("getMentions", () => {
  it("returns the complete added comment and preserves its API fields", () => {
    const { comments, finalCache, initialCache } =
      createSyntheticCacheFixture();

    expect(
      getMentions({
        repositoryName: SYNTHETIC_REPOSITORY_NAME,
        initialCache,
        finalCache,
        username: SYNTHETIC_USERNAME,
      }),
    ).toStrictEqual({
      addedMentions: [comments.added],
      removedMentions: [],
    });
  });

  it("detects a removed mention while preserving the complete comment", () => {
    const { comments, finalCache, initialCache } =
      createSyntheticCacheFixture();
    finalCache.mentions[SYNTHETIC_REPOSITORY_NAME] = {
      "2": [comments.added, comments.prefixOnly],
    };

    expect(
      getMentions({
        repositoryName: SYNTHETIC_REPOSITORY_NAME,
        initialCache,
        finalCache,
        username: SYNTHETIC_USERNAME,
      }),
    ).toStrictEqual({
      addedMentions: [comments.added],
      removedMentions: [comments.existing],
    });
  });

  it.each([
    [`@${SYNTHETIC_USERNAME.toUpperCase()} please review`, true],
    [`please review @${SYNTHETIC_USERNAME}`, true],
    [`@${SYNTHETIC_USERNAME}-bot please review`, false],
    [`@${SYNTHETIC_USERNAME}_bot please review`, false],
    [`@${SYNTHETIC_USERNAME}2 please review`, false],
  ])("matches username boundaries in %p", (body, shouldMatch) => {
    const initialCache = createEmptyCache();
    const finalCache = createEmptyCache();
    finalCache.mentions[SYNTHETIC_REPOSITORY_NAME] = {
      "1": [
        createSyntheticComment({
          body,
          id: 500,
          pullNumber: "1",
        }),
      ],
    };

    const result = getMentions({
      repositoryName: SYNTHETIC_REPOSITORY_NAME,
      initialCache,
      finalCache,
      username: SYNTHETIC_USERNAME,
    });

    expect(result.addedMentions).toHaveLength(shouldMatch ? 1 : 0);
  });
});
