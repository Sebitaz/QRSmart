from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()

PASSWORD = "ClaveSegura#2026"


class RegisterTests(APITestCase):
    url = reverse("accounts:register")

    def payload(self, **overrides):
        data = {
            "email": "Ana@Example.com",
            "first_name": "Ana",
            "last_name": "Gómez",
            "role": "ORGANIZADOR",
            "password": PASSWORD,
            "password_confirm": PASSWORD,
        }
        data.update(overrides)
        return data

    def test_register_creates_user_and_returns_tokens(self):
        response = self.client.post(self.url, self.payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["role"], "ORGANIZADOR")
        user = User.objects.get(email="ana@example.com")
        self.assertTrue(user.check_password(PASSWORD))

    def test_register_defaults_to_asistente(self):
        data = self.payload()
        data.pop("role")
        response = self.client.post(self.url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["user"]["role"], "ASISTENTE")

    def test_register_rejects_duplicate_email_case_insensitive(self):
        self.client.post(self.url, self.payload(), format="json")
        response = self.client.post(self.url, self.payload(email="ANA@example.com"), format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_register_rejects_mismatched_passwords(self):
        response = self.client.post(self.url, self.payload(password_confirm="OtraClave#2026"), format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password_confirm", response.data)

    def test_register_rejects_weak_password(self):
        response = self.client.post(
            self.url, self.payload(password="123", password_confirm="123"), format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_cannot_self_assign_logistica(self):
        response = self.client.post(self.url, self.payload(role="LOGISTICA"), format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("role", response.data)


class LoginLogoutTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="log@example.com", password=PASSWORD,
            first_name="Luis", last_name="Pérez", role=User.Role.LOGISTICA,
        )

    def login(self, email="log@example.com", password=PASSWORD):
        return self.client.post(
            reverse("accounts:login"), {"email": email, "password": password}, format="json"
        )

    def test_login_returns_tokens_and_role(self):
        response = self.login(email="LOG@example.com")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["role"], "LOGISTICA")
        self.assertIn("access", response.data)

    def test_login_with_wrong_password_fails(self):
        response = self.login(password="incorrecta")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_requires_authentication(self):
        response = self.client.get(reverse("accounts:me"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_current_user(self):
        access = self.login().data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        response = self.client.get(reverse("accounts:me"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "log@example.com")

    def test_logout_blacklists_refresh_token(self):
        tokens = self.login().data
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        response = self.client.post(reverse("accounts:logout"), {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(response.status_code, status.HTTP_205_RESET_CONTENT)

        response = self.client.post(reverse("accounts:refresh"), {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
