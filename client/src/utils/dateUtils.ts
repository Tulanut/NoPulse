/**
 * Date formatting helpers
 */

// Spelled month format: "30 August 2026" (for exercise summary view)
export const formatSpelledDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const mIndex = parseInt(m, 10) - 1;
  const monthName = monthNames[mIndex] || m;
  const dayNum = parseInt(d, 10);
  return `${dayNum} ${monthName} ${y}`;
};

// Standard logging format: "dd/mm/yy" (e.g. 31/08/26)
export const formatStandardDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  const shortYear = y.length === 4 ? y.slice(2) : y;
  const padDay = d.padStart(2, '0');
  const padMonth = m.padStart(2, '0');
  return `${padDay}/${padMonth}/${shortYear}`;
};
