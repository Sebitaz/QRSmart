from django.contrib import admin

from .models import Ticket


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ("code", "event", "holder", "status", "used_at", "validated_by")
    list_filter = ("status", "event")
    search_fields = ("code", "holder__email", "event__name")
    readonly_fields = ("id", "code", "used_at", "validated_by", "created_at")
