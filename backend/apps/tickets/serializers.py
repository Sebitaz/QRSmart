from rest_framework import serializers

from .models import Ticket


class TicketSerializer(serializers.ModelSerializer):
    event = serializers.SerializerMethodField()
    holder = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = ("id", "code", "status", "event", "holder", "used_at", "validated_by")
        read_only_fields = fields

    def get_event(self, obj):
        return {"id": obj.event_id, "name": obj.event.name}

    def get_holder(self, obj):
        return {"id": obj.holder_id, "full_name": obj.holder.get_full_name()}


class TicketValidationSerializer(serializers.Serializer):
    code = serializers.UUIDField()


class TicketPurchaseSerializer(serializers.Serializer):
    event = serializers.UUIDField()


class AttendeeTicketSerializer(serializers.ModelSerializer):
    event = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = ("id", "code", "status", "event", "used_at", "created_at")
        read_only_fields = fields

    def get_event(self, obj):
        event = obj.event
        return {
            "id": event.id,
            "name": event.name,
            "location": event.location,
            "start_at": event.start_at,
            "end_at": event.end_at,
        }


class PublicTicketSerializer(serializers.ModelSerializer):
    """Lo que ve cualquiera que escanee el QR: sin email ni ids internos."""

    status_display = serializers.CharField(source="get_status_display")
    event = serializers.SerializerMethodField()
    holder_name = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = ("code", "status", "status_display", "used_at", "event", "holder_name")
        read_only_fields = fields

    def get_event(self, obj):
        event = obj.event
        return {
            "name": event.name,
            "location": event.location,
            "start_at": event.start_at,
            "end_at": event.end_at,
            "status": event.status,
            "status_display": event.get_status_display(),
        }

    def get_holder_name(self, obj):
        # nombre abreviado: primer nombre + inicial del apellido ("Sebastián V.")
        first = obj.holder.first_name.split()[0] if obj.holder.first_name.strip() else ""
        last = obj.holder.last_name.strip()
        return f"{first} {last[0].upper()}." if last else first
