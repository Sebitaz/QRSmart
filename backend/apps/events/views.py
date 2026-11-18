from django.db.models import Count, Exists, OuterRef, Q
from django.utils import timezone
from rest_framework import generics

from apps.accounts.permissions import IsAsistente, IsOrganizador
from apps.tickets.models import Ticket

from .models import Event
from .serializers import AvailableEventSerializer, EventSerializer


class EventListCreateView(generics.ListCreateAPIView):
    # HU 4.3: solo organizadores; asistentes y logística reciben 403
    permission_classes = (IsOrganizador,)
    serializer_class = EventSerializer

    def get_queryset(self):
        return Event.objects.filter(organizer=self.request.user).select_related("organizer")

    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)


class EventDetailView(generics.RetrieveAPIView):
    permission_classes = (IsOrganizador,)
    serializer_class = EventSerializer

    def get_queryset(self):
        return Event.objects.filter(organizer=self.request.user).select_related("organizer")


class AvailableEventListView(generics.ListAPIView):
    # eventos que todavia no terminan, para que el asistente saque su entrada
    permission_classes = (IsAsistente,)
    serializer_class = AvailableEventSerializer

    def get_queryset(self):
        my_tickets = Ticket.objects.filter(event=OuterRef("pk"), holder=self.request.user).exclude(
            status=Ticket.Status.ANULADO
        )
        return (
            Event.objects.filter(
                status__in=(Event.Status.PROGRAMADO, Event.Status.EN_CURSO),
                end_at__gt=timezone.now(),
            )
            .select_related("organizer")
            .annotate(
                tickets_sold=Count("tickets", filter=~Q(tickets__status=Ticket.Status.ANULADO)),
                has_ticket=Exists(my_tickets),
            )
        )
