from django.urls import path
from . import views

urlpatterns = [
    path('me/', views.me),

    # tasks
    path('tasks/', views.tasks),                    # GET + POST
    path('tasks/<int:task_id>/', views.task_detail), # PATCH + DELETE

    # categories
    path('categories/', views.categories),           # GET + POST
    path('categories/<int:cat_id>/', views.category_detail), # DELETE

    # sticky notes
    path('sticky-notes/', views.notes),              # GET + POST
    path('sticky-notes/<int:pk>/', views.note_detail), # PATCH + DELETE
]