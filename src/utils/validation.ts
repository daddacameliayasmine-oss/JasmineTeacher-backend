// Validations basiques utilisees aux frontieres de l'API.
// On garde du code natif pour eviter une dependance lourde (zod, yup...).

// Verifie qu'une chaine est un email a peu pres bien forme.
export const isEmail = (value: unknown): value is string => {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

// Verifie qu'une chaine respecte une longueur min/max.
export const isStringOfLength = (value: unknown, min: number, max: number): value is string => {
  return typeof value === "string" && value.length >= min && value.length <= max;
};
