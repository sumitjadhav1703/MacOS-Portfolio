import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react'

/**
 * The props a div needs to behave like a button.
 *
 * The desktop is built from divs carrying `role="button"` and an `onClick`, which is a
 * mouse-only control: `role` alone puts nothing in the tab order and nothing answers Enter
 * or Space. axe does not flag it, which is why it passed the suite while the dock, the
 * traffic lights and every menu-bar extra were unreachable from the keyboard.
 *
 * Spread it rather than hand-writing the same four props per control:
 *
 *   <div {...pressable('Open Safari', open)} style={…} />
 *
 * `data-focusable` is what the Increase Contrast focus ring in os.css keys off.
 */
export function pressable(
  label: string,
  onPress: () => void,
  /** Stop the click from reaching the desk, which dismisses menus and popovers. */
  options?: { stopPropagation?: boolean },
) {
  const stop = options?.stopPropagation ?? false
  return {
    role: 'button' as const,
    tabIndex: 0,
    'aria-label': label,
    'data-focusable': '1',
    onClick: (e: ReactMouseEvent) => {
      if (stop) e.stopPropagation()
      onPress()
    },
    onKeyDown: (e: ReactKeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      if (stop) e.stopPropagation()
      onPress()
    },
  }
}
