from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Todo, Category


class AuthenticatedTestCase(APITestCase):
    """Base class that creates a user and logs in automatically."""
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            password="testpass123"
        )
        res = self.client.post("/api/auth/login/", {
            "username": "testuser",
            "password": "testpass123"
        })
        self.token = res.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")


class MeTests(AuthenticatedTestCase):
    url = "/api/me/"

    def test_me_returns_username(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["username"], "testuser")

    def test_me_unauthenticated(self):
        self.client.credentials()
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class TaskTests(AuthenticatedTestCase):

    # ── Happy path ─────────────────────────────────────────
    def test_get_tasks_empty(self):
        res = self.client.get("/api/tasks/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data, [])

    def test_add_task_success(self):
        res = self.client.post("/api/tasks/add/", {"title": "Test task"})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["title"], "Test task")
        self.assertFalse(res.data["completed"])

    def test_get_tasks_returns_own_tasks_only(self):
        # create a second user with their own task
        other = User.objects.create_user(username="other", password="pass123")
        Todo.objects.create(title="Other task", owner=other)
        # our user adds a task
        self.client.post("/api/tasks/add/", {"title": "My task"})
        res = self.client.get("/api/tasks/")
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["title"], "My task")

    def test_toggle_task(self):
        task = Todo.objects.create(title="Test task", owner=self.user)
        res = self.client.patch(f"/api/tasks/{task.id}/toggle/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["completed"])
        # toggle back
        res = self.client.patch(f"/api/tasks/{task.id}/toggle/")
        self.assertFalse(res.data["completed"])

    def test_delete_task(self):
        task = Todo.objects.create(title="Test task", owner=self.user)
        res = self.client.delete(f"/api/tasks/{task.id}/delete/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(Todo.objects.filter(id=task.id).exists())

    def test_update_task_title(self):
        task = Todo.objects.create(title="Old title", owner=self.user)
        res = self.client.patch(f"/api/tasks/{task.id}/title/", {"title": "New title"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["title"], "New title")

    def test_update_task_description(self):
        task = Todo.objects.create(title="Test task", owner=self.user)
        res = self.client.patch(f"/api/tasks/{task.id}/description/", {
            "description": "New description"
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["description"], "New description")

    def test_update_task_deadline(self):
        task = Todo.objects.create(title="Test task", owner=self.user)
        res = self.client.patch(f"/api/tasks/{task.id}/deadline/", {
            "deadline": "2026-12-31T00:00:00+00:00"
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(res.data["deadline"])

    # ── Edge cases ─────────────────────────────────────────
    def test_add_duplicate_task(self):
        self.client.post("/api/tasks/add/", {"title": "Test task"})
        res = self.client.post("/api/tasks/add/", {"title": "Test task"})
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)

    def test_add_task_missing_title(self):
        res = self.client.post("/api/tasks/add/", {})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        # empty title gets created as empty string — adjust if you add validation

    def test_delete_nonexistent_task(self):
        res = self.client.delete("/api/tasks/9999/delete/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_other_users_task(self):
        other = User.objects.create_user(username="other", password="pass123")
        task = Todo.objects.create(title="Other task", owner=other)
        res = self.client.patch(f"/api/tasks/{task.id}/title/", {
            "title": "Hacked title"
        })
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_other_users_task(self):
        other = User.objects.create_user(username="other", password="pass123")
        task = Todo.objects.create(title="Other task", owner=other)
        res = self.client.delete(f"/api/tasks/{task.id}/delete/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    # ── Error cases ────────────────────────────────────────
    def test_get_tasks_unauthenticated(self):
        self.client.credentials()
        res = self.client.get("/api/tasks/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_add_task_unauthenticated(self):
        self.client.credentials()
        res = self.client.post("/api/tasks/add/", {"title": "Test task"})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class CategoryTests(AuthenticatedTestCase):

    # ── Happy path ─────────────────────────────────────────
    def test_get_categories_empty(self):
        res = self.client.get("/api/categories/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data, [])

    def test_add_category_success(self):
        res = self.client.post("/api/categories/add/", {
            "name": "work",
            "icon": "💼"
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["name"], "work")
        self.assertEqual(res.data["icon"], "💼")

    def test_add_category_default_icon(self):
        res = self.client.post("/api/categories/add/", {"name": "work"})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["icon"], "🏷️")

    def test_get_categories_returns_own_only(self):
        other = User.objects.create_user(username="other", password="pass123")
        Category.objects.create(name="other cat", owner=other)
        self.client.post("/api/categories/add/", {"name": "my cat"})
        res = self.client.get("/api/categories/")
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["name"], "my cat")

    def test_update_category(self):
        cat = Category.objects.create(name="work", icon="💼", owner=self.user)
        res = self.client.patch(f"/api/categories/{cat.id}/update/", {
            "name": "Work Updated",
            "icon": "🏢"
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["name"], "Work Updated")
        self.assertEqual(res.data["icon"], "🏢")

    def test_delete_category(self):
        cat = Category.objects.create(name="work", icon="💼", owner=self.user)
        res = self.client.delete(f"/api/categories/{cat.id}/delete/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(Category.objects.filter(id=cat.id).exists())

    def test_task_category_set_null_on_category_delete(self):
        cat = Category.objects.create(name="work", icon="💼", owner=self.user)
        task = Todo.objects.create(title="Test task", owner=self.user, category=cat)
        cat.delete()
        task.refresh_from_db()
        self.assertIsNone(task.category)

    # ── Edge cases ─────────────────────────────────────────
    def test_update_nonexistent_category(self):
        res = self.client.patch("/api/categories/9999/update/", {"name": "x"})
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_nonexistent_category(self):
        res = self.client.delete("/api/categories/9999/delete/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_other_users_category(self):
        other = User.objects.create_user(username="other", password="pass123")
        cat = Category.objects.create(name="other cat", owner=other)
        res = self.client.patch(f"/api/categories/{cat.id}/update/", {
            "name": "hacked"
        })
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_other_users_category(self):
        other = User.objects.create_user(username="other", password="pass123")
        cat = Category.objects.create(name="other cat", owner=other)
        res = self.client.delete(f"/api/categories/{cat.id}/delete/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    # ── Error cases ────────────────────────────────────────
    def test_get_categories_unauthenticated(self):
        self.client.credentials()
        res = self.client.get("/api/categories/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_add_category_unauthenticated(self):
        self.client.credentials()
        res = self.client.post("/api/categories/add/", {"name": "work"})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)