from django.urls import path

from .views import AvailableEventListView, EventDetailView, EventListCreateView

app_name = "events"

urlpatterns = [
    path("", EventListCreateView.as_view(), name="list-create"),
    path("available/", AvailableEventListView.as_view(), name="available"),
    path("<uuid:pk>/", EventDetailView.as_view(), name="detail"),
]
