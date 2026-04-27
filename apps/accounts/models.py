from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user       = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    theme_mode = models.CharField(max_length=20, default='dark')
    theme_custom_colors = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f'{self.user.username} profile'