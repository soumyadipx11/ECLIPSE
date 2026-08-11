export async function safeFetchJson<T = any>(url: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (netErr: any) {
    console.error("Network error during fetch to:", url, netErr);
    throw new Error("Network request failed. Please check your internet connection and try again.");
  }

  const rawText = await response.text();
  let data: any;

  try {
    data = JSON.parse(rawText);
  } catch (jsonErr) {
    console.error("Failed to parse JSON response from:", url, rawText);

    if (response.status === 404) {
      throw new Error("API route not found (404). Please try again.");
    }

    if (response.status >= 500) {
      throw new Error(`A server error occurred (${response.status}). Please try again in a few moments.`);
    }

    throw new Error(`Unexpected server response (${response.status}). Please try again.`);
  }

  if (!response.ok || (data && data.success === false)) {
    const rawError = data?.error || `Request failed (${response.status})`;
    // Ensure no stack traces or file paths leak
    const isLeak = typeof rawError === 'string' && (
      rawError.includes('at ') || 
      rawError.includes('/var/') || 
      rawError.includes('.ts:') || 
      rawError.includes('ECONNREFUSED')
    );
    const cleanError = isLeak ? "A server processing error occurred. Please try again." : rawError;
    throw new Error(cleanError);
  }

  return data;
}

