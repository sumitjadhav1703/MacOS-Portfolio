"""The Worker boundary. Decode, delegate, encode.

This Worker is not publicly routed — `workers_dev` is off and it has no route — so its only
caller is the service binding on `sumitos-api`, which has already checked the origin and spent
the visitor's rate-limit budget. What it does *not* have is a D1 binding: the published
portfolio arrives in the request body, which is what makes it structurally impossible for a
visitor's question to reach an unpublished row.
"""

import json

from workers import Response, WorkerEntrypoint

from api import handle
from config import from_env
from providers.workers_ai import WorkersAI


class Default(WorkerEntrypoint):
    async def fetch(self, request):
        if request.method != "POST":
            return Response.json({"error": "Method not allowed."}, status=405)

        try:
            body = await request.json()
        except Exception:  # noqa: BLE001 — malformed JSON is the only thing this can be
            return Response.json({"error": "Invalid request."}, status=400)

        # `content` is the caller's field and `message` is the visitor's. Separating them here
        # means the size and shape rules meant for a question are never applied to a portfolio.
        content = body.pop("content", None) if isinstance(body, dict) else None

        try:
            status, payload = await handle(body, content, WorkersAI(self.env, from_env(self.env)))
        except Exception as error:  # noqa: BLE001
            # Nothing unexpected may reach the client as itself. An uncaught Python exception is
            # returned by the runtime as a full traceback with source paths in the body, which is
            # exactly the internal detail this endpoint must never emit. Only the type is logged.
            print(json.dumps({"event": "ask.unhandled", "error": type(error).__name__}))
            return Response.json({"error": "The assistant is unavailable."}, status=500)

        return Response.json(payload, status=status)
