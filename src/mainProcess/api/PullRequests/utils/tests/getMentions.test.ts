import { getMentions } from "../getMentions";
import { CacheData } from "../getDefaultData";
import { finalPullRequestCache } from "./mocks/finalCache.mock";
import { initialPullRequestCache } from "./mocks/initialCache.mock";

const emptyCache = {
  etagPerRepo: {},
  pullRequestsPerRepo: {},
  reviewPerRepoPerPullNumber: {},
  actionsPerRepo: {},
  pullRequestAddedOrRemoved: { added: [], removed: [] },
  reviewUpdateList: { newReview: [], reviewChanged: [] },
  CIStatusUpdatePerRepo: {},
  mentions: {},
  flatPullRequests: [],
} as unknown as CacheData;

const makeComment = (id: number, body: string, pullNumber = "1") =>
  ({ id, body, pullNumber, created_at: "", updated_at: "" }) as CacheData["mentions"][string][string][0];

describe("getMentions", () => {
  it("matches @username case-insensitively", () => {
    const cache: CacheData = {
      ...emptyCache,
      mentions: { repo: { "1_1": [makeComment(1, "@Tiagotedsky LGTM")] } },
    };

    const { addedMentions } = getMentions({
      repositoryName: "repo",
      initialCache: emptyCache,
      finalCache: cache,
      username: "tiagotedsky",
    });

    expect(addedMentions).toHaveLength(1);
  });

  it("does not match a username that is a prefix of another handle", () => {
    const cache: CacheData = {
      ...emptyCache,
      mentions: { repo: { "1_1": [makeComment(2, "@tiagotedsky-bot check this")] } },
    };

    const { addedMentions } = getMentions({
      repositoryName: "repo",
      initialCache: emptyCache,
      finalCache: cache,
      username: "tiagotedsky",
    });

    expect(addedMentions).toHaveLength(0);
  });

  it("matches @username at end of string", () => {
    const cache: CacheData = {
      ...emptyCache,
      mentions: { repo: { "1_1": [makeComment(3, "hey @tiagotedsky")] } },
    };

    const { addedMentions } = getMentions({
      repositoryName: "repo",
      initialCache: emptyCache,
      finalCache: cache,
      username: "tiagotedsky",
    });

    expect(addedMentions).toHaveLength(1);
  });

  it("should correctly identify added and removed PRs ID", () => {
    const mentions = getMentions({
      repositoryName: "sportVote",
      initialCache: initialPullRequestCache,
      finalCache: finalPullRequestCache,
      username: "tiagotedsky",
    });

    expect(mentions).toStrictEqual({
      addedMentions: [
        {
          author_association: "COLLABORATOR",
          body: "és um sapo @tiagotedsky ",
          created_at: "2025-10-08T13:30:56Z",
          html_url:
            "https://github.com/sastromo/sportVote/pull/17#issuecomment-3381566467",
          id: 3381566467,
          issue_url:
            "https://api.github.com/repos/sastromo/sportVote/issues/17",
          node_id: "IC_kwDOLQNEhM7JjpwD",
          performed_via_github_app: null,
          pullNumber: "17",
          reactions: {
            "+1": 0,
            "-1": 0,
            confused: 0,
            eyes: 0,
            heart: 0,
            hooray: 0,
            laugh: 0,
            rocket: 0,
            total_count: 0,
            url: "https://api.github.com/repos/sastromo/sportVote/issues/comments/3381566467/reactions",
          },
          updated_at: "2025-10-08T13:30:56Z",
          url: "https://api.github.com/repos/sastromo/sportVote/issues/comments/3381566467",
          user: {
            avatar_url: "https://avatars.githubusercontent.com/u/45545544?v=4",
            events_url:
              "https://api.github.com/users/sastromo/events{/privacy}",
            followers_url: "https://api.github.com/users/sastromo/followers",
            following_url:
              "https://api.github.com/users/sastromo/following{/other_user}",
            gists_url: "https://api.github.com/users/sastromo/gists{/gist_id}",
            gravatar_id: "",
            html_url: "https://github.com/sastromo",
            id: 45545544,
            login: "sastromo",
            node_id: "MDQ6VXNlcjQ1NTQ1NTQ0",
            organizations_url: "https://api.github.com/users/sastromo/orgs",
            received_events_url:
              "https://api.github.com/users/sastromo/received_events",
            repos_url: "https://api.github.com/users/sastromo/repos",
            site_admin: false,
            starred_url:
              "https://api.github.com/users/sastromo/starred{/owner}{/repo}",
            subscriptions_url:
              "https://api.github.com/users/sastromo/subscriptions",
            type: "User",
            url: "https://api.github.com/users/sastromo",
            user_view_type: "public",
          },
        },
      ],
      removedMentions: [],
    });
  });
});
