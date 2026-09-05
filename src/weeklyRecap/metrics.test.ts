import {
  getLastCompletedWeekStart,
  getPreviousWeekStart,
  getWeekRange,
} from "./metrics";

describe("weekly recap metrics", () => {
  it("requires Monday starts", () => {
    expect(() => getWeekRange("2026-08-25")).toThrow("Monday");
  });

  it("returns the Sunday closing the week", () => {
    expect(getWeekRange("2026-08-24").weekEnd).toBe("2026-08-30");
  });

  it("uses the last completed Monday-Sunday week", () => {
    expect(getLastCompletedWeekStart(new Date("2026-09-05T23:00:00"))).toBe(
      "2026-08-24",
    );
    expect(getLastCompletedWeekStart(new Date("2026-09-07T00:30:00"))).toBe(
      "2026-08-31",
    );
  });

  it("navigates previous weeks as local calendar Mondays", () => {
    expect(getPreviousWeekStart("2026-08-24")).toBe("2026-08-17");
  });
});
