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
            'tasks':      Todo.objects.filter(owner=request.user, is_onboarding=False).count(),
            'categories': Category.objects.filter(owner=request.user, is_onboarding=False).count(),
            'notes':      StickyNotes.objects.filter(owner=request.user, is_onboarding=False).count(),
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
