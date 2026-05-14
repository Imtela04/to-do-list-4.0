from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class Category(models.Model):
    name          = models.CharField(max_length=255)
    icon          = models.CharField(max_length=10, default='🏷️')
    is_onboarding = models.BooleanField(default=False)
    owner         = models.ForeignKey(User, on_delete=models.CASCADE, related_name='categories')

    def __str__(self):
        return self.name

class Todo(models.Model):
    PRIORITY_CHOICES = [
        ('low',      'Low'),
        ('medium',   'Medium'),
        ('high',     'High'),
        ('critical', 'Critical'),
    ]
    title        = models.CharField(max_length=255)
    completed    = models.BooleanField(default=False)
    description  = models.TextField(null=True, blank=True)
    deadline     = models.DateTimeField(null=True, blank=True)
    category     = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    priority     = models.CharField(max_length=20, choices=PRIORITY_CHOICES)
    pinned       = models.BooleanField(default=False)
    position = models.PositiveIntegerField(default=0, db_index=True)
    owner        = models.ForeignKey(User, on_delete=models.CASCADE, related_name='todos')
    created_at   = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    is_onboarding = models.BooleanField(default=False)
    recurrence = models.CharField(max_length=20, null=True, blank=True)

    def __str__(self):
        return self.title

    def all_subtasks_complete(self):
        subtasks = self.subtasks.all()
        return subtasks.exists() and all(s.completed for s in subtasks)

    def has_subtasks(self):
        return self.subtasks.exists()
    

    def sync_completion_from_subtasks(self):
        """
        Call after any subtask change.
        Returns xp_result dict if completion changed, None otherwise.
        Must be passed the user profile to award/deduct XP.
        """
        if not self.has_subtasks():
            return None

        should_complete = self.all_subtasks_complete()
        if should_complete == self.completed:
            return None  # no change needed

        self.completed    = should_complete
        self.completed_at = timezone.now() if should_complete else None
        self.save(update_fields=['completed', 'completed_at'])
        return should_complete  # caller handles XP


class Subtask(models.Model):
    task         = models.ForeignKey(Todo, on_delete=models.CASCADE, related_name='subtasks')
    title        = models.CharField(max_length=255)
    completed    = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return self.title


class StickyNotes(models.Model):
    note          = models.TextField(null=True, blank=True)
    color         = models.CharField(max_length=20, default='#7c6aff')
    is_onboarding = models.BooleanField(default=False)
    owner         = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sticky_notes')
    created_at    = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.note or ''