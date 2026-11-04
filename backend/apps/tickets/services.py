import uuid

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import APIException, NotFound, PermissionDenied, ValidationError

from apps.events.models import Event

from .models import Ticket

User = get_user_model()


class TicketNotAvailable(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "No es posible adquirir una entrada para este evento."


def acquire_ticket(user, event_id):
    with transaction.atomic():
        # se bloquea el evento para que dos compras al tiempo no pasen el aforo
        event = get_object_or_404(Event.objects.select_for_update(), pk=event_id)

        if event.status not in (Event.Status.PROGRAMADO, Event.Status.EN_CURSO):
            raise TicketNotAvailable("Este evento ya no está disponible.")
        if event.end_at <= timezone.now():
            raise TicketNotAvailable("Este evento ya terminó.")

        active = event.tickets.exclude(status=Ticket.Status.ANULADO)
        if active.filter(holder=user).exists():
            raise TicketNotAvailable("Ya tienes una entrada para este evento.")
        if active.count() >= event.capacity:
            raise TicketNotAvailable("Las entradas para este evento están agotadas.")

        try:
            return Ticket.objects.create(event=event, holder=user)
        except IntegrityError:
            raise TicketNotAvailable("Ya tienes una entrada para este evento.")


def transfer_ticket(user, ticket_id, recipient_email):
    """Transfiere atómicamente un ticket válido a otro usuario registrado (HU 2.3).

    Reasigna el titular (`holder`) y regenera el UUID del código QR (`code`)
    en una única transacción atómica con bloqueo de fila (`select_for_update`),
    invalidando cualquier captura previa del QR original.
    """
    normalized_email = (recipient_email or "").strip().lower()

    with transaction.atomic():
        ticket = get_object_or_404(
            Ticket.objects.select_for_update().select_related("event", "holder"),
            pk=ticket_id,
        )

        if ticket.holder_id != user.id:
            raise PermissionDenied("No eres el dueño actual de este ticket.")

        if ticket.status != Ticket.Status.VALIDO:
            raise ValidationError(
                {"detail": f"Solo se pueden transferir tickets válidos (estado actual: {ticket.get_status_display()})."}
            )

        if ticket.event.end_at <= timezone.now() or ticket.event.status == Event.Status.CANCELADO:
            raise ValidationError({"detail": "No es posible transferir entradas de un evento finalizado o cancelado."})

        recipient = User.objects.filter(email__iexact=normalized_email, is_active=True).first()
        if not recipient:
            raise NotFound("No existe ningún usuario registrado con ese correo electrónico.")

        if recipient.id == user.id:
            raise ValidationError({"email": ["No puedes transferir un ticket a tu propio correo electrónico."]})

        if getattr(recipient, "role", None) != User.Role.ASISTENTE:
            raise ValidationError(
                {"email": ["El destinatario debe estar registrado con rol de Asistente/Cliente."]}
            )

        if (
            Ticket.objects.exclude(status=Ticket.Status.ANULADO)
            .filter(event_id=ticket.event_id, holder=recipient)
            .exists()
        ):
            raise TicketNotAvailable("El usuario destinatario ya posee una entrada activa para este evento.")

        ticket.holder = recipient
        ticket.code = uuid.uuid4()
        try:
            ticket.save(update_fields=("holder", "code"))
        except IntegrityError:
            raise TicketNotAvailable("El usuario destinatario ya posee una entrada activa para este evento.")

        return ticket, recipient

