export async function safeFetchJson<T = any>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();
    if (response.status === 404) {
      throw new Error(
        `API route not found (404). If deployed on Vercel, ensure GEMINI_API_KEY environment variable is set in Vercel project settings.`
      );
    }
    throw new Error(
      `Server returned unexpected response (${response.status}): ${text.slice(0, 120)}`
    );
  }

  const data = await response.json();
  return data;
}
