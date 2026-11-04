from django.urls import path

from .views import PublicTicketView, TicketDetailView, TicketListCreateView, TicketValidateView

app_name = "tickets"

urlpatterns = [
    path("", TicketListCreateView.as_view(), name="list-create"),
    path("<uuid:pk>/", TicketDetailView.as_view(), name="detail"),
    path("validate/", TicketValidateView.as_view(), name="validate"),
    path("public/<uuid:code>/", PublicTicketView.as_view(), name="public"),
]
