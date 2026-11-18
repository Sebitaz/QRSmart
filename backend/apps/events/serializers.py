from django.utils import timezone
from rest_framework import serializers

from .models import Event

MAX_CAPACITY = 100_000


class EventSerializer(serializers.ModelSerializer):
    organizer = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = (
            "id", "name", "description", "location", "start_at", "end_at",
            "capacity", "current_occupancy", "status", "organizer", "created_at",
        )
        read_only_fields = ("id", "current_occupancy", "status", "organizer", "created_at")

    def get_organizer(self, obj):
        return {"id": obj.organizer_id, "full_name": obj.organizer.get_full_name()}

    def validate_name(self, value):
        value = value.strip()
        if len(value) < 3:
            raise serializers.ValidationError("El nombre debe tener al menos 3 caracteres.")
        return value

    def validate_location(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("El lugar es obligatorio.")
        return value

    def validate_capacity(self, value):
        if value < 1:
            raise serializers.ValidationError("La capacidad debe ser al menos 1 persona.")
        if value > MAX_CAPACITY:
            raise serializers.ValidationError(f"La capacidad no puede superar {MAX_CAPACITY:,} personas.")
        return value

    def validate_start_at(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("La fecha de inicio debe ser futura.")
        return value

    def validate(self, attrs):
        if attrs["end_at"] <= attrs["start_at"]:
            raise serializers.ValidationError({"end_at": "La fecha de fin debe ser posterior a la de inicio."})
        return attrs


class AvailableEventSerializer(serializers.ModelSerializer):
    organizer = serializers.CharField(source="organizer.get_full_name", read_only=True)
    tickets_available = serializers.SerializerMethodField()
    has_ticket = serializers.BooleanField(read_only=True)

    class Meta:
        model = Event
        fields = (
            "id", "name", "description", "location", "start_at", "end_at",
            "capacity", "tickets_available", "has_ticket", "status", "organizer",
        )
        read_only_fields = fields

    def get_tickets_available(self, obj) -> int:
        return max(obj.capacity - obj.tickets_sold, 0)
