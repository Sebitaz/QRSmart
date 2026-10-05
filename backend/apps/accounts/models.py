from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import UserManager


class User(AbstractUser):
    class Role(models.TextChoices):
        ORGANIZADOR = "ORGANIZADOR", "Organizador"
        LOGISTICA = "LOGISTICA", "Logística"
        ASISTENTE = "ASISTENTE", "Asistente"

    username = None
    email = models.EmailField("email", unique=True)
    first_name = models.CharField("nombres", max_length=150)
    last_name = models.CharField("apellidos", max_length=150)
    role = models.CharField("rol", max_length=20, choices=Role.choices, default=Role.ASISTENTE)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    objects = UserManager()

    class Meta:
        verbose_name = "usuario"
        verbose_name_plural = "usuarios"

    def __str__(self):
        return f"{self.get_full_name()} <{self.email}> ({self.role})"
