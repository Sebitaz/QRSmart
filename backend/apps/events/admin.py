from django.contrib import admin

from .models import Event


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("name", "organizer", "start_at", "capacity", "current_occupancy", "status")
    list_filter = ("status", "start_at")
    search_fields = ("name", "location", "organizer__email")
    readonly_fields = ("id", "created_at", "updated_at")
