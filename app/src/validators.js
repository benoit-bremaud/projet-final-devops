/**
 * Calculates the age in full years from a birth date.
 * @param {Date} birthDate - The birth date as a JavaScript Date object.
 * @returns {number} The age in full years.
 */
export function calculateAge(birthDate) {
  if (!(birthDate instanceof Date)) {
    throw new TypeError('birthDate must be a Date');
  }
  if (Number.isNaN(birthDate.getTime())) {
    throw new TypeError('birthDate is invalid');
  }
  const today = new Date();
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - birthDate.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < birthDate.getUTCDate())) {
    age--;
  }
  return age;
}

/**
 * Checks if the user is at least 18 years old.
 * @param {Date} birthDate - The birth date as a JavaScript Date object.
 * @returns {boolean} True if age is 18 or more.
 * @throws {Error} Delegates input validation to calculateAge.
 */
export function isAdult(birthDate) {
  return calculateAge(birthDate) >= 18;
}

/**
 * Minimum legal age accepted by the registration form.
 * @type {number}
 */
export const MIN_AGE = 18;

/**
 * Maximum plausible human age. Guards against aberrant birth dates such as
 * 0001-01-01, whose computed age (~2000+) would otherwise pass the adult check.
 * @type {number}
 */
export const MAX_AGE = 120;

/**
 * Checks if a birth date is plausible: the resulting age must be within
 * [MIN_AGE, MAX_AGE]. Rejects aberrant dates (e.g. 0001-01-01) and future
 * dates while delegating input validation to calculateAge.
 * @param {Date} birthDate - The birth date as a JavaScript Date object.
 * @returns {boolean} True if the age is between MIN_AGE and MAX_AGE inclusive.
 * @throws {Error} Delegates input validation to calculateAge.
 */
export function isPlausibleBirthDate(birthDate) {
  const age = calculateAge(birthDate);
  return age >= MIN_AGE && age <= MAX_AGE;
}

/**
 * Checks if a value is a valid name.
 * Accepts only letters (with accents), spaces, hyphens and apostrophes.
 * @param {string} value - The value to validate.
 * @returns {boolean} True if the value is a valid name.
 */
export function isValidName(value) {
  if (typeof value !== 'string') {
    return false;
  }
  return /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(value);
}

/**
 * Checks if a value is a valid French postal code (exactly 5 digits).
 * @param {string} value - The value to validate.
 * @returns {boolean} True if valid.
 */
export function isValidPostalCode(value) {
  if (typeof value !== 'string') {
    return false;
  }
  return /^\d{5}$/.test(value);
}

/**
 * Checks if a value is a valid email address (simple format).
 * @param {string} value - The value to validate.
 * @returns {boolean} True if valid.
 */
export function isValidEmail(value) {
  if (typeof value !== 'string') {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
