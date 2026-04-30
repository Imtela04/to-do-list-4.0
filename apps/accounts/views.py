# from django.shortcuts import render
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from .serializers import UserCreateSerializer
from rest_framework.views import APIView
# from .serializers import ThemeSerializer
from .models import UserProfile
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


def create_onboarding_data(user):
    # Categories
    getting_started = Category.objects.create(
        owner=user, name='Getting Started', icon='🚀'
    )
    personal = Category.objects.create(
        owner=user, name='Personal', icon='👤'
    )
    work = Category.objects.create(
        owner=user, name='Work', icon='💼'
    )

    now = timezone.now()

    # Tasks
    Todo.objects.create(
        owner=user,
        title='Welcome to what-do! 👋',
        description='This is a task. You can set a priority, assign it to a category, add a deadline, and pin it to the top. Click the checkmark to complete it.',
        priority='low',
        category=getting_started,
        pinned=True,
        deadline=now + timedelta(days=1),
    )
    Todo.objects.create(
        owner=user,
        title='Try creating a new task',
        description='Hit the + button in the bottom right corner to create your first task. Give it a title, pick a priority, and assign a category.',
        priority='medium',
        category=getting_started,
        deadline=now + timedelta(days=2),
    )
    Todo.objects.create(
        owner=user,
        title='Organise with categories',
        description='See the sidebar on the left? Categories help you group tasks. Click the + next to CATEGORIES to create one. You can give it a name and an emoji icon.',
        priority='medium',
        category=getting_started,
        deadline=now + timedelta(days=3),
    )
    Todo.objects.create(
        owner=user,
        title='Filter and search your tasks',
        description='Use the search bar to find tasks by name. Use the filter and sort buttons next to it to filter by status or sort by priority and due date.',
        priority='low',
        category=getting_started,
        deadline=now + timedelta(days=4),
    )
    Todo.objects.create(
        owner=user,
        title='Switch between views',
        description='See the icons in the top right? You can switch between list view, board view, and calendar view. Calendar view shows your tasks by due date.',
        priority='low',
        category=getting_started,
        deadline=now + timedelta(days=5),
    )
    Todo.objects.create(
        owner=user,
        title='Plan your week',
        description='A sample personal task to get you started. Try setting deadlines on your tasks to keep track of what needs to be done and when.',
        priority='medium',
        category=personal,
        deadline=now + timedelta(days=3),
    )
    Todo.objects.create(
        owner=user,
        title='First work task',
        description='A sample work task. Try setting this to high priority and see how it appears in your task list.',
        priority='high',
        category=work,
        deadline=now + timedelta(days=1),
    )

    # Sticky notes
    StickyNotes.objects.create(
        owner=user,
        color='#7c6aff',
        note='📌 Sticky notes live here!\n\nUse them for quick thoughts, reminders, or anything you need to jot down fast. Click the + to add one.',
    )
    StickyNotes.objects.create(
        owner=user,
        color='#f59e0b',
        note='💡 Tip: Pin important tasks!\n\nClick the pin icon on any task to keep it at the top of your list so it never gets buried.',
    )
    StickyNotes.objects.create(
        owner=user,
        color='#10b981',
        note='🎯 Priority levels:\n\nLow → someday\nMedium → this week\nHigh → soon\nCritical → today!',
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