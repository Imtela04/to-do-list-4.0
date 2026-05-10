from django.contrib import admin
from django.urls import path, include, re_path
from rest_framework_simplejwt.views import TokenRefreshView
from django.views.generic import TemplateView
from rest_framework.throttling import ScopedRateThrottle
from apps.accounts.views import LockableTokenObtainPairView

class RefreshView(TokenRefreshView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope   = 'login'


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', LockableTokenObtainPairView.as_view()),
    path('api/auth/refresh/', RefreshView.as_view()),
    path('api/auth/',         include('apps.accounts.urls')),
    path('api/',              include('apps.accounts.urls')),
    path('api/',              include('apps.todo.urls')),
    re_path(r'^(?!static/|admin/).*$', TemplateView.as_view(template_name='index.html')),
]