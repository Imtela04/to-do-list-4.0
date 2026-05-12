from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils import timezone
from .models import UserProfile

class UserProfileInline(admin.StackedInline):
    model = UserProfile
    fields = ('xp', 'level', 'streak', 'failed_login_attempts', 'lockout_until', 'pomodoros_today')
    readonly_fields = ('xp', 'level', 'streak', 'pomodoros_today')

@admin.action(description='Unlock selected accounts')
def unlock_accounts(queryset):
    UserProfile.objects.filter(user__in=queryset).update(
        failed_login_attempts=0, lockout_until=None
    )

admin.site.unregister(User)

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'date_joined', 'last_login', 'get_level', 'get_xp', 'get_streak', 'is_locked')
    list_filter = ('date_joined', 'last_login')
    search_fields = ('username', 'email')
    actions = [unlock_accounts]
    inlines = [UserProfileInline]

    def get_level(self, obj):
        return obj.profile.level if hasattr(obj, 'profile') else '-'
    get_level.short_description = 'Level'

    def get_xp(self, obj):
        return obj.profile.xp if hasattr(obj, 'profile') else '-'
    get_xp.short_description = 'XP'

    def get_streak(self, obj):
        return obj.profile.streak if hasattr(obj, 'profile') else '-'
    get_streak.short_description = 'Streak'

    def is_locked(self, obj):
        if not hasattr(obj, 'profile'): return False
        return bool(obj.profile.lockout_until and obj.profile.lockout_until > timezone.now())
    is_locked.boolean = True
    is_locked.short_description = 'Locked'