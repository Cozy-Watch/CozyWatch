import { State } from "./Reviews.meta";

export const getHumanState = (state: State) => {
  return state === "APPROVED"
    ? "Approved"
    : state === "CHANGES_REQUESTED"
      ? "Request Changes"
      : "Commented";
};
