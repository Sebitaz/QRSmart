import uuid

from django.conf import settings
from django.db import models


class Ticket(models.Model):
    class Status(models.TextChoices):
        VALIDO = "VALIDO", "Válido"
        USADO = "USADO", "Usado"
        ANULADO = "ANULADO", "Anulado"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(
        "events.Event", on_delete=models.PROTECT, related_name="tickets", verbose_name="evento"
    )
    holder = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="tickets",
        verbose_name="titular",
    )
    # valor que va codificado en el QR
    code = models.UUIDField("código QR", default=uuid.uuid4, unique=True, editable=False)
    status = models.CharField("estado", max_length=10, choices=Status.choices, default=Status.VALIDO)
    used_at = models.DateTimeField("usado el", null=True, blank=True)
    validated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="validated_tickets",
        verbose_name="validado por",
    )
    created_at = models.DateTimeField("creado", auto_now_add=True)

    class Meta:
        verbose_name = "ticket"
        verbose_name_plural = "tickets"
        ordering = ("-created_at",)
        constraints = [
            # un asistente solo puede tener una entrada activa por evento
            models.UniqueConstraint(
                fields=("event", "holder"),
                condition=~models.Q(status="ANULADO"),
                name="unique_active_ticket_per_holder",
            ),
        ]

    def __str__(self):
        return f"{self.code} - {self.event.name} ({self.status})"
