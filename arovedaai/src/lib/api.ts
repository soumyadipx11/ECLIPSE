export async function safeFetchJson<T = any>(url: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (netErr: any) {
    throw new Error(`Network request failed to ${url}: ${netErr.message || String(netErr)}`);
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const rawText = await response.text();
    if (response.status === 404) {
      throw new Error(
        `API endpoint not found (404). Please ensure the API route is configured on Vercel.`
      );
    }
    if (response.status >= 500) {
      throw new Error(
        `Server Error (${response.status}): ${rawText.slice(0, 100)}. Please verify GEMINI_API_KEY environment variable is configured in Vercel project settings.`
      );
    }
    throw new Error(
      `Unexpected response format (${response.status}): ${rawText.slice(0, 100)}`
    );
  }

  try {
    const data = await response.json();
    return data;
  } catch (jsonErr: any) {
    throw new Error(`Failed to parse server response as JSON: ${jsonErr.message}`);
  }
}
