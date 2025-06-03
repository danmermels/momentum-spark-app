
import { format, differenceInDays, isToday, isThisMonth as dfnsIsThisMonth, parseISO, isValid, getDaysInMonth as dfnsGetDaysInMonth, isSameDay as dfnsIsSameDay } from 'date-fns';

export const formatDate = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) throw new Error("Invalid date string after parsing");
    return format(date, 'MMM d, yyyy');
  } catch (error) {
    // console.error("Error formatting date:", dateString, error);
    return "Invalid Date";
  }
};

export const getDaysUntilDueDate = (dueDateString: string): number => {
  try {
    const dueDate = parseISO(dueDateString);
    if (!isValid(dueDate)) throw new Error("Invalid due date string after parsing");
    const today = new Date();
    today.setHours(0,0,0,0);
    // Also normalize dueDate to avoid time-of-day issues if it was an ISO string with time
    const normalizedDueDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

    return Math.max(0, differenceInDays(normalizedDueDate, today));
  } catch (error) {
    // console.error("Error getting days until due date:", dueDateString, error);
    return Infinity;
  }
};

export const isTaskDueToday = (dueDateString: string): boolean => {
  try {
    const date = parseISO(dueDateString);
    if (!isValid(date)) return false;
    return isToday(date);
  } catch (error) {
    return false;
  }
};

export const isTaskDueThisMonth = (dueDateString: string): boolean => {
  try {
    const date = parseISO(dueDateString);
    if (!isValid(date)) return false;
    return dfnsIsThisMonth(date);
  } catch (error) {
    return false;
  }
};

// Utility to check if a Date object (not a string) is within the current month
export const isDateThisMonth = (date: Date): boolean => {
  try {
    if (!isValid(date)) return false;
    return dfnsIsThisMonth(date);
  } catch (error) {
    return false;
  }
};

export const getDaysInCurrentMonth = (): number => {
  try {
    return dfnsGetDaysInMonth(new Date());
  } catch (error) {
    return 30; // Fallback
  }
};

export const isSameDate = (date1: Date, date2: Date): boolean => {
    try {
        if (!isValid(date1) || !isValid(date2)) return false;
        return dfnsIsSameDay(date1, date2);
    } catch(error) {
        return false;
    }
};

    