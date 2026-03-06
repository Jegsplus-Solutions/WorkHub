/**
 * Counts business days (Mon–Fri) between two dates, inclusive.
 */
export function calcBusinessDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  if (end < start) return 0;

  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const dow = current.getDay(); // 0=Sun, 6=Sat
    if (dow !== 0 && dow !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * Calculates total leave hours = businessDays × hoursPerDay.
 */
export function calcTotalLeaveHours(businessDays: number, hoursPerDay: number): number {
  if (businessDays <= 0 || hoursPerDay <= 0) return 0;
  return Math.round(businessDays * hoursPerDay * 100) / 100;
}
