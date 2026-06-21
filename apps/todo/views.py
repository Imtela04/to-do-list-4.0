from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django.db.models import Count
import re
from django.shortcuts import get_object_or_404
from datetime import datetime, timezone as dt_timezone
from .serializers import TodoSerializer, CategorySerializer, StickyNoteSerializer, SubtaskSerializer, AttachmentSerializer, AttachmentWithTaskSerializer
from .models import Todo, Category, StickyNotes, Subtask, Attachment
from apps.accounts.models import UserProfile
from django.utils import timezone
import bleach
from apps.accounts.views import log, get_resource_count

ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'img', 'ul', 'ol', 'li']
ALLOWED_ATTRS = {'img': ['src', 'alt', 'style']}
SUBTASK_LIMIT = 10


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
        lookup = {'id': int(value), 'owner': user}
    except (ValueError, TypeError):
        lookup = {'name': value, 'owner': user}
    cat = Category.objects.filter(**lookup).first()
    return cat.id if cat else None

def parse_deadline(value):
    if not value:
        return None
    return datetime.fromisoformat(value).replace(tzinfo=dt_timezone.utc)

def get_profile(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return profile

def check_limit(profile, resource):
   
    limits = profile.get_limits()
    limit  = limits.get(resource)
    if limit is None:
        return True, None  # unlimited

    user = profile.user
    count = get_resource_count(user, resource);
    if count >= limit:
        next_level = profile.level + 1
        from apps.accounts.models import LEVEL_CONFIG, MAX_LEVEL
        if profile.level < MAX_LEVEL:
            next_cfg   = LEVEL_CONFIG[next_level]
            needed_xp  = next_cfg['xp'] - profile.xp
            message = f'You\'ve reached your Level {profile.level} limit of {limit} {resource}.\n Earn {needed_xp} more XP to reach Level {next_level} and unlock more {resource}s!'
            if profile.is_guest == True:
                message = f' Sign up to unlock more {resource} and earn XP for completing tasks!'
                           
            return False, message
            
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
        if sort == '-created_at':  # only override default sort
            todos = todos.order_by('position', '-created_at')
        else:
            todos = todos.order_by(sort)

        paginator = PageNumberPagination()
        paginator.page_size = 50
        page = paginator.paginate_queryset(todos, request)
        return paginator.get_paginated_response(TodoSerializer(page, many=True).data)

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

    recurrence = request.data.get('recurrence') or None
    deadline = parse_deadline(request.data.get('deadline'))
    if recurrence and not deadline:
        # Recurring tasks always need a deadline — default to end of today
        deadline = timezone.now().replace(hour=23, minute=59, second=0, microsecond=0)

    task = Todo.objects.create(
        title=title,
        owner=request.user,
        description=(request.data.get('description') or '').strip() or None,
        deadline=deadline,
        category_id=resolve_category(request.data.get('category'), request.user),
        priority=request.data.get('priority', 'low'),
        recurrence=recurrence,
    )

    log(request, 'task_create', detail=task.title)
    return Response(TodoSerializer(task).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def task_detail(request, task_id):
    task = Todo.objects.filter(id=task_id, owner=request.user).first()
    if not task:
        return Response({'detail': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response({'task': TodoSerializer(task).data, 'xp_result': None})

    if request.method == 'DELETE':
        log(request, 'task_delete', detail=task.title)
        task.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    was_completed = task.completed
    xp_result     = None

    if 'title' in request.data:
        title = request.data['title'].strip()
        if len(title) > 255:
            return Response({'detail': 'Title too long'}, status=status.HTTP_400_BAD_REQUEST)
        task.title = title

    if 'description' in request.data:
        desc = (request.data['description'] or '').strip()
        if len(desc) > 2000:
            return Response({'detail': 'Description too long'}, status=status.HTTP_400_BAD_REQUEST)
        task.description = desc or None

    if 'completed' in request.data:
        new_completed = request.data['completed']
        if isinstance(new_completed, str):
            new_completed = new_completed.lower() == 'true'
        task.completed = new_completed

        # cascade to subtasks
        if new_completed:
            task.subtasks.all().update(completed=True, completed_at=timezone.now())
            task.completed_at = timezone.now()
        else:
            task.subtasks.all().update(completed=False, completed_at=None)
            task.completed_at = None

    if 'deadline' in request.data:
        task.deadline = parse_deadline(request.data['deadline'])
    if 'category' in request.data:
        task.category_id = resolve_category(request.data['category'], request.user)
    if 'priority' in request.data:
        task.priority = request.data['priority']
    if 'pinned' in request.data:
        task.pinned = request.data['pinned']
    if 'recurrence' in request.data:
        task.recurrence = request.data['recurrence']

    task.save()

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
                'new_level':  profile.level,
                'streak':     profile.streak,
            }

    data = TodoSerializer(task).data
    if 'completed' in request.data and task.completed and not was_completed:
        log(request, 'task_complete', detail=task.title)
        if xp_result and xp_result.get('leveled_up'):
            log(request, 'level_up', detail=f'Level {xp_result["new_level"]}')
    # Spawn next occurrence on completion
    if 'completed' in request.data and task.completed and not was_completed and task.recurrence:
        base_deadline = task.deadline or timezone.now().replace(hour=23, minute=59, second=0, microsecond=0)
        nd = next_recurrence_deadline(base_deadline, task.recurrence)
        Todo.objects.create(
            title=task.title,
            owner=request.user,
            description=task.description,
            deadline=nd,
            category_id=task.category_id,
            priority=task.priority,
            recurrence=task.recurrence,
        )
    return Response({
        'task':      data,
        'xp_result': xp_result,  # None if no change
    })

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
    log(request, 'cat_create', detail=cat.name)
    return Response(CategorySerializer(cat).data, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def category_detail(request, cat_id):
    cat = Category.objects.filter(id=cat_id, owner=request.user).first()
    if not cat:
        return Response({'detail': 'Category not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        log(request, 'cat_delete', detail=cat.name)
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
    log(request, 'note_create')
    return Response(StickyNoteSerializer(note).data, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def note_detail(request, pk):
    note = get_object_or_404(StickyNotes, pk=pk, owner=request.user)

    if request.method == 'DELETE':
        log(request, 'note_delete')
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

# ── Subtasks ───────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def subtasks(request, task_id):
    task = Todo.objects.filter(id=task_id, owner=request.user).first()
    if not task:
        return Response({'detail': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(SubtaskSerializer(task.subtasks.all(), many=True).data)

    # POST — create subtask
    title = request.data.get('title', '').strip()
    if not title:
        return Response({'detail': 'Title is required'}, status=status.HTTP_400_BAD_REQUEST)
    if len(title) > 255:
        return Response({'detail': 'Title too long'}, status=status.HTTP_400_BAD_REQUEST)
    if not request.user.is_staff:
        if task.subtasks.count() >= SUBTASK_LIMIT:
            return Response(
                {'detail': f'Maximum {SUBTASK_LIMIT} subtasks per task.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    subtask = Subtask.objects.create(task=task, title=title)
    return Response(SubtaskSerializer(subtask).data, status=status.HTTP_201_CREATED)



@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def subtask_detail(request, task_id, subtask_id):
    task = Todo.objects.filter(id=task_id, owner=request.user).first()
    if not task:
        return Response({'detail': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)

    subtask = Subtask.objects.filter(id=subtask_id, task=task).first()
    if not subtask:
        return Response({'detail': 'Subtask not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        subtask.delete()
        # re-check parent after deletion
        profile   = get_profile(request.user)
        changed = task.sync_completion_from_subtasks()
        xp_result = None
        if changed is True:
            xp_result = profile.award_xp(task)
        elif changed is False:
            profile.deduct_xp()
            xp_result = {
                'xp_gained':  -5,
                'total_xp':   profile.xp,
                'leveled_up': False,
                'new_level':  profile.level,
                'streak':     profile.streak,
            }

        data      = TodoSerializer(task).data
        if xp_result:
            data['xp_result'] = xp_result
        return Response(data)

    # PATCH — toggle or rename
    if 'title' in request.data:
        title = request.data['title'].strip()
        if len(title) > 255:
            return Response({'detail': 'Title too long'}, status=status.HTTP_400_BAD_REQUEST)
        subtask.title = title

    if 'completed' in request.data:
        new_completed = request.data['completed']
        if isinstance(new_completed, str):
            new_completed = new_completed.lower() == 'true'
        subtask.completed    = new_completed
        subtask.completed_at = timezone.now() if new_completed else None

    subtask.save()

    profile   = get_profile(request.user)
    changed = task.sync_completion_from_subtasks()
    xp_result = None
    if changed is True:
        xp_result = profile.award_xp(task)
    elif changed is False:
        profile.deduct_xp()
        xp_result = {
            'xp_gained':  -5,
            'total_xp':   profile.xp,
            'leveled_up': False,
            'new_level':  profile.level,
            'streak':     profile.streak,
        }


    data = TodoSerializer(task).data
    return Response({
        'task':      TodoSerializer(task).data,
        'xp_result': xp_result,  # None if no change
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reorder_tasks(request):
    """
    Body: { "order": [id1, id2, id3, ...] }
    Sets position of each task in the given order.
    """
    order = request.data.get('order', [])
    if not isinstance(order, list):
        return Response({'detail': 'order must be a list'}, status=status.HTTP_400_BAD_REQUEST)

    # Verify all tasks belong to this user
    tasks = Todo.objects.filter(owner=request.user, id__in=order)
    if tasks.count() != len(order):
        return Response({'detail': 'Invalid task ids'}, status=status.HTTP_400_BAD_REQUEST)

    id_to_position = {id: idx for idx, id in enumerate(order)}
    for task in tasks:
        task.position = id_to_position[task.id]
    Todo.objects.bulk_update(tasks, ['position'])

    return Response({'detail': 'ok'})

def next_recurrence_deadline(deadline, recurrence):
    """Return the next deadline shifted by the recurrence interval."""
    import calendar
    from datetime import timedelta
    if not deadline or not recurrence:
        return None
    if recurrence == 'daily':
        return deadline + timedelta(days=1)
    if recurrence == 'weekly':
        return deadline + timedelta(weeks=1)
    if recurrence == 'monthly':
        month = deadline.month + 1
        year  = deadline.year
        if month > 12:
            month, year = 1, year + 1
        day = min(deadline.day, calendar.monthrange(year, month)[1])
        return deadline.replace(year=year, month=month, day=day)
    if recurrence == 'yearly':
        return deadline.replace(year=deadline.year + 1)
    return None

from django.db.models.functions import TruncDate

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def task_heatmap(request):
    """Returns completed task counts per day for the last 365 days."""
    from datetime import date, timedelta
    today     = date.today()
    start     = today - timedelta(days=364)

    rows = (
        Todo.objects
        .filter(owner=request.user, completed=True, completed_at__date__gte=start)
        .annotate(day=TruncDate('completed_at'))
        .values('day')
        .annotate(count=Count('id'))
        .order_by('day')
    )

    data = {str(r['day']): r['count'] for r in rows}
    return Response({'start': str(start), 'end': str(today), 'data': data})


ALLOWED_ATTACHMENT_TYPES = {
    'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf',
    'text/plain', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}
MAX_ATTACHMENT_SIZE      = 5 * 1024 * 1024
MAX_ATTACHMENTS_PER_TASK = 5


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def attachments(request, task_id):
    task = Todo.objects.filter(id=task_id, owner=request.user).first()
    if not task:
        return Response({'detail': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(AttachmentSerializer(task.attachments.all(), many=True).data)

    f = request.FILES.get('file')
    if not f:
        return Response({'detail': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
    if f.size > MAX_ATTACHMENT_SIZE:
        return Response({'detail': 'File too large (max 5MB)'}, status=status.HTTP_400_BAD_REQUEST)
    if f.content_type not in ALLOWED_ATTACHMENT_TYPES:
        return Response({'detail': 'File type not allowed'}, status=status.HTTP_400_BAD_REQUEST)
    if task.attachments.count() >= MAX_ATTACHMENTS_PER_TASK:
        return Response({'detail': f'Max {MAX_ATTACHMENTS_PER_TASK} attachments per task'}, status=status.HTTP_400_BAD_REQUEST)

    attachment = Attachment.objects.create(
        task=task, file=f, filename=f.name, size=f.size, content_type=f.content_type,
    )
    return Response(AttachmentSerializer(attachment).data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def attachment_detail(request, task_id, attachment_id):
    attachment = Attachment.objects.filter(
        id=attachment_id, task_id=task_id, task__owner=request.user
    ).first()
    if not attachment:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    attachment.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def media_hub(request):
    qs = Attachment.objects.filter(task__owner=request.user).select_related('task').order_by('-uploaded_at')

    search = request.query_params.get('search')
    if search:
        qs = qs.filter(filename__icontains=search)

    file_type = request.query_params.get('type')
    if file_type == 'image':
        qs = qs.filter(content_type__startswith='image/')
    elif file_type == 'document':
        qs = qs.exclude(content_type__startswith='image/')

    task_id = request.query_params.get('task_id')
    if task_id:
        qs = qs.filter(task_id=task_id)

    return Response(AttachmentWithTaskSerializer(qs, many=True).data)