from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsOrganizadorOrLogistica

from .models import Ticket
from .serializers import TicketSerializer, TicketValidationSerializer


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
