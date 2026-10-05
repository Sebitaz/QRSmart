from rest_framework import generics

from apps.accounts.permissions import IsOrganizador

from .models import Event
from .serializers import EventSerializer


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
