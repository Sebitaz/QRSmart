from django.urls import path

from .views import TicketValidateView

app_name = "tickets"

urlpatterns = [
    path("validate/", TicketValidateView.as_view(), name="validate"),
]
