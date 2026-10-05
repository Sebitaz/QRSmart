from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory

from .permissions import IsAsistente, IsCliente, IsLogistica, IsOrganizador, IsOrganizadorOrLogistica

User = get_user_model()
R = User.Role


class RolePermissionUnitTests(SimpleTestCase):
    """Matriz rol x permiso, sin BD."""

    expected = {
        IsOrganizador: {R.ORGANIZADOR},
        IsLogistica: {R.LOGISTICA},
        IsAsistente: {R.ASISTENTE},
        IsOrganizadorOrLogistica: {R.ORGANIZADOR, R.LOGISTICA},
    }

    def setUp(self):
        self.request = APIRequestFactory().get("/")

    def test_role_matrix(self):
        for permission_class, allowed in self.expected.items():
            for role in R.values:
                with self.subTest(permission=permission_class.__name__, role=role):
                    self.request.user = User(email=f"{role}@example.com", role=role)
                    granted = permission_class().has_permission(self.request, view=None)
                    self.assertEqual(granted, role in allowed)

    def test_anonymous_user_is_denied(self):
        self.request.user = AnonymousUser()
        for permission_class in self.expected:
            with self.subTest(permission=permission_class.__name__):
                self.assertFalse(permission_class().has_permission(self.request, view=None))

    def test_cliente_is_alias_of_asistente(self):
        self.assertIs(IsCliente, IsAsistente)
