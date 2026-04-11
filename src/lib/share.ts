export async function shareResult(
  text: string
): Promise<"shared" | "copied"> {
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ text });
      return "shared";
    }
  } catch {
    // User cancelled or share failed, fall through to clipboard
  }

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return "copied";
    }
  } catch {
    // Clipboard write failed (e.g. no focus, permissions denied)
  }

  return "copied";
}
