from django.urls import path

from .views import TicketDetailView, TicketListCreateView, TicketTransferView, TicketValidateView

app_name = "tickets"

urlpatterns = [
    path("", TicketListCreateView.as_view(), name="list-create"),
    path("<uuid:pk>/", TicketDetailView.as_view(), name="detail"),
    path("<uuid:pk>/transfer/", TicketTransferView.as_view(), name="transfer"),
    path("validate/", TicketValidateView.as_view(), name="validate"),
]

