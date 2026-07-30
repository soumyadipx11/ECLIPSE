export async function safeFetchJson<T = any>(url: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (netErr: any) {
    throw new Error(`Network request failed to ${url}: ${netErr.message || String(netErr)}`);
  }

  const rawText = await response.text();
  let data: any;

  try {
    data = JSON.parse(rawText);
  } catch (jsonErr) {
    // Response is not valid JSON (e.g. HTML error page from Vercel/proxy or Express fallback)
    const cleanText = rawText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const snippet = cleanText.length > 120 ? cleanText.slice(0, 120) + "..." : cleanText;

    if (response.status === 404) {
      throw new Error(`API route not found (404): ${snippet || "The requested endpoint does not exist."}`);
    }

    if (response.status >= 500) {
      throw new Error(
        `Server error (${response.status}): ${snippet || "A server error occurred"}. Please ensure GEMINI_API_KEY environment variable is set in production deployment settings.`
      );
    }

    throw new Error(`Unexpected server response (${response.status}): ${snippet || rawText.slice(0, 100)}`);
  }

  if (!response.ok || (data && data.success === false)) {
    const errorMsg = data?.error || data?.details || `Server returned error (${response.status})`;
    throw new Error(errorMsg);
  }

  return data;
}

