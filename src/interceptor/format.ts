import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export function formatToKST(
  date: Date | string,
  formatStr = 'yyyy-MM-dd HH:mm:ss',
): string {
  const kstTimeZone = 'Asia/Seoul';
  const zonedDate = toZonedTime(new Date(date), kstTimeZone);
  return format(zonedDate, formatStr);
}
