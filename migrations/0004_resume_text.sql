-- The resume PDF's text, so Sumit Context (the MCP server, docs/mcp.md) can search it.
--
-- The text is extracted in the admin's browser when a resume is uploaded, not in the Worker: on
-- the Workers free plan a request gets 10 ms of CPU, and parsing a PDF takes 20–100 ms. It is
-- saved in the same write as `resume_key`, and a write that changes the key without it clears it,
-- so the text can never describe a different file than the one being served.
ALTER TABLE site ADD COLUMN resume_text TEXT;
