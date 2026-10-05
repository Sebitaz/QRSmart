from datetime import timedelta
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.events.models import Event

from .models import Ticket

User = get_user_model()


class TicketValidationTests(APITestCase):
    url = reverse("tickets:validate")
    password = "ClaveSegura#2026"

    def setUp(self):
        self.organizer = self.make_user("org@example.com", User.Role.ORGANIZADOR)
        self.logistica = self.make_user("log@example.com", User.Role.LOGISTICA)
        self.cliente = self.make_user("cliente@example.com", User.Role.ASISTENTE)
        start = timezone.now() + timedelta(days=1)
        event = Event.objects.create(
            organizer=self.organizer, name="Concierto", location="Estadio",
            start_at=start, end_at=start + timedelta(hours=3), capacity=100,
        )
        self.ticket = Ticket.objects.create(event=event, holder=self.cliente)

    def make_user(self, email, role):
        return User.objects.create_user(
            email=email, password=self.password, first_name="Test", last_name="User", role=role
        )

    def validate(self, code=None):
        return self.client.post(self.url, {"code": str(code or self.ticket.code)}, format="json")

    # --- HU 4.3: autorización ---

    def test_cliente_cannot_validate_ticket(self):
        self.client.force_authenticate(self.cliente)
        response = self.validate()

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.status, Ticket.Status.VALIDO)
        self.assertIsNone(self.ticket.used_at)

    def test_cliente_gets_403_even_for_unknown_code(self):
        # el permiso se evalúa antes de buscar el ticket: no se filtra si existe
        self.client.force_authenticate(self.cliente)
        self.assertEqual(self.validate(uuid4()).status_code, status.HTTP_403_FORBIDDEN)

    def test_cliente_with_real_jwt_gets_403(self):
        login = self.client.post(
            reverse("accounts:login"),
            {"email": self.cliente.email, "password": self.password},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        self.assertEqual(self.validate().status_code, status.HTTP_403_FORBIDDEN)

    def test_requires_authentication(self):
        self.assertEqual(self.validate().status_code, status.HTTP_401_UNAUTHORIZED)

    def test_organizer_can_validate_ticket(self):
        self.client.force_authenticate(self.organizer)
        response = self.validate()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.status, Ticket.Status.USADO)
        self.assertEqual(self.ticket.validated_by, self.organizer)
        self.assertIsNotNone(self.ticket.used_at)

    def test_logistica_can_validate_ticket(self):
        self.client.force_authenticate(self.logistica)
        response = self.validate()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], Ticket.Status.USADO)

    # --- reglas de negocio de la validación ---

    def test_used_ticket_cannot_be_validated_twice(self):
        self.client.force_authenticate(self.logistica)
        self.validate()

        self.assertEqual(self.validate().status_code, status.HTTP_409_CONFLICT)

    def test_unknown_code_returns_404(self):
        self.client.force_authenticate(self.logistica)
        self.assertEqual(self.validate(uuid4()).status_code, status.HTTP_404_NOT_FOUND)

    def test_invalid_code_format_returns_400(self):
        self.client.force_authenticate(self.logistica)
        response = self.client.post(self.url, {"code": "no-es-un-uuid"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
