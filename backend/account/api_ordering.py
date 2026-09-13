"""Apply a DRF-style ``ordering`` query param on APIView querysets."""

from __future__ import annotations

from django.db.models import QuerySet


def apply_api_ordering(
    qs: QuerySet,
    ordering_param: str | None,
    allowed: dict[str, str],
    default: list[str],
) -> QuerySet:
    """
    Map public field names to ORM ``order_by`` expressions.

    ``allowed`` keys are the tokens clients send (without a leading ``-``).
    Unknown tokens are ignored; if nothing valid remains, ``default`` is used.
    """
    if not ordering_param or not str(ordering_param).strip():
        return qs.order_by(*default)

    order_by: list[str] = []
    for raw in str(ordering_param).split(","):
        token = raw.strip()
        if not token:
            continue
        desc = token.startswith("-")
        field = token[1:] if desc else token
        mapped = allowed.get(field)
        if not mapped:
            continue
        order_by.append(f"-{mapped}" if desc else mapped)

    if not order_by:
        return qs.order_by(*default)
    return qs.order_by(*order_by)
