-- A project can now hold pending edits that the public site does not see.
--
-- `draft` is the validated column values of an in-progress edit, as JSON, keyed exactly like the
-- live columns beside it. Publishing copies them across and clears it. Nothing else reads this
-- column: `readContent` selects the live columns only, so a draft cannot reach /api/content even
-- though the row it lives on is published.
--
-- Only projects get this. The other content types are small enough that editing them is a single
-- deliberate save, and a second state to keep straight would cost more than it buys.
ALTER TABLE projects ADD COLUMN draft TEXT;
