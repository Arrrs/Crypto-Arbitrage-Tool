/**
 * Helper to add CSRF token to fetch headers
 * Use this in admin/user pages that make mutation requests
 */
export function addCsrfToken(
  headers: Record<string, string>,
  csrfToken?: string | null
): Record<string, string> {
  if (csrfToken) {
    headers["x-csrf-token"] = csrfToken
  }
  return headers
}

/**
 * Helper to extract CSRF token from response headers
 * Use this when fetching data from GET endpoints
 */
export function extractCsrfToken(response: Response): string | null {
  return response.headers.get("x-csrf-token")
}
