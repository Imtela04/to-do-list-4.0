from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
import os

class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        username = os.environ.get('SUPERUSER_USERNAME')
        password = os.environ.get('SUPERUSER_PASSWORD')
        email    = os.environ.get('SUPERUSER_EMAIL', '')

        if not username or not password:
            self.stdout.write('No superuser env vars set, skipping.')
            return

        if User.objects.filter(username=username).exists():
            # Just ensure is_staff/is_superuser are set
            User.objects.filter(username=username).update(
                is_staff=True, is_superuser=True
            )
            self.stdout.write(f'Updated {username} to superuser.')
        else:
            User.objects.create_superuser(username=username, password=password, email=email)
            self.stdout.write(f'Superuser {username} created.')