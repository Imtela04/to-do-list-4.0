from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

LEVEL_CONFIG = {
    1: {'xp': 0,    'tasks': 5,    'categories': 2,    'notes': 0},
    2: {'xp': 50,   'tasks': 12,   'categories': 3,    'notes': 2},
    3: {'xp': 150,  'tasks': 25,   'categories': 5,    'notes': 5},
    4: {'xp': 350,  'tasks': None, 'categories': None, 'notes': None},
    5: {'xp': 700,  'tasks': None, 'categories': None, 'notes': None},
}

XP_REWARDS = {
    'complete':          10,
    'complete_on_time':  5,   # bonus on top of base
    'priority_high':     5,   # bonus on top of base
    'priority_critical': 10,  # bonus on top of base
    'streak_bonus':      5,   # bonus per day of streak (capped at 3)
    'uncomplete':       -5,
}

MAX_LEVEL = max(LEVEL_CONFIG.keys())


def calc_level(xp):
    for lvl, cfg in sorted(LEVEL_CONFIG.items(), reverse=True):
        if xp >= cfg['xp']:
            return min(lvl, MAX_LEVEL)
    return 1


class UserProfile(models.Model):
    user                = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    theme_mode          = models.CharField(max_length=20, default='dark')
    theme_custom_colors = models.JSONField(default=dict, blank=True)
    xp                  = models.IntegerField(default=0)
    level               = models.IntegerField(default=1)
    streak              = models.IntegerField(default=0)
    last_completed_date = models.DateField(null=True, blank=True)
    pomodoros_today     = models.IntegerField(default=0)
    last_pomodoro_date  = models.DateField(null=True, blank=True)
    failed_login_attempts = models.IntegerField(default=0)
    lockout_until         = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f'{self.user.username} profile'

    def get_limits(self):
        return LEVEL_CONFIG.get(self.level) or LEVEL_CONFIG[calc_level(self.xp)]

    def award_xp(self, task):
        """
        Award XP for completing a task. Returns a dict with results.
        """
        gained = XP_REWARDS['complete']

        # Priority bonus
        if task.priority == 'critical':
            gained += XP_REWARDS['priority_critical']
        elif task.priority == 'high':
            gained += XP_REWARDS['priority_high']

        # On-time bonus
        if task.deadline and task.deadline >= timezone.now():
            gained += XP_REWARDS['complete_on_time']

        # Streak logic
        today = timezone.now().date()
        if self.last_completed_date:
            delta = (today - self.last_completed_date).days
            if delta == 0:
                pass  # same day, no streak change
            elif delta == 1:
                self.streak += 1
            else:
                self.streak = 1  # streak broken
        else:
            self.streak = 1

        self.last_completed_date = today

        # Streak bonus (capped at 3 days)
        streak_bonus = min(self.streak, 3) * XP_REWARDS['streak_bonus']
        gained += streak_bonus

        old_level = self.level
        self.xp = max(0, self.xp + gained)
        self.level = calc_level(self.xp)
        self.save()

        return {
            'xp_gained':  gained,
            'total_xp':   self.xp,
            'leveled_up': self.level > old_level,
            'new_level':  self.level,
            'streak':     self.streak,
        }

    def deduct_xp(self):
        """Called when a task is un-completed."""
        self.xp = max(0, self.xp + XP_REWARDS['uncomplete'])
        self.level = calc_level(self.xp)
        self.save()
    
    def complete_pomodoro(self):
        """Called when a 25-min session finishes. Resets daily count if needed."""
        today = timezone.now().date()
        if self.last_pomodoro_date != today:
            self.pomodoros_today = 0 #reset for new day
        self.pomodoros_today += 1
        self.last_pomodoro_date = today

        #award xp
        old_level = self.level
        self.xp = max(0, self.xp+5)
        self.level = calc_level(self.xp)
        self.save()

        return {
            'xp_gained':  5,
            'total_xp':   self.xp,
            'leveled_up': self.level > old_level,
            'new_level':  self.level,
            'streak':     self.streak,
            'pomodoros_today': self.pomodoros_today,
        }

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('login_ok',        'Login success'),
        ('login_fail',      'Login failed'),
        ('register',        'Registered'),
        ('task_create',     'Task created'),
        ('task_complete',   'Task completed'),
        ('task_delete',     'Task deleted'),
        ('note_create',     'Note created'),
        ('note_delete',     'Note deleted'),
        ('cat_create',      'Category created'),
        ('cat_delete',      'Category deleted'),
        ('admin_unlock',    'Admin: unlocked'),
        ('admin_delete',    'Admin: deleted user'),
        ('admin_award_xp',  'Admin: awarded XP'),
        ('admin_reset_xp',  'Admin: reset XP'),
        ('admin_kick',      'Admin: force logout'),
        ('admin_staff',     'Admin: toggled staff'),
        ('admin_note_del',  'Admin: deleted note'),
        ('admin_bulk',      'Admin: bulk action'),
        ('delete_account',  'Account deleted'),
        ('level_up',        'Level up'),
        ('admin_view_user', 'Admin: viewed user data'),
        ('admin_view_note', 'Admin: read note content'),
    ]

    actor       = models.ForeignKey(User, null=True, blank=True,
                                    on_delete=models.SET_NULL, related_name='audit_actions')
    target_user = models.ForeignKey(User, null=True, blank=True,
                                    on_delete=models.SET_NULL, related_name='audit_events')
    action      = models.CharField(max_length=40, choices=ACTION_CHOICES)
    detail      = models.CharField(max_length=500, blank=True)
    ip          = models.GenericIPAddressField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.action} by {self.actor} @ {self.created_at:%Y-%m-%d %H:%M}'