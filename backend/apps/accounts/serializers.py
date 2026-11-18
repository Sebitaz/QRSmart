from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()

# logistica no se puede registrar sola, se crea desde el admin
SELF_REGISTER_ROLES = (User.Role.ORGANIZADOR, User.Role.ASISTENTE)


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="get_full_name", read_only=True)

    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "full_name", "role", "date_joined")
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    password_confirm = serializers.CharField(write_only=True, style={"input_type": "password"})
    role = serializers.ChoiceField(
        choices=[(r.value, r.label) for r in SELF_REGISTER_ROLES],
        default=User.Role.ASISTENTE,
    )

    class Meta:
        model = User
        fields = ("email", "first_name", "last_name", "role", "password", "password_confirm")

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Ya existe una cuenta registrada con este email.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Las contraseñas no coinciden."})
        candidate = User(
            email=attrs["email"], first_name=attrs["first_name"], last_name=attrs["last_name"]
        )
        validate_password(attrs["password"], user=candidate)
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        return User.objects.create_user(**validated_data)


class LoginSerializer(TokenObtainPairSerializer):
    # se agrega el rol al token para redirigir en el front
    default_error_messages = {
        "no_active_account": "Email o contraseña incorrectos.",
    }

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["email"] = user.email
        token["full_name"] = user.get_full_name()
        return token

    def validate(self, attrs):
        attrs[self.username_field] = attrs[self.username_field].strip().lower()
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()
