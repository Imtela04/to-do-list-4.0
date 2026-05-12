from django.urls import path
from . import views
from .views import ThemeView

urlpatterns = [
    path('dashboard/stats/',               views.admin_stats,       name='admin-stats'),
    path('dashboard/users/',               views.admin_users,       name='admin-users'),
    path('dashboard/unlock/<int:user_id>/', views.admin_unlock_user, name='admin-unlock'),
    path('register/',                    views.register),
    path('user/theme/',                  ThemeView.as_view(), name='user-theme'),
    path('me/',                          views.me,            name='me'),
    path('account/',                     views.delete_account, name='delete-account'),
    path('auth/account/',                views.delete_account, name='delete-account-auth'),
    path('health/',                      views.health,         name='health'),
    path('auth/password-reset/',         views.request_password_reset, name='password-reset'),
    path('auth/password-reset/confirm/', views.confirm_password_reset,  name='password-reset-confirm'),
    path('auth/pomodoro/complete/',      views.complete_pomodoro, name='pomodoro-complete'),
    path('auth/update-email/', views.update_email, name='update-email'),
]