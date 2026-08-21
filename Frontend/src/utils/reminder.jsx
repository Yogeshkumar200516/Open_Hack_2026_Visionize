import axios from "axios";
import API_BASE_URL from "../Context/Api";
import { calculateDayDifference } from "./dateCalculation";

const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Fetch company subscription type (invoice | bill | both)
// Caches in sessionStorage so the Navbar poller (every 60s) doesn't hit
// /api/company/info on every single cycle — saves unnecessary DB load.
export const fetchCompanySubscriptionType = async () => {
  const SESSION_KEY = "billzen_subscription_type";

  // Return cached value if present — cleared automatically when browser session ends
  const cached = sessionStorage.getItem(SESSION_KEY);
  if (cached) return cached;

  try {
    const res = await axios.get(`${API_BASE_URL}/api/company/info`, {
      headers: getAuthHeaders(),
      timeout: 10000,
    });
    const type = res.data.subscription_type || "invoice";
    // Cache it for the session
    sessionStorage.setItem(SESSION_KEY, type);
    return type;
  } catch (err) {
    console.error("🔴 Error fetching company info:", err);
    return "invoice";
  }
};

// Fetch reminder data (overdue + reminders for today, 1 day, 2 days)
export const fetchReminderData = async () => {
  try {
    const subscriptionType = await fetchCompanySubscriptionType();

    let url = "";
    if (subscriptionType === "bill") {
      url = `${API_BASE_URL}/api/reminder/check-bill-reminder-status`;
    } else {
      url = `${API_BASE_URL}/api/reminder/check-reminder-status`;
    }

    const res = await axios.get(url, {
      headers: getAuthHeaders(),
      timeout: 10000,
    });
    const { reminders: rawReminders = [], overdues: rawOverdues = [] } = res.data;

    const recomputedReminders = [];
    const recomputedOverdues = [];

    [...rawReminders, ...rawOverdues].forEach((item) => {
      const dueDateField = item.dueDate || item.due_date;
      const { diffInDays } = calculateDayDifference(dueDateField);

      if (diffInDays < 0) {
        recomputedOverdues.push(item); // past due
      } else if (diffInDays <= 2 && diffInDays >= 0) {
        recomputedReminders.push(item); // today, 1 day, 2 days away
      }
    });

    return {
      reminders: recomputedReminders,
      overdues: recomputedOverdues,
      subscriptionType,
    };
  } catch (err) {
    console.error("🔴 Error fetching reminder data:", err);
    return { reminders: [], overdues: [], subscriptionType: "invoice" };
  }
};
