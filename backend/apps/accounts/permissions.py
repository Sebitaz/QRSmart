"""Permisos por rol para la API (HU 4.3).

El rol se lee de ``request.user.role`` (modelo ``User``) y no del claim ``role``
del JWT: el usuario ya se carga desde la BD en cada petición y así un cambio
de rol hecho en el admin aplica de inmediato, sin esperar a que el token expire.

Sin token -> 401 (lo resuelve DRF). Con token pero rol no permitido -> 403.
"""

from rest_framework.permissions import BasePermission

from .models import User


class HasRole(BasePermission):
    """Base: permite el acceso solo si el rol del usuario está en ``allowed_roles``."""

    allowed_roles: tuple[str, ...] = ()
    message = "No tienes permisos para realizar esta acción."

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            # devolver False sin autenticación hace que DRF responda 401, no 403
            return False
        return getattr(user, "role", None) in self.allowed_roles


class IsOrganizador(HasRole):
    allowed_roles = (User.Role.ORGANIZADOR,)
    message = "Solo los organizadores pueden realizar esta acción."


class IsLogistica(HasRole):
    allowed_roles = (User.Role.LOGISTICA,)
    message = "Solo el personal de logística puede realizar esta acción."


class IsAsistente(HasRole):
    allowed_roles = (User.Role.ASISTENTE,)
    message = "Solo los asistentes pueden realizar esta acción."


# en las HU se le llama "Cliente" al rol ASISTENTE
IsCliente = IsAsistente


class IsOrganizadorOrLogistica(HasRole):
    allowed_roles = (User.Role.ORGANIZADOR, User.Role.LOGISTICA)
    message = "Solo organizadores o personal de logística pueden validar tickets."
