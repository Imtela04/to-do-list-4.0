from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from apps.todo.models import Todo
from django.utils import timezone


class RecurrenceTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='u', password='p')
        self.client.force_authenticate(user=self.user)

    def test_completing_daily_task_spawns_next(self):
        task = Todo.objects.create(
            owner=self.user, title='Daily', priority='low',
            recurrence='daily',
            deadline=timezone.now() + timezone.timedelta(days=1),
        )
        self.client.patch(f'/api/tasks/{task.id}/', {'completed': True})
        self.assertEqual(Todo.objects.filter(owner=self.user, title='Daily').count(), 2)

    def test_completing_task_without_recurrence_does_not_spawn(self):
        task = Todo.objects.create(
            owner=self.user, title='Once', priority='low',
            deadline=timezone.now() + timezone.timedelta(days=1),
        )
        self.client.patch(f'/api/tasks/{task.id}/', {'completed': True})
        self.assertEqual(Todo.objects.filter(owner=self.user, title='Once').count(), 1)

    def test_spawned_task_is_not_completed(self):
        task = Todo.objects.create(
            owner=self.user, title='Weekly', priority='low',
            recurrence='weekly',
            deadline=timezone.now() + timezone.timedelta(days=1),
        )
        self.client.patch(f'/api/tasks/{task.id}/', {'completed': True})
        next_task = Todo.objects.filter(owner=self.user, title='Weekly', completed=False).first()
        self.assertIsNotNone(next_task)
        self.assertEqual(next_task.recurrence, 'weekly')