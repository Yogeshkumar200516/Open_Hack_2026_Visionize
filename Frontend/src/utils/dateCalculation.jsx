import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

/**
 * Calculates difference in days between today and a given due date.
 * Returns diffInDays, formattedDate (DD-MM-YYYY), and isOverdue boolean.
 */
export const calculateDayDifference = (dueDateStr) => {
  const today = dayjs().utc().startOf("day");
  const dueDate = dayjs.utc(dueDateStr).startOf("day");

  const diffInDays = dueDate.diff(today, "day"); // positive = due in future
  const formattedDate = dueDate.format("DD-MM-YYYY");
  const isOverdue = diffInDays < 0;
  return { diffInDays, formattedDate, isOverdue };
};
