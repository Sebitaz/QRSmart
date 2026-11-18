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


class TicketTransferSerializer(serializers.Serializer):
    email = serializers.EmailField(
        error_messages={
            "required": "Debes ingresar el correo electrónico del destinatario.",
            "blank": "El correo electrónico del destinatario no puede estar vacío.",
            "invalid": "Ingresa un correo electrónico válido.",
        }
    )


class TicketTransferResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()
    ticket_id = serializers.UUIDField()
    recipient_email = serializers.EmailField()



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
