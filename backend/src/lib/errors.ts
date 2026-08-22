/** Safely extracts a message from an unknown catch value — never throws itself, unlike a bare `(error as Error).message` cast. */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
