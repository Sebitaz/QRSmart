from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import APIException

from apps.events.models import Event

from .models import Ticket


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
