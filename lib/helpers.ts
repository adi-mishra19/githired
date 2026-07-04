// Helper functions for consistent UI across the app

export function getApplicationStatusBadge(status: string) {
  const badges: Record<string, { color: string; label: string }> = {
    pending: { 
      color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", 
      label: "Pending" 
    },
    oa: { 
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", 
      label: "OA Sent" 
    },
    interview: { 
      color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200", 
      label: "Interview" 
    },
    selected: { 
      color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", 
      label: "Selected" 
    },
    rejected: { 
      color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", 
      label: "Rejected" 
    },
  };

  const badge = badges[status] || badges.pending;
  return { ...badge, status };
}

export function formatCurrency(amount: string | number | null | undefined): string {
  if (!amount) return "Not specified";
  return `₹${amount}`;
}

export const APPLICATION_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "oa", label: "OA Sent" },
  { value: "interview", label: "Interview Scheduled" },
  { value: "selected", label: "Selected" },
  { value: "rejected", label: "Rejected" },
] as const;

