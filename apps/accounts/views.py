from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import UserCreateSerializer
from .models import UserProfile, LEVEL_CONFIG, MAX_LEVEL
from django.utils import timezone
from datetime import timedelta
from apps.todo.models import Category, Todo, StickyNotes
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.throttling import AnonRateThrottle
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.models import User
from django.conf import settings
import resend
from apps.todo.views import get_resource_count
from django.contrib.admin.views.decorators import staff_member_required
from django.db.models import Count, Avg, Q


class RegistrationRateThrottle(AnonRateThrottle):
    scope = 'registration'

class LockableTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        username = request.data.get('username', '')
        from django.contrib.auth.models import User
        user = User.objects.filter(username=username).first()

        if user:
            allowed, message = check_lockout(user)
            if not allowed:
                return Response({'detail': message}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        try:
            response = super().post(request, *args, **kwargs)
            if user:
                record_successful_login(user)
            return response
        except Exception:
            record_failed_login(username)
            raise
        
class ThemeView(APIView):
    permission_classes = [IsAuthenticated]

    def get_or_create_profile(self, user):
        profile, _ = UserProfile.objects.get_or_create(user=user)
        return profile

    def get(self, request):
        profile = self.get_or_create_profile(request.user)
        return Response({
            'mode': profile.theme_mode,
            'custom_colors': profile.theme_custom_colors,
        })

    def post(self, request):
        profile = self.get_or_create_profile(request.user)
        mode = request.data.get('mode', profile.theme_mode)
        colors = request.data.get('custom_colors', profile.theme_custom_colors)

        # add these guards
        VALID_MODES = {'light', 'dark', 'custom'}
        if mode not in VALID_MODES:
            return Response({'detail': 'Invalid theme mode.'}, status=400)
        if colors is not None and not isinstance(colors, dict):
            return Response({'detail': 'Invalid custom colors.'}, status=400)

        profile.theme_mode = mode
        profile.theme_custom_colors = colors
        profile.save()
        return Response({'mode': profile.theme_mode, 'custom_colors': profile.theme_custom_colors})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    limits = profile.get_limits()
    next_level_xp = None
    if profile.level < MAX_LEVEL:
        next_level_xp = LEVEL_CONFIG[profile.level +1]['xp']
    
    today = timezone.now().date()
    pomodoros_today = profile.pomodoros_today if profile.last_pomodoro_date == today else 0
    return Response({
        'username':        request.user.username,
        'is_staff':         request.user.is_staff,
        'xp':              profile.xp,
        'level':           profile.level,
        'streak':          profile.streak,
        'next_level_xp':   next_level_xp,
        'pomodoros_today': pomodoros_today,
        'limits': {
            'tasks':      limits['tasks'],
            'categories': limits['categories'],
            'notes':      limits['notes'],
        },
        'counts': {
                    'tasks':      get_resource_count(request.user, 'tasks'),
                    'categories': get_resource_count(request.user, 'categories'),
                    'notes':      get_resource_count(request.user, 'notes'),
        },
    })


def create_onboarding_data(user):
    getting_started = Category.objects.create(owner=user, name='Getting Started', icon='🚀', is_onboarding=True)
    personal        = Category.objects.create(owner=user, name='Personal', icon='👤', is_onboarding=True)
    work            = Category.objects.create(owner=user, name='Work', icon='💼', is_onboarding=True)

    now = timezone.now()

    Todo.objects.create(
        owner=user, title='Welcome to what-do! 👋',
        description='This is a task. Click the checkmark to complete it and earn XP!',
        priority='low', category=getting_started, pinned=True,
        deadline=now + timedelta(days=1),
        is_onboarding=True
    )
    Todo.objects.create(
        owner=user, title='Try creating a new task',
        description='Hit the + button to create your first task.',
        priority='medium', category=getting_started,
        deadline=now + timedelta(days=2),
        is_onboarding=True
    )
    Todo.objects.create(
        owner=user, title='Organise with categories',
        description='Categories help you group tasks. Click + next to CATEGORIES to create one.',
        priority='medium', category=getting_started,
        deadline=now + timedelta(days=3),
        is_onboarding=True
    )
    Todo.objects.create(
        owner=user, title='Plan your week',
        description='A sample personal task to get you started.',
        priority='medium', category=personal,
        deadline=now + timedelta(days=3),
        is_onboarding=True
    )
    Todo.objects.create(
        owner=user, title='First work task',
        description='Try setting this to high priority.',
        priority='high', category=work,
        deadline=now + timedelta(days=1),
        is_onboarding=True
    )
    StickyNotes.objects.create(
        owner=user, color='#7c6aff',
        note='📌 Complete tasks to earn XP and level up!\n\nHigher priority tasks and on-time completions earn bonus XP. Keep your streak going for even more!',
        is_onboarding=True
    )
    StickyNotes.objects.create(
        owner=user, color='#f59e0b',
        note='🎯 Priority XP bonuses:\n\nLow → 10 XP\nMedium → 10 XP\nHigh → 15 XP\nCritical → 20 XP\n+5 bonus for finishing before deadline!',
        is_onboarding=True
    )


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([RegistrationRateThrottle])

def register(request):
    serializer = UserCreateSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        create_onboarding_data(user)
        return Response(
            {'message': 'User created successfully'},
            status=status.HTTP_201_CREATED
        )
    # sanitize the error — don't reveal whether username exists
    errors = serializer.errors
    if 'username' in errors:
        errors = {'detail': 'Registration failed. Please check your details.'}
    return Response(errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_pomodoro(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    result = profile.complete_pomodoro()
    return Response(result)

MAX_ATTEMPTS = 10
LOCKOUT_DURATION = timedelta(minutes=30)

def check_lockout(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    if profile.lockout_until and profile.lockout_until > timezone.now():
        remaining = (profile.lockout_until - timezone.now()).seconds // 60
        return False, f'Account locked. Try again in {remaining} minutes.'
    return True, None

def record_failed_login(username):
    from django.contrib.auth.models import User
    user = User.objects.filter(username=username).first()
    if not user: return
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.failed_login_attempts += 1
    if profile.failed_login_attempts >= MAX_ATTEMPTS:
        profile.lockout_until = timezone.now() + LOCKOUT_DURATION
    profile.save()

def record_successful_login(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.failed_login_attempts = 0
    profile.lockout_until = None
    profile.save()


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_account(request):
    password = request.data.get('password', '')
    if not password:
        return Response({'detail': 'Password is required.'}, status=status.HTTP_400_BAD_REQUEST)
    
    if not request.user.check_password(password):
        return Response({'detail': 'Incorrect password.'}, status=status.HTTP_403_FORBIDDEN)
    
    from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
    OutstandingToken.objects.filter(user=request.user).delete()
    request.user.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['GET'])
@permission_classes([AllowAny])
def health(request):
    return Response({'status': 'ok'})


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([RegistrationRateThrottle])  # reuse existing throttle
def request_password_reset(request):
    email = request.data.get('email', '').strip()
    if not email:
        return Response({'detail': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

    # Always return 200 even if email not found — prevents user enumeration
    user = User.objects.filter(email=email).first()
    if user:
        token = default_token_generator.make_token(user)
        uid   = urlsafe_base64_encode(force_bytes(user.pk))
        link  = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"

        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            'from':    'what-do <noreply@what-do.onrender.com>',
            'to':      [email],
            'subject': 'Reset your what-do password',
            'html':    build_reset_email(user.username, link),
        })

    return Response({'detail': 'If that email exists, a reset link has been sent.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def confirm_password_reset(request):
    uid      = request.data.get('uid', '')
    token    = request.data.get('token', '')
    password = request.data.get('password', '').strip()

    if not all([uid, token, password]):
        return Response({'detail': 'All fields are required.'}, status=status.HTTP_400_BAD_REQUEST)

    if len(password) < 6:
        return Response({'detail': 'Password must be at least 6 characters.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        pk   = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=pk)
    except (User.DoesNotExist, ValueError, TypeError):
        return Response({'detail': 'Invalid reset link.'}, status=status.HTTP_400_BAD_REQUEST)

    if not default_token_generator.check_token(user, token):
        return Response({'detail': 'This reset link has expired or already been used.'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(password)
    user.save()

    # Invalidate all existing tokens so old sessions can't continue
    from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
    OutstandingToken.objects.filter(user=user).delete()

    return Response({'detail': 'Password updated successfully.'})


def build_reset_email(username: str, link: str) -> str:
    return f"""
    <div style="font-family:monospace;max-width:480px;margin:0 auto;padding:32px;background:#111118;color:#f0eff8;border-radius:12px">
      <h1 style="font-size:1.4rem;color:#7c6aff;margin-bottom:8px">what-d⏰</h1>
      <p style="color:#9896b0;margin-bottom:24px">Password reset request</p>
      <p>Hey <strong>{username}</strong>,</p>
      <p style="margin:16px 0">Someone requested a password reset for your account. If that was you, click below:</p>
      <a href="{link}"
         style="display:inline-block;padding:12px 24px;background:#7c6aff;color:white;border-radius:8px;text-decoration:none;font-weight:600;margin:8px 0">
        Reset my password
      </a>
      <p style="margin-top:24px;font-size:0.8rem;color:#5a5875">
        This link expires in 24 hours. If you didn't request this, ignore this email — your password won't change.
      </p>
      <p style="font-size:0.8rem;color:#5a5875;margin-top:8px">
        Or copy this link: <span style="color:#7c6aff">{link}</span>
      </p>
    </div>
    """

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_stats(request):
    if not request.user.is_staff:
        return Response(status=403)

    now = timezone.now()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    users = User.objects.select_related('profile').all()
    total_users = users.count()
    active_7d   = users.filter(last_login__gte=week_ago).count()
    active_30d  = users.filter(last_login__gte=month_ago).count()
    new_7d      = users.filter(date_joined__gte=week_ago).count()
    locked      = UserProfile.objects.filter(lockout_until__gt=now).count()

    level_dist = list(
        UserProfile.objects.values('level')
        .annotate(count=Count('id'))
        .order_by('level')
    )
    xp_leaderboard = list(
        UserProfile.objects.select_related('user')
        .order_by('-xp')[:10]
        .values('user__username', 'xp', 'level', 'streak')
    )
    streak_leaderboard = list(
        UserProfile.objects.select_related('user')
        .order_by('-streak')[:10]
        .values('user__username', 'streak', 'level')
    )

    total_tasks     = Todo.objects.count()
    completed_tasks = Todo.objects.filter(completed=True).count()
    avg_per_user    = round(total_tasks / total_users, 1) if total_users else 0
    pomodoros_today = UserProfile.objects.filter(
        last_pomodoro_date=now.date()
    ).aggregate(total=Count('id'))['total']

    # signups per day last 7 days
    from django.db.models.functions import TruncDate
    signups_by_day = list(
        User.objects.filter(date_joined__gte=week_ago)
        .annotate(day=TruncDate('date_joined'))
        .values('day').annotate(count=Count('id'))
        .order_by('day')
    )

    return Response({
        'users': {
            'total': total_users, 'active_7d': active_7d,
            'active_30d': active_30d, 'new_7d': new_7d, 'locked': locked,
        },
        'tasks': {
            'total': total_tasks, 'completed': completed_tasks,
            'avg_per_user': avg_per_user, 'completion_rate': round(completed_tasks / total_tasks * 100) if total_tasks else 0,
        },
        'pomodoros_today': pomodoros_today,
        'level_distribution': level_dist,
        'xp_leaderboard': xp_leaderboard,
        'streak_leaderboard': streak_leaderboard,
        'signups_by_day': [{'day': str(r['day']), 'count': r['count']} for r in signups_by_day],
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_unlock_user(request, user_id):
    if not request.user.is_staff:
        return Response(status=403)
    profile = UserProfile.objects.filter(user_id=user_id).first()
    if not profile:
        return Response({'detail': 'Not found'}, status=404)
    profile.failed_login_attempts = 0
    profile.lockout_until = None
    profile.save()
    return Response({'detail': 'Unlocked'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_users(request):
    if not request.user.is_staff:
        return Response(status=403)
    profiles = UserProfile.objects.select_related('user').order_by('-user__date_joined')[:50]
    now = timezone.now()
    return Response([{
        'id': p.user.id, 'username': p.user.username,
        'email': p.user.email, 'joined': str(p.user.date_joined.date()),
        'last_login': str(p.user.last_login.date()) if p.user.last_login else None,
        'level': p.level, 'xp': p.xp, 'streak': p.streak,
        'locked': bool(p.lockout_until and p.lockout_until > now),
        'failed_attempts': p.failed_login_attempts,
    } for p in profiles])