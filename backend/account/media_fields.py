from rest_framework import serializers

from account.media_access import build_signed_media_url


class SignedMediaUrlField(serializers.Field):
    """Serialize a FileField/ImageField value as a signed /media/ URL."""

    def to_representation(self, value):
        if not value:
            return None
        name = getattr(value, "name", None) or str(value)
        if not name:
            return None
        return build_signed_media_url(name)
