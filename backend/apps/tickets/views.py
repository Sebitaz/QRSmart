from django.db import transaction
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
    """Marca como USADO el ticket cuyo QR se escaneó y actualiza el aforo actual.

    HU 4.3: solo ORGANIZADOR o LOGISTICA. Los permisos se evalúan antes de
    tocar la BD, así que un asistente recibe 403 sin revelar si el código existe.
    HU 1.2: actualiza el aforo actual del evento inmediatamente tras un escaneo
    exitoso y previene sobrepasar la capacidad máxima.
    HU 3.2: Validación de acceso, prevención de duplicidad y respuestas claras:
      - 200: "Acceso Permitido" y estado actualizado a USADO.
      - 409: "Ticket ya usado." al escanear por 2da vez con detalles del uso.
      - 404: "Ticket Inválido." si el UUID no existe en la BD.
    """

    permission_classes = (IsOrganizadorOrLogistica,)

    @extend_schema(request=TicketValidationSerializer, responses=TicketSerializer)
    def post(self, request):
        serializer = TicketValidationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            # bloqueo para que dos escaneos simultáneos no validen el mismo ticket
            try:
                ticket = Ticket.objects.select_for_update().select_related("event", "holder").get(
                    code=serializer.validated_data["code"]
                )
            except Ticket.DoesNotExist:
                return Response(
                    {"detail": "Ticket Inválido.", "code": "ticket_not_found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if ticket.status == Ticket.Status.USADO:
                used_at_str = ticket.used_at.strftime("%Y-%m-%d %H:%M:%S") if ticket.used_at else None
                return Response(
                    {
                        "detail": "Ticket ya usado.",
                        "code": "ticket_already_used",
                        "status": Ticket.Status.USADO,
                        "used_at": ticket.used_at,
                        "used_at_formatted": used_at_str,
                        "holder": ticket.holder.get_full_name(),
                        "event": ticket.event.name,
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            if ticket.status == Ticket.Status.ANULADO:
                return Response(
                    {
                        "detail": "El ticket se encuentra anulado.",
                        "code": "ticket_cancelled",
                        "status": Ticket.Status.ANULADO,
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            if ticket.status != Ticket.Status.VALIDO:
                return Response(
                    {"detail": f"El ticket no es válido (estado: {ticket.get_status_display()}).", "code": "ticket_not_valid"},
                    status=status.HTTP_409_CONFLICT,
                )

            event = Event.objects.select_for_update().get(pk=ticket.event_id)
            if event.current_occupancy >= event.capacity:
                return Response(
                    {"detail": "No es posible ingresar: el evento ya alcanzó su capacidad máxima de aforo.", "code": "capacity_exceeded"},
                    status=status.HTTP_409_CONFLICT,
                )

            ticket.status = Ticket.Status.USADO
            ticket.used_at = timezone.now()
            ticket.validated_by = request.user
            ticket.save(update_fields=("status", "used_at", "validated_by"))

            # HU 1.2: actualiza inmediatamente el aforo con el número de personas ingresadas
            event.current_occupancy = event.tickets.filter(status=Ticket.Status.USADO).count()
            event.save(update_fields=("current_occupancy", "updated_at"))

        data = TicketSerializer(ticket).data
        data["message"] = "Acceso Permitido"
        return Response(data, status=status.HTTP_200_OK)


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

