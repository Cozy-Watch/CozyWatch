export const getWeekRange = (weekStart: string) => {
  const start = new Date(`${weekStart}T00:00:00`);
  if (Number.isNaN(start.getTime()) || start.getDay() !== 1) {
    throw new Error("A weekly recap must start on a Monday.");
  }

  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  return {
    start,
    end,
    weekEnd: toDateOnly(new Date(end.getTime() - 1)),
  };
};

const toDateOnly = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getLastCompletedWeekStart = (now = new Date()) => {
  const lastMonday = new Date(now);
  const daysSinceMonday = (now.getDay() + 6) % 7;
  lastMonday.setDate(now.getDate() - daysSinceMonday - 7);
  lastMonday.setHours(0, 0, 0, 0);
  return toDateOnly(lastMonday);
};

export const getPreviousWeekStart = (weekStart: string) => {
  const { start } = getWeekRange(weekStart);
  start.setDate(start.getDate() - 7);
  return toDateOnly(start);
};
