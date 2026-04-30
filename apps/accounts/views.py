from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import UserCreateSerializer
from .models import UserProfile, LEVEL_CONFIG, MAX_LEVEL
from django.utils import timezone
from datetime import timedelta
from apps.todo.models import Category, Todo, StickyNotes


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
        profile.theme_mode = request.data.get('mode', profile.theme_mode)
        profile.theme_custom_colors = request.data.get('custom_colors', profile.theme_custom_colors)
        profile.save()
        return Response({
            'mode': profile.theme_mode,
            'custom_colors': profile.theme_custom_colors,
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    limits = profile.get_limits()
    next_level_xp = None
    if profile.level < MAX_LEVEL:
        next_level_xp = LEVEL_CONFIG[profile.level + 1]['xp']

    return Response({
        'username':     request.user.username,
        'xp':           profile.xp,
        'level':        profile.level,
        'streak':       profile.streak,
        'next_level_xp': next_level_xp,
        'limits': {
            'tasks':      limits['tasks'],
            'categories': limits['categories'],
            'notes':      limits['notes'],
        },
        'counts': {
            'tasks':      Todo.objects.filter(owner=request.user).count(),
            'categories': Category.objects.filter(owner=request.user).count(),
            'notes':      StickyNotes.objects.filter(owner=request.user).count(),
        },
    })


def create_onboarding_data(user):
    getting_started = Category.objects.create(owner=user, name='Getting Started', icon='🚀')
    personal        = Category.objects.create(owner=user, name='Personal', icon='👤')
    work            = Category.objects.create(owner=user, name='Work', icon='💼')
    now = timezone.now()

    Todo.objects.create(
        owner=user, title='Welcome to what-do! 👋',
        description='This is a task. Click the checkmark to complete it and earn XP!',
        priority='low', category=getting_started, pinned=True,
        deadline=now + timedelta(days=1),
    )
    Todo.objects.create(
        owner=user, title='Try creating a new task',
        description='Hit the + button to create your first task.',
        priority='medium', category=getting_started,
        deadline=now + timedelta(days=2),
    )
    Todo.objects.create(
        owner=user, title='Organise with categories',
        description='Categories help you group tasks. Click + next to CATEGORIES to create one.',
        priority='medium', category=getting_started,
        deadline=now + timedelta(days=3),
    )
    Todo.objects.create(
        owner=user, title='Plan your week',
        description='A sample personal task to get you started.',
        priority='medium', category=personal,
        deadline=now + timedelta(days=3),
    )
    Todo.objects.create(
        owner=user, title='First work task',
        description='Try setting this to high priority.',
        priority='high', category=work,
        deadline=now + timedelta(days=1),
    )
    StickyNotes.objects.create(
        owner=user, color='#7c6aff',
        note='📌 Complete tasks to earn XP and level up!\n\nHigher priority tasks and on-time completions earn bonus XP. Keep your streak going for even more!',
    )
    StickyNotes.objects.create(
        owner=user, color='#f59e0b',
        note='🎯 Priority XP bonuses:\n\nLow → 10 XP\nMedium → 10 XP\nHigh → 15 XP\nCritical → 20 XP\n+5 bonus for finishing before deadline!',
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = UserCreateSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        create_onboarding_data(user)
        return Response(
            {'message': 'User created successfully'},
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)