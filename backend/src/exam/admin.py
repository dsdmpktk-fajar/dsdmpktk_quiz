# exam/admin.py
import nested_admin
from django.contrib import admin
from .models import ExamClass, Exam, Question, Choice, UserExam, UserAnswer, Task, TaskSubmission

# -------------------------------
# Choice Inline (nested level 2)
# -------------------------------
class ChoiceInline(nested_admin.NestedTabularInline):
    model = Choice
    extra = 1
    fields = ['text', 'score', 'is_correct']

# -------------------------------
# Question Inline (nested level 1)
# -------------------------------
class QuestionInline(nested_admin.NestedTabularInline):
    model = Question
    extra = 1
    fields = ['text', 'question_type', 'required', 'order']
    inlines = [ChoiceInline]  # Choice inline di dalam question

# -------------------------------
# Exam Inline (nested level 0)
# -------------------------------
class ExamInline(nested_admin.NestedTabularInline):
    model = Exam
    extra = 1
    fields = ['exam_title', 'description', 'start_date', 'end_date', 'token']
    inlines = [QuestionInline]  # Question inline di dalam exam

# -------------------------------
# Task Inline (inline biasa)
# -------------------------------
class TaskInline(admin.TabularInline):
    model = Task
    extra = 1
    fields = ['task_title', 'description', 'due_date']

# -------------------------------
# ExamClass Admin (root)
# -------------------------------
@admin.register(ExamClass)
class ExamClassAdmin(nested_admin.NestedModelAdmin):
    list_display = ['name', 'start_date', 'end_date']
    search_fields = ['name', 'description']
    inlines = [ExamInline, TaskInline]

# -------------------------------
# UserExam Admin
# -------------------------------
@admin.register(UserExam)
class UserExamAdmin(admin.ModelAdmin):
    list_display = ['exam', 'user', 'joined_at']
    search_fields = ['user__username', 'exam__exam_title']

# -------------------------------
# UserAnswer Admin
# -------------------------------
@admin.register(UserAnswer)
class UserAnswerAdmin(admin.ModelAdmin):
    list_display = ['user_exam', 'question', 'score']
    search_fields = ['user_exam__user__username', 'question__text']

# -------------------------------
# TaskSubmission Admin
# -------------------------------
@admin.register(TaskSubmission)
class TaskSubmissionAdmin(admin.ModelAdmin):
    list_display = ['task', 'user', 'submitted_at']
    search_fields = ['user__username', 'task__task_title']
