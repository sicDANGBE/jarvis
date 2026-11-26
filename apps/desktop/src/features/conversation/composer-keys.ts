import type { KeyboardEvent } from "react";

/**
 * Whether a key press sends the composer: the main Enter key, without Shift, outside an IME
 * composition. The numeric keypad's Enter adds a new line instead, like Shift+Enter (issue #27).
 */
export function isComposerSubmitKey(event: KeyboardEvent<HTMLElement>): boolean {
  return (
    event.key === "Enter" &&
    event.code !== "NumpadEnter" &&
    !event.shiftKey &&
    !event.nativeEvent.isComposing
  );
}
