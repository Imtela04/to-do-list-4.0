from django.urls import path
from . import views
from .views import ThemeView

urlpatterns=[
    path('register/', views.register),
    path('user/theme/', ThemeView.as_view(), name='user-theme'),
]
