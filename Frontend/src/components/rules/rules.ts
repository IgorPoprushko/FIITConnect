export const rules = {
  required: (val: string) =>
    (val !== null && val !== undefined && val !== '') ||
    'This field is required',
  email: (val: string) => {
    if (!val) return 'Email is required';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || 'Invalid email address';
  },
  minLength:
    (min: number) =>
      (val: string) =>
        (val && val.length >= min) ||
        `Minimum length is ${min} characters`,
  sameAs:
    (otherValue: () => string, message = 'Passwords do not match') =>
      (val: string) =>
        val === otherValue() || message
}