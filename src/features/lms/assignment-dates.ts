export const LMS_TIME_ZONE = "Asia/Jakarta";

export function getDeadlineDay(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: LMS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value instanceof Date ? value : new Date(value));
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function formatDeadline(value: string) {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat("id-ID", {
    timeZone: LMS_TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  return `${day}, ${formatDeadlineTime(value)} WIB`;
}

export function formatDeadlineTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: LMS_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

export function formatDeadlineDay(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: LMS_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}
