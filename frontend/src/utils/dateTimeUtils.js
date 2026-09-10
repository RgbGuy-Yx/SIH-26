/**
 * High-Performance Date & Time Utilities
 * Eliminates garbage-collection pauses by using fast string parsing & lookup tables
 * instead of allocating short-lived Date objects in heavy render loops.
 */

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const MONTH_NAMES_UPPER = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
];

const WEEKDAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Small memo caches for formatted dates
const dateDisplayCache = new Map();
const dateHeaderCache = new Map();

/**
 * Format ISO date string (YYYY-MM-DD) to friendly format "Tue, 08 Sep 2026"
 * Fast string parsing without Date instantiation where possible
 */
export function formatDateDisplay(isoDateStr) {
  if (!isoDateStr) return '';
  const str = String(isoDateStr).trim();
  
  if (dateDisplayCache.has(str)) {
    return dateDisplayCache.get(str);
  }

  // Fast path for standard YYYY-MM-DD
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = match[1];
    const monthIdx = parseInt(match[2], 10) - 1;
    const day = match[3];

    if (monthIdx >= 0 && monthIdx < 12) {
      // Calculate day of week using Sakamoto's algorithm (zero object allocation)
      const y = parseInt(year, 10);
      const m = parseInt(match[2], 10);
      const d = parseInt(day, 10);
      const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
      const adjY = m < 3 ? y - 1 : y;
      const dayOfWeek = (adjY + Math.floor(adjY / 4) - Math.floor(adjY / 100) + Math.floor(adjY / 400) + t[m - 1] + d) % 7;
      const weekday = WEEKDAY_NAMES_SHORT[dayOfWeek];
      const month = MONTH_NAMES_SHORT[monthIdx];
      const formatted = `${weekday}, ${day} ${month} ${year}`;

      if (dateDisplayCache.size > 200) dateDisplayCache.clear();
      dateDisplayCache.set(str, formatted);
      return formatted;
    }
  }

  // Fallback
  try {
    const d = new Date(str.includes('T') ? str : `${str}T00:00:00`);
    if (!isNaN(d.getTime())) {
      const formatted = d.toLocaleDateString('en-US', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      if (dateDisplayCache.size > 200) dateDisplayCache.clear();
      dateDisplayCache.set(str, formatted);
      return formatted;
    }
  } catch {
    // Return raw string if parsing fails
  }

  return str;
}

/**
 * Format ISO date string to short header pill e.g. "8 SEPT"
 */
export function formatDateHeader(isoDateStr) {
  if (!isoDateStr) return '';
  const str = String(isoDateStr).trim();

  if (dateHeaderCache.has(str)) {
    return dateHeaderCache.get(str);
  }

  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const monthIdx = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    if (monthIdx >= 0 && monthIdx < 12) {
      const month = MONTH_NAMES_UPPER[monthIdx];
      const formatted = `${day} ${month}`;
      if (dateHeaderCache.size > 200) dateHeaderCache.clear();
      dateHeaderCache.set(str, formatted);
      return formatted;
    }
  }

  return str;
}

/**
 * Format duration minutes to "Xh Ym"
 */
export function formatDuration(duration) {
  if (!duration && duration !== 0) return '--';
  if (typeof duration === 'string' && (duration.includes('h') || duration.includes('m'))) {
    return duration;
  }
  const min = parseInt(duration, 10);
  if (isNaN(min)) return String(duration);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m ? `${m}m` : '0m'}`;
}

/**
 * Extracts and formats time string into 12-hour display format e.g. "12:35PM"
 * Zero-allocation string & regex parsing
 */
export function extractTimeDisplay(raw) {
  if (!raw && raw !== 0) return '';
  const str = String(raw).trim();

  // If already formatted with AM/PM
  if (str.toUpperCase().includes('AM') || str.toUpperCase().includes('PM')) {
    return str;
  }

  // If ISO string with T
  if (str.includes('T')) {
    const timePart = str.split('T')[1];
    if (timePart) {
      const parts = timePart.split(':');
      if (parts.length >= 2) {
        let h = parseInt(parts[0], 10);
        const m = parts[1].substring(0, 2);
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        h = h ? h : 12;
        return `${h}:${m}${ampm}`;
      }
    }
  }

  // If HH:MM or HH:MM:SS format
  const match = str.match(/(\d{1,2}):(\d{2})(:(\d{2}))?/);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[2];
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m}${ampm}`;
  }

  return str;
}

/**
 * Formats time with standard space before AM/PM e.g. "09:55 AM"
 */
export function formatTimeWithAmPm(raw) {
  const extracted = extractTimeDisplay(raw);
  if (!extracted) return '--';
  return extracted.replace(/([0-9])([AP]M)/i, '$1 $2');
}

/**
 * Computes projected expected arrival time by adding predicted delay minutes to scheduled time.
 */
export function calculateExpectedTime(schedTimeStr, delayMinutes) {
  if (!schedTimeStr || schedTimeStr === '--') return '--';
  const raw = String(schedTimeStr).trim();
  const isPm = raw.toUpperCase().includes('PM');
  const isAm = raw.toUpperCase().includes('AM');

  const match = raw.match(/(\d{1,2}):(\d{2})/);
  if (!match) return formatTimeWithAmPm(schedTimeStr);

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (isPm && hours < 12) hours += 12;
  if (isAm && hours === 12) hours = 0;

  const totalMinutes = (hours * 60 + minutes + Math.round(Number(delayMinutes) || 0)) % 1440;
  const positiveMinutes = totalMinutes < 0 ? totalMinutes + 1440 : totalMinutes;

  const expH = Math.floor(positiveMinutes / 60);
  const expM = positiveMinutes % 60;
  const ampm = expH >= 12 ? 'PM' : 'AM';
  let displayH = expH % 12;
  displayH = displayH ? displayH : 12;
  const displayHStr = displayH < 10 ? `0${displayH}` : `${displayH}`;
  const displayMStr = expM < 10 ? `0${expM}` : `${expM}`;
  return `${displayHStr}:${displayMStr} ${ampm}`;
}

export default {
  formatDateDisplay,
  formatDateHeader,
  formatDuration,
  extractTimeDisplay,
  formatTimeWithAmPm,
  calculateExpectedTime,
};

