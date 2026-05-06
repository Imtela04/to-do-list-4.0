from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
import re
from django.shortcuts import get_object_or_404
from datetime import datetime, timezone as dt_timezone
from .serializers import TodoSerializer, CategorySerializer, StickyNoteSerializer
from .models import Todo, Category, StickyNotes
from apps.accounts.models import UserProfile
from django.utils import timezone
import bleach

ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'img', 'ul', 'ol', 'li']
ALLOWED_ATTRS = {'img': ['src', 'alt']}


def normalize_note_html(html: str) -> str:
    html = re.sub(r'<div(?: [^>]*)?>', '<p>', html)
    html = re.sub(r'</div>', '</p>', html)
    html = re.sub(r'<p><br></p>', '<br>', html)
    return html

# ── Helpers ────────────────────────────────────────────────────────────────────

def resolve_category(value, user):
    if not value:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        cat = Category.objects.filter(name=value, owner=user).first()
        return cat.id if cat else None

def parse_deadline(value):
    if not value:
        return None
    return datetime.fromisoformat(value).replace(tzinfo=dt_timezone.utc)

def get_profile(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return profile

def check_limit(profile, resource):
    """
    Returns (allowed: bool, message: str | None)
    resource is 'tasks', 'categories', or 'notes'
    """
    limits = profile.get_limits()
    limit  = limits.get(resource)
    if limit is None:
        return True, None  # unlimited

    user = profile.user
    if resource == 'tasks':
        count = Todo.objects.filter(owner=user, is_onboarding=False).count()
    elif resource == 'categories':
        count = Category.objects.filter(owner=user, is_onboarding=False).count()
    elif resource == 'notes':
        count = StickyNotes.objects.filter(owner=user, is_onboarding=False).count()        return True, None

    if count >= limit:
        next_level = profile.level + 1
        from apps.accounts.models import LEVEL_CONFIG, MAX_LEVEL
        if profile.level < MAX_LEVEL:
            next_cfg   = LEVEL_CONFIG[next_level]
            needed_xp  = next_cfg['xp'] - profile.xp
            return False, (
                f'You\'ve reached your Level {profile.level} limit of {limit} {resource}. '
                f'Earn {needed_xp} more XP to reach Level {next_level} and unlock more!'
            )
        return False, f'You\'ve reached the maximum {resource} limit.'

    return True, None




# ── Tasks ──────────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def tasks(request):
    if request.method == 'GET':
        todos = Todo.objects.filter(owner=request.user)

        completed = request.query_params.get('completed')
        if completed is not None:
            todos = todos.filter(completed=completed.lower() == 'true')

        cat_id = request.query_params.get('category')
        if cat_id:
            todos = todos.filter(category_id=cat_id)

        has_deadline = request.query_params.get('has_deadline')
        if has_deadline is not None:
            todos = todos.filter(deadline__isnull=has_deadline.lower() != 'true')

        ALLOWED_SORT = {'created_at', '-created_at', 'deadline', '-deadline', 'title', '-title'}
        sort = request.query_params.get('sort', '-created_at')
        if sort not in ALLOWED_SORT:
            sort = '-created_at'
        todos = todos.order_by(sort)

        return Response(TodoSerializer(todos, many=True).data)

    # POST
    title = request.data.get('title', '').strip()
    if not title:
        return Response({'detail': 'Title is required'}, status=status.HTTP_400_BAD_REQUEST)
    if len(title) > 255:
        return Response({'detail': 'Title too long'}, status=status.HTTP_400_BAD_REQUEST)
    if Todo.objects.filter(title=title, owner=request.user).exists():
        return Response({'detail': 'Task already exists'}, status=status.HTTP_409_CONFLICT)

    profile = get_profile(request.user)
    allowed, message = check_limit(profile, 'tasks')
    if not allowed:
        return Response({'detail': message, 'limit_reached': True}, status=status.HTTP_403_FORBIDDEN)

    task = Todo.objects.create(
        title=title,
        owner=request.user,
        description=(request.data.get('description') or '').strip() or None,
        deadline=parse_deadline(request.data.get('deadline')),
        category_id=resolve_category(request.data.get('category'), request.user),
        priority=request.data.get('priority', 'low'),
    )
    return Response(TodoSerializer(task).data, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def task_detail(request, task_id):
    task = Todo.objects.filter(id=task_id, owner=request.user).first()
    if not task:
        return Response({'detail': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'DELETE':
        task.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PATCH
    was_completed = task.completed
    xp_result     = None

    if 'title' in request.data:
        task.title = request.data['title']
    if 'description' in request.data:
        task.description = request.data['description']
    if 'completed' in request.data:
        new_completed = request.data['completed']
        if isinstance(new_completed, str):
            new_completed = new_completed.lower() == 'true'
        task.completed = new_completed
        if task.completed and not was_completed:
            task.completed_at = timezone.now()
        elif not task.completed:
            task.completed_at = None
    if 'deadline' in request.data:
        task.deadline = parse_deadline(request.data['deadline'])
    if 'category' in request.data:
        task.category_id = resolve_category(request.data['category'], request.user)
    if 'priority' in request.data:
        task.priority = request.data['priority']
    if 'pinned' in request.data:
        task.pinned = request.data['pinned']
    if 'title' in request.data:
        title = request.data['title'].strip()
        if len(title) > 255:
            return Response({'detail': 'Title too long'}, status=status.HTTP_400_BAD_REQUEST)
        task.title = title
    task.save()

    # XP logic — only when completion state changes
    if 'completed' in request.data:
        profile = get_profile(request.user)
        if task.completed and not was_completed:
            xp_result = profile.award_xp(task)
        elif not task.completed and was_completed:
            profile.deduct_xp()
            xp_result = {
                'xp_gained':  -5,
                'total_xp':   profile.xp,
                'leveled_up': False,
                'new_level':  profile.level,   # ← add this
                'streak':     profile.streak,
            }
    data = TodoSerializer(task).data
    if xp_result:
        data['xp_result'] = xp_result

    return Response(data)


# ── Categories ─────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def categories(request):
    if request.method == 'GET':
        cats = Category.objects.filter(owner=request.user)
        return Response(CategorySerializer(cats, many=True).data)

    name = request.data.get('name', '').strip()
    icon = request.data.get('icon', '🏷️').strip()
    if not name:
        return Response({'detail': 'Name is required'}, status=status.HTTP_400_BAD_REQUEST)
    if len(name) > 100:
        return Response({'detail': 'Name too long (max 100 characters)'}, status=status.HTTP_400_BAD_REQUEST)
    if len(icon) > 10:
        return Response({'detail': 'Invalid icon'}, status=status.HTTP_400_BAD_REQUEST)
    
    profile = get_profile(request.user)
    allowed, message = check_limit(profile, 'categories')
    if not allowed:
        return Response({'detail': message, 'limit_reached': True}, status=status.HTTP_403_FORBIDDEN)

    cat = Category.objects.create(name=name, icon=icon, owner=request.user)
    return Response(CategorySerializer(cat).data, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def category_detail(request, cat_id):
    cat = Category.objects.filter(id=cat_id, owner=request.user).first()
    if not cat:
        return Response({'detail': 'Category not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        cat.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    cat.name = request.data.get('name', cat.name)
    if request.data.get('icon'):
        cat.icon = request.data['icon']
    cat.save()
    return Response(CategorySerializer(cat).data)


# ── Sticky Notes ───────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def notes(request):
    if request.method == 'GET':
        n = StickyNotes.objects.filter(owner=request.user)
        return Response(StickyNoteSerializer(n, many=True).data)

    content = request.data.get('note', '').strip()
    if not content:
        return Response({'detail': 'Content is required'}, status=status.HTTP_400_BAD_REQUEST)

    profile = get_profile(request.user)
    allowed, message = check_limit(profile, 'notes')
    if not allowed:
        return Response({'detail': message, 'limit_reached': True}, status=status.HTTP_403_FORBIDDEN)

    clean_content = bleach.clean(
        normalize_note_html(content),
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRS,
        protocols=['http', 'https', 'data'],
        strip=True,
    )
    note = StickyNotes.objects.create(note=clean_content, owner=request.user)
    return Response(StickyNoteSerializer(note).data, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def note_detail(request, pk):
    note = get_object_or_404(StickyNotes, pk=pk, owner=request.user)

    if request.method == 'DELETE':
        note.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    request_content = request.data.get('note', note.note)
    normalized_content = normalize_note_html(request_content)

    note.note = bleach.clean(
        normalized_content,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRS,
        protocols=['http', 'https', 'data'],
        strip=True,
    )
    note.color = request.data.get('color', note.color)
    note.save()
    return Response(StickyNoteSerializer(note).data)