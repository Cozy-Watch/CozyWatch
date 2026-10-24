import { repositoryKey } from "./repositoryKey";
it("distinguishes repositories with the same name and normalizes case", () => {
  expect(repositoryKey({ owner: "One", name: "API" })).toBe("one/api");
  expect(repositoryKey({ owner: { login: "Two" }, name: "api" })).toBe("two/api");
});
