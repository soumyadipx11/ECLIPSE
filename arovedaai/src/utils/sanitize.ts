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
