export const parseWarrantyInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return parsed;
};

export const formatWarrantyPeriod = (years = 0, months = 0, days = 0) => {
  return `${parseWarrantyInt(years)}Y ${parseWarrantyInt(months)}M ${parseWarrantyInt(days)}D`;
};

const addMonthsToDate = (dateObj, monthsToAdd) => {
  const totalMonths = (dateObj.getMonth()) + monthsToAdd;
  const targetYear = dateObj.getFullYear() + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(dateObj.getDate(), lastDayOfTargetMonth);
  return new Date(targetYear, targetMonth, targetDay);
};

export const calculateExpiryDate = (
  implementationDate,
  years = 0,
  months = 0,
  days = 0
) => {
  if (!implementationDate) return "";

  const baseDate = new Date(`${implementationDate}T00:00:00`);
  if (Number.isNaN(baseDate.getTime())) return "";

  const safeYears = parseWarrantyInt(years);
  const safeMonths = parseWarrantyInt(months);
  const safeDays = parseWarrantyInt(days);

  const result = addMonthsToDate(baseDate, (safeYears * 12) + safeMonths);
  result.setDate(result.getDate() + safeDays);

  const year = result.getFullYear();
  const month = `${result.getMonth() + 1}`.padStart(2, "0");
  const day = `${result.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const isExpiryValid = (implementationDate, expiryDate) => {
  if (!implementationDate || !expiryDate) return true;
  return expiryDate >= implementationDate;
};
