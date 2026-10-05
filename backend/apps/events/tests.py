from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Event

User = get_user_model()


class EventCreationTests(APITestCase):
    url = reverse("events:list-create")

    def setUp(self):
        self.organizer = User.objects.create_user(
            email="org@example.com", password="ClaveSegura#2026",
            first_name="Olga", last_name="Ruiz", role=User.Role.ORGANIZADOR,
        )
        self.client.force_authenticate(self.organizer)

    def payload(self, **overrides):
        start = timezone.now() + timedelta(days=7)
        data = {
            "name": "Tech Conference Medellín",
            "description": "Conferencia de tecnología",
            "location": "Plaza Mayor",
            "start_at": start.isoformat(),
            "end_at": (start + timedelta(hours=8)).isoformat(),
            "capacity": 500,
        }
        data.update(overrides)
        return data

    def test_create_event_assigns_organizer_and_defaults(self):
        response = self.client.post(self.url, self.payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        event = Event.objects.get(pk=response.data["id"])
        self.assertEqual(event.organizer, self.organizer)
        self.assertEqual(event.capacity, 500)
        self.assertEqual(event.current_occupancy, 0)
        self.assertEqual(event.status, Event.Status.PROGRAMADO)

    def test_read_only_fields_are_ignored(self):
        response = self.client.post(
            self.url, self.payload(current_occupancy=300, status="FINALIZADO"), format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["current_occupancy"], 0)
        self.assertEqual(response.data["status"], "PROGRAMADO")

    def test_requires_authentication(self):
        self.client.force_authenticate(None)
        response = self.client.post(self.url, self.payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_rejects_missing_required_fields(self):
        response = self.client.post(self.url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        for field in ("name", "location", "start_at", "end_at", "capacity"):
            self.assertIn(field, response.data)

    def test_rejects_non_positive_capacity(self):
        response = self.client.post(self.url, self.payload(capacity=0), format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("capacity", response.data)

    def test_rejects_start_in_the_past(self):
        start = timezone.now() - timedelta(hours=1)
        response = self.client.post(
            self.url,
            self.payload(start_at=start.isoformat(), end_at=(start + timedelta(hours=3)).isoformat()),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("start_at", response.data)

    def test_rejects_end_before_start(self):
        data = self.payload()
        data["end_at"] = data["start_at"]
        response = self.client.post(self.url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("end_at", response.data)

    def test_list_only_returns_own_events(self):
        other = User.objects.create_user(
            email="otro@example.com", password="ClaveSegura#2026",
            first_name="Otro", last_name="Org", role=User.Role.ORGANIZADOR,
        )
        start = timezone.now() + timedelta(days=1)
        Event.objects.create(
            organizer=other, name="Ajeno", location="X",
            start_at=start, end_at=start + timedelta(hours=1), capacity=10,
        )
        self.client.post(self.url, self.payload(), format="json")

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Tech Conference Medellín")

    def test_retrieve_other_organizer_event_returns_404(self):
        other = User.objects.create_user(
            email="otro@example.com", password="ClaveSegura#2026",
            first_name="Otro", last_name="Org", role=User.Role.ORGANIZADOR,
        )
        start = timezone.now() + timedelta(days=1)
        event = Event.objects.create(
            organizer=other, name="Ajeno", location="X",
            start_at=start, end_at=start + timedelta(hours=1), capacity=10,
        )

        response = self.client.get(reverse("events:detail", args=[event.pk]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class EventAuthorizationTests(APITestCase):
    """HU 4.3: solo los organizadores pueden usar los endpoints de eventos."""

    url = reverse("events:list-create")
    password = "ClaveSegura#2026"

    def setUp(self):
        self.organizer = self.make_user("org@example.com", User.Role.ORGANIZADOR)
        self.cliente = self.make_user("cliente@example.com", User.Role.ASISTENTE)
        self.logistica = self.make_user("log@example.com", User.Role.LOGISTICA)
        start = timezone.now() + timedelta(days=7)
        self.payload = {
            "name": "Concierto", "location": "Estadio", "capacity": 100,
            "start_at": start.isoformat(), "end_at": (start + timedelta(hours=3)).isoformat(),
        }

    def make_user(self, email, role):
        return User.objects.create_user(
            email=email, password=self.password, first_name="Test", last_name="User", role=role
        )

    def test_cliente_cannot_create_event(self):
        self.client.force_authenticate(self.cliente)
        response = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Event.objects.exists())

    def test_logistica_cannot_create_event(self):
        self.client.force_authenticate(self.logistica)
        response = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Event.objects.exists())

    def test_non_organizers_cannot_list_or_retrieve(self):
        start = timezone.now() + timedelta(days=1)
        event = Event.objects.create(
            organizer=self.organizer, name="Privado", location="X",
            start_at=start, end_at=start + timedelta(hours=1), capacity=10,
        )
        for user in (self.cliente, self.logistica):
            self.client.force_authenticate(user)
            with self.subTest(role=user.role):
                self.assertEqual(self.client.get(self.url).status_code, status.HTTP_403_FORBIDDEN)
                detail = self.client.get(reverse("events:detail", args=[event.pk]))
                self.assertEqual(detail.status_code, status.HTTP_403_FORBIDDEN)

    def test_cliente_with_real_jwt_gets_403(self):
        login = self.client.post(
            reverse("accounts:login"),
            {"email": self.cliente.email, "password": self.password},
            format="json",
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        response = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_organizer_can_create_event(self):
        self.client.force_authenticate(self.organizer)
        response = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
