import { useEffect, useState, useCallback } from "react";
import { fetchReminderData } from "./reminder";
import { calculateDayDifference } from "./dateCalculation";

const useReminderData = () => {
  const [reminders, setReminders] = useState([]);
  const [overdues, setOverdues] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);

      const { reminders: rawReminders = [], overdues: rawOverdues = [] } =
        await fetchReminderData();

      const recomputedReminders = [];
      const recomputedOverdues = [];

      // Normalize data and apply updated day rules
      [...rawReminders, ...rawOverdues].forEach((item) => {
        const dueDateField = item.dueDate || item.due_date;
        const { diffInDays } = calculateDayDifference(dueDateField);

        if (diffInDays < 0) {
          recomputedOverdues.push(item);
        } else if (diffInDays <= 2 && diffInDays >= 0) {
          recomputedReminders.push(item);
        }
      });

      setReminders(recomputedReminders);
      setOverdues(recomputedOverdues);
    } catch (err) {
      console.error("🔴 Failed to fetch reminder data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh(); // initial fetch
  }, [refresh]);

  const totalCount = reminders.length + overdues.length;

  return {
    reminders,
    overdues,
    totalCount,
    loading,
    refresh,
  };
};

export default useReminderData;
