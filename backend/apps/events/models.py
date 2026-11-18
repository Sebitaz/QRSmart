import uuid

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import F, Q


class Event(models.Model):
    class Status(models.TextChoices):
        PROGRAMADO = "PROGRAMADO", "Programado"
        EN_CURSO = "EN_CURSO", "En curso"
        FINALIZADO = "FINALIZADO", "Finalizado"
        CANCELADO = "CANCELADO", "Cancelado"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="events",
        verbose_name="organizador",
    )
    name = models.CharField("nombre", max_length=200)
    description = models.TextField("descripción", blank=True)
    location = models.CharField("lugar", max_length=255)
    start_at = models.DateTimeField("fecha y hora de inicio")
    end_at = models.DateTimeField("fecha y hora de fin")
    capacity = models.PositiveIntegerField("capacidad máxima", validators=[MinValueValidator(1)])
    current_occupancy = models.PositiveIntegerField("aforo actual", default=0)
    status = models.CharField("estado", max_length=20, choices=Status.choices, default=Status.PROGRAMADO)
    created_at = models.DateTimeField("creado", auto_now_add=True)
    updated_at = models.DateTimeField("actualizado", auto_now=True)

    class Meta:
        verbose_name = "evento"
        verbose_name_plural = "eventos"
        ordering = ("start_at",)
        constraints = [
            models.CheckConstraint(condition=Q(end_at__gt=F("start_at")), name="event_end_after_start"),
            models.CheckConstraint(condition=Q(capacity__gte=1), name="event_capacity_positive"),
            models.CheckConstraint(
                condition=Q(current_occupancy__lte=F("capacity")), name="event_occupancy_within_capacity"
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.start_at:%Y-%m-%d})"
