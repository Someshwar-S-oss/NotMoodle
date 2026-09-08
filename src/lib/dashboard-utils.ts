export function getRelativeTimeBadge(timestart: number): {
  label: string;
  variant: "overdue" | "today" | "upcoming";
} {
  const now = Date.now();
  const targetMs = timestart * 1000;
  const diffMs = targetMs - now;

  if (diffMs < 0) {
    return { label: "Overdue", variant: "overdue" };
  }

  const nowDate = new Date(now);
  const targetDate = new Date(targetMs);

  const isSameCalendarDay =
    nowDate.getFullYear() === targetDate.getFullYear() &&
    nowDate.getMonth() === targetDate.getMonth() &&
    nowDate.getDate() === targetDate.getDate();

  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(nowDate.getDate() + 1);
  const isTomorrowCalendarDay =
    tomorrowDate.getFullYear() === targetDate.getFullYear() &&
    tomorrowDate.getMonth() === targetDate.getMonth() &&
    tomorrowDate.getDate() === targetDate.getDate();

  const diffHours = diffMs / (1000 * 60 * 60);
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  if (isSameCalendarDay) {
    if (diffHours < 1) {
      const mins = Math.max(1, diffMinutes);
      return { label: `Due in ${mins}m`, variant: "today" };
    }
    if (diffHours < 6) {
      const hours = Math.round(diffHours);
      return { label: `Due in ${hours}h`, variant: "today" };
    }
    const formattedTime = targetDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return { label: `Today ${formattedTime}`, variant: "today" };
  }

  if (isTomorrowCalendarDay) {
    return { label: "Tomorrow", variant: "today" };
  }

  // Days difference
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) {
    return { label: `In ${diffDays} days`, variant: "upcoming" };
  }

  const diffWeeks = Math.max(1, Math.round(diffDays / 7));
  return {
    label: diffWeeks === 1 ? "In 1 week" : `In ${diffWeeks} weeks`,
    variant: "upcoming",
  };
}

export function extractCourseDisplayName(rawName?: string): string {
  if (!rawName || rawName.trim().length === 0) return "Course";
  const trimmed = rawName.trim();

  // Sriher Moodle naming convention: e02-cyb23lu01-course name
  // If there are at least two hyphens, extract everything after the second hyphen.
  const hyphenParts = trimmed.split('-');
  if (hyphenParts.length >= 3) {
    const afterSecondHyphen = hyphenParts.slice(2).join('-').trim();
    if (afterSecondHyphen.length > 0) {
      return afterSecondHyphen;
    }
  }

  return trimmed;
}

export function extractCourseCode(shortname?: string, fullname?: string): string {
  // Check if either string follows the Sriher convention (e.g. e02-cyb23lu01-course or e02-cyb23lu01)
  for (const candidate of [shortname, fullname]) {
    if (candidate && candidate.includes('-')) {
      const parts = candidate.trim().split('-');
      if (parts.length >= 2 && parts[1].trim().length > 0) {
        return parts[1].trim().toUpperCase();
      }
    }
  }

  if (shortname && shortname.trim().length > 0) {
    const trimmed = shortname.trim();
    // If shortname is a clean code like CS101 or CS 101 or contains a match
    const codeMatch = trimmed.match(/^[A-Z0-9_-]{2,10}$/i) || trimmed.match(/[A-Za-z]{2,6}\s*\d{2,4}[A-Za-z]?/);
    if (codeMatch) return codeMatch[0].toUpperCase();
    if (trimmed.length <= 10) return trimmed.toUpperCase();
  }

  if (fullname) {
    const codeMatch = fullname.match(/[A-Za-z]{2,6}\s*\d{2,4}[A-Za-z]?/);
    if (codeMatch) return codeMatch[0].toUpperCase();
    // Or take first 2-3 words abbreviation or first word if alphanumeric
    const firstWord = fullname.split(/\s+/)[0];
    if (firstWord && firstWord.length <= 10) return firstWord.toUpperCase();
  }

  return "COURSE";
}

export const COURSE_ACCENT_COLORS = [
  { name: "Slate Blue", hex: "#4f46e5", bgClass: "bg-[#4f46e5]" },
  { name: "Sage", hex: "#059669", bgClass: "bg-[#059669]" },
  { name: "Terracotta", hex: "#ea580c", bgClass: "bg-[#ea580c]" },
  { name: "Plum", hex: "#9333ea", bgClass: "bg-[#9333ea]" },
  { name: "Amber", hex: "#d97706", bgClass: "bg-[#d97706]" },
];

export function getCourseAccent(courseId: number, index: number) {
  const hash = Math.abs(courseId || index);
  return COURSE_ACCENT_COLORS[hash % COURSE_ACCENT_COLORS.length];
}
