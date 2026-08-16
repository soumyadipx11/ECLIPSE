/**
 * Recursively removes any keys with `undefined` values from an object or array.
 * Firestore throws errors when encountering `undefined` in any property.
 */
export function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as any;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined).filter((item) => item !== undefined) as any;
  }
  if (typeof obj === 'object') {
    const cleanObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj as Record<string, any>)) {
      if (value !== undefined) {
        cleanObj[key] = cleanUndefined(value);
      }
    }
    return cleanObj as T;
  }
  return obj;
}

/**
 * Sanitizes an error to ensure users never see raw stack traces, file paths,
 * code line numbers, or raw database connection errors.
 */
export function cleanUserErrorMessage(err: any, fallbackMessage: string = "An unexpected error occurred. Please try again."): string {
  if (!err) return fallbackMessage;

  const raw = typeof err === "string" ? err : err.message || String(err);

  // Friendly mapping for common Firebase / Auth errors
  if (raw.includes("invalid-credential") || raw.includes("wrong-password") || raw.includes("user-not-found")) {
    return "Incorrect password or email. Please check your credentials and try again.";
  }
  if (raw.includes("email-already-in-use")) {
    return "This email address is already registered. Please sign in instead.";
  }
  if (raw.includes("requires-recent-login")) {
    return "For security, this action requires a recent login. Please sign out and sign back in.";
  }
  if (raw.includes("too-many-requests")) {
    return "Too many failed attempts. Please wait a few minutes before trying again.";
  }
  if (raw.includes("weak-password")) {
    return "Password is too weak. Please use at least 8 characters with numbers and symbols.";
  }

  const isTechnicalLeak =
    raw.includes("at ") ||
    raw.includes("/var/") ||
    raw.includes("node_modules") ||
    raw.includes(".ts:") ||
    raw.includes(".js:") ||
    raw.includes("ECONNREFUSED") ||
    raw.includes("FirebaseError:") ||
    raw.includes("Firebase:") ||
    raw.includes("auth/") ||
    raw.includes("Firestore") ||
    raw.includes("SQL") ||
    raw.includes("file:///") ||
    raw.includes("SyntaxError") ||
    raw.includes("TypeError") ||
    raw.includes("ReferenceError") ||
    raw.length > 200;

  if (isTechnicalLeak) {
    return fallbackMessage;
  }

  return raw;
}
