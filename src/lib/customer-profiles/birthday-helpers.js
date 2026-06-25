export function calculateAgeAndCountdown(dobString, today = new Date()) {
  if (!dobString) {
    return {
      age: null,
      daysToBirthday: null,
      nextBirthdayDate: null,
    };
  }

  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) {
    return {
      age: null,
      daysToBirthday: null,
      nextBirthdayDate: null,
    };
  }

  const currentYear = today.getFullYear();
  const comparisonDate = new Date(today);
  comparisonDate.setHours(0, 0, 0, 0);

  let age = currentYear - birthDate.getFullYear();
  
  // Calculate next birthday date
  const nextBday = new Date(birthDate);
  nextBday.setFullYear(currentYear);
  nextBday.setHours(0, 0, 0, 0);

  // If next birthday is already past this year, set it to next year
  if (nextBday.getTime() < comparisonDate.getTime()) {
    nextBday.setFullYear(currentYear + 1);
  }

  // Calculate days remaining
  const diffTime = nextBday.getTime() - comparisonDate.getTime();
  const daysToBirthday = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Adjust age if birthday hasn't happened yet this calendar year
  const birthdateThisYear = new Date(birthDate);
  birthdateThisYear.setFullYear(currentYear);
  if (birthdateThisYear.getTime() > comparisonDate.getTime()) {
    age = age - 1;
  }

  return {
    age: age >= 0 ? age : 0,
    daysToBirthday,
    nextBirthdayDate: nextBday,
  };
}
