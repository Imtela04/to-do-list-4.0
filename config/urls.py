from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from django.views.generic import TemplateView
from rest_framework.throttling import ScopedRateThrottle
from apps.accounts.views import LockableTokenObtainPairView
from django.urls import path, include
from django.http import HttpResponse

def health_check(request):
    return HttpResponse("OK")

class RefreshView(TokenRefreshView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope   = 'login'


urlpatterns = [
    path('health/', health_check),
    path('admin/', admin.site.urls),
    path('api/auth/login/', LockableTokenObtainPairView.as_view()),
    path('api/auth/refresh/', RefreshView.as_view()),
    path('api/auth/',         include('apps.accounts.urls')),
    path('api/',              include('apps.accounts.urls')),
    path('api/',              include('apps.todo.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

