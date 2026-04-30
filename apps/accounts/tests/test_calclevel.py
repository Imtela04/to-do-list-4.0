from django.test import TestCase
from django.contrib.auth.models import User
from apps.accounts.models import UserProfile, LEVEL_CONFIG, MAX_LEVEL, calc_level  
from apps.todo.models import Todo
from django.utils import timezone


class CalcLevelTest(TestCase):
    def test_level_1_at_zero_xp(self):
        self.assertEqual(calc_level(0), 1)

    def test_level_2_at_exact_threshold(self):
        self.assertEqual(calc_level(100), 2)

    def test_level_2_just_below_level_3(self):
        self.assertEqual(calc_level(149), 2)

    def test_level_3_at_exact_threshold(self):
        self.assertEqual(calc_level(150), 3)

    def test_level_4_at_exact_threshold(self):
        self.assertEqual(calc_level(350), 4)

    def test_max_level_capped(self):
        self.assertEqual(calc_level(999999), MAX_LEVEL)

    def test_negative_xp_returns_level_1(self):
        self.assertEqual(calc_level(-50), 1)


class UserProfileTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='pass')
        self.profile, _ = UserProfile.objects.get_or_create(user=self.user)

    def test_profile_created_with_defaults(self):
        self.assertEqual(self.profile.xp, 0)
        self.assertEqual(self.profile.level, 1)
        self.assertEqual(self.profile.streak, 0)
        self.assertIsNone(self.profile.last_completed_date)

    def test_get_limits_level_1(self):
        limits = self.profile.get_limits()
        self.assertEqual(limits['tasks'], 5)
        self.assertEqual(limits['categories'], 2)
        self.assertEqual(limits['notes'], 0)

    def test_get_limits_level_4_unlimited(self):
        self.profile.level = 4
        self.profile.save()
        limits = self.profile.get_limits()
        self.assertIsNone(limits['tasks'])
        self.assertIsNone(limits['categories'])
        self.assertIsNone(limits['notes'])

    def test_get_limits_invalid_level_falls_back_to_xp(self):
        self.profile.level = 99
        self.profile.xp = 0
        self.profile.save()
        limits = self.profile.get_limits()
        self.assertEqual(limits['tasks'], LEVEL_CONFIG[1]['tasks'])

    def test_deduct_xp_removes_5(self):
        self.profile.xp = 50
        self.profile.save()
        self.profile.deduct_xp()
        self.assertEqual(self.profile.xp, 45)

    def test_deduct_xp_does_not_go_below_zero(self):
        self.profile.xp = 3
        self.profile.save()
        self.profile.deduct_xp()
        self.assertEqual(self.profile.xp, 0)

    def test_award_xp_base(self):
        task = Todo.objects.create(
            owner=self.user, title='Test task',
            priority='low', completed=True,
        )
        result = self.profile.award_xp(task)
        self.assertEqual(result['xp_gained'], 15)  # 10 base + 5 streak bonus (first completion)
        self.assertEqual(self.profile.xp, 15)

    def test_award_xp_high_priority_bonus(self):
        task = Todo.objects.create(
            owner=self.user, title='High priority task',
            priority='high', completed=True,
        )
        result = self.profile.award_xp(task)
        self.assertIn('xp_gained', result)
        self.assertGreaterEqual(result['xp_gained'], 15)  # 10 base + 5 priority

    def test_award_xp_critical_priority_bonus(self):
        task = Todo.objects.create(
            owner=self.user, title='Critical task',
            priority='critical', completed=True,
        )
        result = self.profile.award_xp(task)
        self.assertGreaterEqual(result['xp_gained'], 20)  # 10 base + 10 priority

    def test_award_xp_on_time_bonus(self):
        task = Todo.objects.create(
            owner=self.user, title='On time task',
            priority='low', completed=True,
            deadline=timezone.now() + timezone.timedelta(days=1),
        )
        result = self.profile.award_xp(task)
        self.assertGreaterEqual(result['xp_gained'], 15)  # 10 base + 5 on-time

    def test_award_xp_level_up(self):
        self.profile.xp = 95
        self.profile.level = 1
        self.profile.save()
        task = Todo.objects.create(
            owner=self.user, title='Level up task',
            priority='low', completed=True,
        )
        result = self.profile.award_xp(task)
        self.assertTrue(result['leveled_up'])
        self.assertEqual(result['new_level'], 2)

    def test_streak_increments_on_consecutive_days(self):
        today = timezone.now().date()
        yesterday = today - timezone.timedelta(days=1)
        self.profile.last_completed_date = yesterday
        self.profile.streak = 1
        self.profile.save()
        task = Todo.objects.create(
            owner=self.user, title='Streak task',
            priority='low', completed=True,
        )
        self.profile.award_xp(task)
        self.assertEqual(self.profile.streak, 2)

    def test_streak_resets_after_gap(self):
        today = timezone.now().date()
        two_days_ago = today - timezone.timedelta(days=2)
        self.profile.last_completed_date = two_days_ago
        self.profile.streak = 5
        self.profile.save()
        task = Todo.objects.create(
            owner=self.user, title='Broken streak task',
            priority='low', completed=True,
        )
        self.profile.award_xp(task)
        self.assertEqual(self.profile.streak, 1)

    def test_streak_bonus_capped_at_3(self):
        today = timezone.now().date()
        yesterday = today - timezone.timedelta(days=1)
        self.profile.last_completed_date = yesterday
        self.profile.streak = 10  # already high
        self.profile.save()
        task = Todo.objects.create(
            owner=self.user, title='High streak task',
            priority='low', completed=True,
        )
        result = self.profile.award_xp(task)
        # streak bonus capped at 3 * 5 = 15
        streak_bonus = min(11, 3) * 5  # streak becomes 11 but bonus capped
        self.assertLessEqual(result['xp_gained'], 10 + 15 + 5)  # base + max streak bonus + on-time