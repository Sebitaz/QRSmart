from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAsistente, IsOrganizadorOrLogistica

from .models import Ticket
from .serializers import (
    AttendeeTicketSerializer,
    PublicTicketSerializer,
    TicketPurchaseSerializer,
    TicketSerializer,
    TicketValidationSerializer,
)
from .services import acquire_ticket


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
            ticket.status = Ticket.Status.USADO
            ticket.used_at = timezone.now()
            ticket.validated_by = request.user
            ticket.save(update_fields=("status", "used_at", "validated_by"))

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


class PublicTicketView(generics.RetrieveAPIView):
    """Vista pública de solo lectura que abre el celular al escanear el QR.

    El código es un UUID aleatorio, así que solo lo conoce quien tiene el QR.
    No permite validar: eso sigue siendo exclusivo de organizador/logística.
    """

    permission_classes = (AllowAny,)
    authentication_classes = ()  # un token vencido en el navegador no debe dar 401
    serializer_class = PublicTicketSerializer
    queryset = Ticket.objects.select_related("event", "holder")
    lookup_field = "code"
