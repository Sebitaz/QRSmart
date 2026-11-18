from django.db import transaction
from django.db.models import F
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAsistente, IsOrganizadorOrLogistica
from apps.events.models import Event

from .models import Ticket
from .serializers import (
    AttendeeTicketSerializer,
    TicketPurchaseSerializer,
    TicketSerializer,
    TicketTransferResponseSerializer,
    TicketTransferSerializer,
    TicketValidationSerializer,
)
from .services import acquire_ticket, transfer_ticket


class TicketValidateView(APIView):
    """Marca como USADO el ticket cuyo QR se escaneó.

    HU 4.3: solo ORGANIZADOR o LOGISTICA. Los permisos se evalúan antes de
    tocar la BD, así que un asistente recibe 403 sin revelar si el código existe.
    """

    permission_classes = (IsOrganizadorOrLogistica,)

    @extend_schema(request=TicketValidationSerializer, responses=TicketSerializer)
    def post(self, request):
        serializer = TicketValidationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            # bloqueo para que dos escaneos simultáneos no validen el mismo ticket
            ticket = get_object_or_404(
                Ticket.objects.select_for_update().select_related("event", "holder"),
                code=serializer.validated_data["code"],
            )
            if ticket.status != Ticket.Status.VALIDO:
                return Response(
                    {"detail": f"El ticket no es válido (estado: {ticket.get_status_display()})."},
                    status=status.HTTP_409_CONFLICT,
                )

            event = Event.objects.select_for_update().get(pk=ticket.event_id)
            if event.current_occupancy >= event.capacity:
                return Response(
                    {"detail": "El evento ya alcanzó su aforo máximo."},
                    status=status.HTTP_409_CONFLICT,
                )

            ticket.status = Ticket.Status.USADO
            ticket.used_at = timezone.now()
            ticket.validated_by = request.user
            ticket.save(update_fields=("status", "used_at", "validated_by"))

            event.current_occupancy = F("current_occupancy") + 1
            event.save(update_fields=("current_occupancy", "updated_at"))

        return Response(TicketSerializer(ticket).data, status=status.HTTP_200_OK)


class TicketListCreateView(generics.ListAPIView):
    # GET: entradas del asistente, POST: adquirir una entrada
    permission_classes = (IsAsistente,)
    serializer_class = AttendeeTicketSerializer

    def get_queryset(self):
        return Ticket.objects.filter(holder=self.request.user).select_related("event")

    @extend_schema(request=TicketPurchaseSerializer, responses={201: AttendeeTicketSerializer})
    def post(self, request):
        serializer = TicketPurchaseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket = acquire_ticket(request.user, serializer.validated_data["event"])
        return Response(AttendeeTicketSerializer(ticket).data, status=status.HTTP_201_CREATED)


class TicketDetailView(generics.RetrieveAPIView):
    permission_classes = (IsAsistente,)
    serializer_class = AttendeeTicketSerializer

    def get_queryset(self):
        return Ticket.objects.filter(holder=self.request.user).select_related("event")


class TicketTransferView(APIView):
    """Transfiere un ticket válido a otro usuario registrado mediante su email (HU 2.3)."""

    permission_classes = (IsAsistente,)

    @extend_schema(
        request=TicketTransferSerializer,
        responses={200: TicketTransferResponseSerializer},
    )
    def post(self, request, pk):
        serializer = TicketTransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ticket, recipient = transfer_ticket(
            user=request.user,
            ticket_id=pk,
            recipient_email=serializer.validated_data["email"],
        )

        return Response(
            {
                "detail": f"Ticket transferido exitosamente a {recipient.email}.",
                "ticket_id": ticket.id,
                "recipient_email": recipient.email,
            },
            status=status.HTTP_200_OK,
        )

