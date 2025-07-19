import {
  format,
  parseISO,
  isToday,
  isYesterday,
  addDays,
  subDays,
  Locale,
} from "date-fns";
import { id } from "date-fns/locale";

export function formatDate(
  date: Date | string,
  formatStr: string = "dd MMMM yyyy",
  locale: Locale = id
): string {
  if (typeof date === "string") {
    date = parseISO(date);
  }
  return format(date, formatStr, { locale });
}

export function formatTime(
  date: Date | string,
  formatStr: string = "HH:mm",
  locale: Locale = id
): string {
  if (typeof date === "string") {
    date = parseISO(date);
  }
  return format(date, formatStr, { locale });
}

export function isDateToday(date: Date | string): boolean {
  if (typeof date === "string") {
    date = parseISO(date);
  }
  return isToday(date);
}

export function isDateYesterday(date: Date | string): boolean {
  if (typeof date === "string") {
    date = parseISO(date);
  }
  return isYesterday(date);
}

export function addDaysToDate(date: Date | string, days: number): Date {
  if (typeof date === "string") {
    date = parseISO(date);
  }
  return addDays(date, days);
}

export function subDaysFromDate(date: Date | string, days: number): Date {
  if (typeof date === "string") {
    date = parseISO(date);
  }
  return subDays(date, days);
}
