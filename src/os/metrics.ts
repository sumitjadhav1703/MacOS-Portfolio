/**
 * The two chrome heights the layout is built on.
 *
 * They also exist as `--s-menubar-h` / `--s-dock-h` in `src/styles/os.css`, which is what
 * every inline style should use. These constants are for the arithmetic that cannot read a
 * custom property: the reducer's snap maths and the window drag/resize clamps. Keep the two
 * in step — a mismatch shows up as a window tiled a few pixels under the dock.
 */
export const MENUBAR_H = 24

/** Dock slab: 8px from the bottom, 6/8 padding, 54px icons. */
export const DOCK_H = 82
