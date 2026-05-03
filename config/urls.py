from django.contrib import admin
from django.urls import path, include, re_path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/',   TokenObtainPairView.as_view()),
    path('api/auth/refresh/', TokenRefreshView.as_view()),
    path('api/auth/',         include('apps.accounts.urls')),
    path('api/',              include('apps.accounts.urls')),
    path('api/',              include('apps.todo.urls')),
    re_path(r'^(?!static/).*$', TemplateView.as_view(template_name='index.html')),
]