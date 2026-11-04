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


class TicketPurchaseBase(APITestCase):
    url = reverse("tickets:list-create")
    password = "ClaveSegura#2026"

    def setUp(self):
        self.organizer = self.make_user("org2@example.com", User.Role.ORGANIZADOR)
        self.cliente = self.make_user("ana@example.com", User.Role.ASISTENTE)
        self.event = self.make_event(capacity=2)
        self.client.force_authenticate(self.cliente)

    def make_user(self, email, role):
        return User.objects.create_user(
            email=email, password=self.password, first_name="Test", last_name="User", role=role
        )

    def make_event(self, capacity=10, starts_in=timedelta(days=1), **extra):
        start = timezone.now() + starts_in
        return Event.objects.create(
            organizer=self.organizer, name="Feria", location="Plaza Mayor",
            start_at=start, end_at=start + timedelta(hours=4), capacity=capacity, **extra,
        )

    def buy(self, event=None):
        return self.client.post(self.url, {"event": str((event or self.event).pk)}, format="json")


class TicketPurchaseTests(TicketPurchaseBase):

    def test_cliente_can_acquire_ticket(self):
        response = self.buy()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "VALIDO")
        self.assertEqual(response.data["event"]["name"], "Feria")
        ticket = Ticket.objects.get(pk=response.data["id"])
        self.assertEqual(ticket.holder, self.cliente)
        self.assertEqual(str(ticket.code), response.data["code"])

    def test_cannot_acquire_two_tickets_for_same_event(self):
        self.buy()
        response = self.buy()

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(Ticket.objects.filter(holder=self.cliente).count(), 1)

    def test_can_acquire_again_if_previous_ticket_was_annulled(self):
        Ticket.objects.create(event=self.event, holder=self.cliente, status=Ticket.Status.ANULADO)

        self.assertEqual(self.buy().status_code, status.HTTP_201_CREATED)

    def test_cannot_exceed_event_capacity(self):
        for email in ("b@example.com", "c@example.com"):
            Ticket.objects.create(event=self.event, holder=self.make_user(email, User.Role.ASISTENTE))

        response = self.buy()

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("agotadas", response.data["detail"])
        self.assertEqual(self.event.tickets.count(), 2)

    def test_cannot_acquire_ticket_for_finished_event(self):
        event = self.make_event(starts_in=timedelta(days=-2))

        self.assertEqual(self.buy(event).status_code, status.HTTP_409_CONFLICT)

    def test_cannot_acquire_ticket_for_cancelled_event(self):
        event = self.make_event(status=Event.Status.CANCELADO)

        self.assertEqual(self.buy(event).status_code, status.HTTP_409_CONFLICT)

    def test_unknown_event_returns_404(self):
        response = self.client.post(self.url, {"event": str(uuid4())}, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_only_asistentes_can_acquire(self):
        self.client.force_authenticate(self.organizer)
        self.assertEqual(self.buy().status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(None)
        self.assertEqual(self.buy().status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_returns_only_my_tickets(self):
        self.buy()
        other = self.make_user("otra@example.com", User.Role.ASISTENTE)
        Ticket.objects.create(event=self.event, holder=other)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_cannot_see_ticket_of_another_attendee(self):
        other = self.make_user("otra@example.com", User.Role.ASISTENTE)
        ticket = Ticket.objects.create(event=self.event, holder=other)

        response = self.client.get(reverse("tickets:detail", args=[ticket.pk]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class AvailableEventsTests(TicketPurchaseBase):
    available_url = reverse("events:available")

    def test_lists_upcoming_events_with_availability(self):
        self.buy()
        self.make_event(starts_in=timedelta(days=-2))  # ya termino
        self.make_event(status=Event.Status.CANCELADO)

        response = self.client.get(self.available_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["tickets_available"], 1)
        self.assertTrue(response.data[0]["has_ticket"])

    def test_only_asistentes_can_list_available_events(self):
        self.client.force_authenticate(self.organizer)

        self.assertEqual(self.client.get(self.available_url).status_code, status.HTTP_403_FORBIDDEN)


class TicketTransferTests(TicketPurchaseBase):
    """Pruebas de la HU 2.3: Transferencia atómica de ticket entre asistentes."""

    def setUp(self):
        super().setUp()
        self.recipient = self.make_user("destinatario@example.com", User.Role.ASISTENTE)
        self.ticket = Ticket.objects.create(event=self.event, holder=self.cliente)

    def transfer(self, ticket=None, email=None):
        target = ticket or self.ticket
        return self.client.post(
            reverse("tickets:transfer", args=[target.pk]),
            {"email": email if email is not None else self.recipient.email},
            format="json",
        )

    def test_owner_can_transfer_valid_ticket_atomically(self):
        original_code = self.ticket.code

        response = self.transfer(email="  DESTINATARIO@example.com ")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["recipient_email"], self.recipient.email)

        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.holder, self.recipient)
        self.assertNotEqual(self.ticket.code, original_code)
        self.assertEqual(self.ticket.status, Ticket.Status.VALIDO)

        # Desaparece del listado del dueño original
        owner_list = self.client.get(self.url)
        self.assertEqual(len(owner_list.data), 0)

        # Aparece en el listado del destinatario con el nuevo código QR
        self.client.force_authenticate(self.recipient)
        recipient_list = self.client.get(self.url)
        self.assertEqual(len(recipient_list.data), 1)
        self.assertEqual(recipient_list.data[0]["id"], str(self.ticket.id))
        self.assertEqual(recipient_list.data[0]["code"], str(self.ticket.code))

    def test_non_owner_gets_403_when_attempting_transfer(self):
        intruder = self.make_user("intruso@example.com", User.Role.ASISTENTE)
        self.client.force_authenticate(intruder)

        response = self.transfer()

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.holder, self.cliente)

    def test_nonexistent_recipient_email_returns_404(self):
        response = self.transfer(email="noexiste@example.com")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.holder, self.cliente)

    def test_cannot_transfer_to_self(self):
        response = self.transfer(email=self.cliente.email)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.holder, self.cliente)

    def test_cannot_transfer_to_non_attendee_role(self):
        response = self.transfer(email=self.organizer.email)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.holder, self.cliente)

    def test_cannot_transfer_used_or_annulled_ticket(self):
        self.ticket.status = Ticket.Status.USADO
        self.ticket.save(update_fields=("status",))

        response = self.transfer()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.holder, self.cliente)

    def test_cannot_transfer_if_recipient_already_has_active_ticket_for_event(self):
        Ticket.objects.create(event=self.event, holder=self.recipient)

        response = self.transfer()

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.holder, self.cliente)

