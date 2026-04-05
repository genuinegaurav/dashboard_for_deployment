export const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,128}$/;
export const STRONG_PASSWORD_MESSAGE =
  'password must be 12-128 characters and include uppercase, lowercase, number, and special character';
