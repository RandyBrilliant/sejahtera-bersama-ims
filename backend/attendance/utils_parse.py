"""Mengekstrak token badge (UUID) dari teks pemindaian mentah."""

from __future__ import annotations

import json
import re
import uuid

_UUID_RE = re.compile(
    r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}",
    re.ASCII,
)


def parse_badge_token(raw: str) -> uuid.UUID | None:
    """
    Mendukung: UUID lurus JSON `{"bid":"..."}`, atau substring UUID dalam string besar.
    """

    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None

    try:
        decoded = json.loads(s)
        if isinstance(decoded, dict) and "bid" in decoded:
            return uuid.UUID(str(decoded["bid"]))
    except (json.JSONDecodeError, ValueError, TypeError):
        pass

    try:
        return uuid.UUID(s)
    except ValueError:
        pass

    m = _UUID_RE.search(s)
    if m:
        try:
            return uuid.UUID(m.group(0))
        except ValueError:
            return None

    return None
