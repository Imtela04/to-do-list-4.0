from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from datetime import datetime, timezone as dt_timezone
from .serializers import TodoSerializer, CategorySerializer, StickyNoteSerializer
from .models import Todo, Category, StickyNotes

# ── Helpers ────────────────────────────────────────────────────
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

# ── Auth ───────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    return Response({'username': request.user.username})

# ── Tasks ──────────────────────────────────────────────────────
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
    if Todo.objects.filter(title=title, owner=request.user).exists():
        return Response({'detail': 'Task already exists'}, status=status.HTTP_409_CONFLICT)

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
    if 'title' in request.data:
        task.title = request.data['title']
    if 'description' in request.data:
        task.description = request.data['description']
    if 'completed' in request.data:
        task.completed = request.data['completed']
    if 'deadline' in request.data:
        task.deadline = parse_deadline(request.data['deadline'])
    if 'category' in request.data:
        task.category_id = resolve_category(request.data['category'], request.user)
    task.save()
    return Response(TodoSerializer(task).data)


# ── Categories ─────────────────────────────────────────────────
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def categories(request):
    if request.method == 'GET':
        cats = Category.objects.filter(owner=request.user)
        return Response(CategorySerializer(cats, many=True).data)

    # POST
    name = request.data.get('name', '').strip()
    icon = request.data.get('icon', '🏷️').strip()
    if not name:
        return Response({'detail': 'Name is required'}, status=status.HTTP_400_BAD_REQUEST)
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

    # PATCH
    cat.name = request.data.get('name', cat.name)
    if request.data.get('icon'):
        cat.icon = request.data['icon']
    cat.save()
    return Response(CategorySerializer(cat).data)


# ── Sticky Notes ───────────────────────────────────────────────
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def notes(request):
    if request.method == 'GET':
        n = StickyNotes.objects.filter(owner=request.user)
        return Response(StickyNoteSerializer(n, many=True).data)

    # POST
    content = request.data.get('note', '').strip()
    if not content:
        return Response({'detail': 'Content is required'}, status=status.HTTP_400_BAD_REQUEST)
    note = StickyNotes.objects.create(note=content, owner=request.user)
    return Response(StickyNoteSerializer(note).data, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def note_detail(request, pk):
    note = get_object_or_404(StickyNotes, pk=pk, owner=request.user)

    if request.method == 'DELETE':
        note.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PATCH
    note.note = request.data.get('note', note.note)
    note.save()
    return Response(StickyNoteSerializer(note).data)