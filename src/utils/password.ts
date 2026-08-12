export interface PasswordRequirements {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export interface PasswordScore {
  score: number; // 0 to 4
  label: 'Weak' | 'Fair' | 'Good' | 'Strong';
  color: string;
  requirements: PasswordRequirements;
  isValid: boolean;
}

export function evaluatePasswordStrength(password: string): PasswordScore {
  const requirements: PasswordRequirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  if (!password) {
    return {
      score: 0,
      label: 'Weak',
      color: 'bg-slate-300 dark:bg-slate-700',
      requirements,
      isValid: false,
    };
  }

  let metCount = 0;
  if (requirements.minLength) metCount++;
  if (requirements.hasUppercase) metCount++;
  if (requirements.hasLowercase) metCount++;
  if (requirements.hasNumber) metCount++;
  if (requirements.hasSpecialChar) metCount++;

  let score = 1;
  let label: 'Weak' | 'Fair' | 'Good' | 'Strong' = 'Weak';
  let color = 'bg-rose-500';

  if (metCount <= 2) {
    score = 1;
    label = 'Weak';
    color = 'bg-rose-500';
  } else if (metCount === 3) {
    score = 2;
    label = 'Fair';
    color = 'bg-amber-500';
  } else if (metCount === 4) {
    score = 3;
    label = 'Good';
    color = 'bg-blue-500';
  } else {
    score = 4;
    label = 'Strong';
    color = 'bg-emerald-500';
  }

  // All 5 rules (minLength, uppercase, lowercase, number, special char) are required to match Firebase mandatory policy
  const isValid =
    requirements.minLength &&
    requirements.hasUppercase &&
    requirements.hasLowercase &&
    requirements.hasNumber &&
    requirements.hasSpecialChar;

  return { score, label, color, requirements, isValid };
}
