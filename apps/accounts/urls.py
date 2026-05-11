from django.urls import path
from . import views
from .views import ThemeView

urlpatterns = [
    path('register/',    views.register),
    path('user/theme/',  ThemeView.as_view(), name='user-theme'),
    path('me/',          views.me,            name='me'),
    path('account/', views.delete_account, name='delete-account'),
    path('auth/account/', views.delete_account, name='delete-account'),
    path('health/', views.health, name='health'),
    path('auth/password-reset/',         views.request_password_reset, name='password-reset'),
    path('auth/password-reset/confirm/', views.confirm_password_reset,  name='password-reset-confirm'),
]