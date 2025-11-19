from django.contrib import admin
from .models import ExamClass, Exam, Question, Choice, Task

# ------------ CHOICE INLINE ------------
class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 1
    fields = ['text', 'score', 'is_correct']


# ------------ QUESTION INLINE ------------
class QuestionInline(admin.StackedInline):
    model = Question
    extra = 1
    fields = ['text', 'question_type', 'required', 'order']
    show_change_link = True
    inlines = [ChoiceInline]


# ------------ EXAM INLINE ------------
class ExamInline(admin.StackedInline):
    model = Exam
    extra = 1
    fields = ['exam_title', 'description', 'start_date', 'end_date']
    readonly_fields = ['token']
    show_change_link = True


# ------------ TASK INLINE ------------
class TaskInline(admin.TabularInline):
    model = Task
    extra = 1
    fields = ['task_title', 'description', 'due_date']


# ------------ EXAM CLASS ADMIN ------------
@admin.register(ExamClass)
class ExamClassAdmin(admin.ModelAdmin):
    list_display = ['name', 'start_date', 'end_date']
    inlines = [ExamInline, TaskInline]


# ------------ QUESTION ADMIN (EDIT CHOICES INSIDE IT) ------------
@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['text', 'exam', 'question_type', 'order']
    inlines = [ChoiceInline]


# ------------ EXAM ADMIN (EDIT QUESTIONS INSIDE IT) ------------
@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ['exam_title', 'exam_class', 'start_date', 'end_date']
    readonly_fields = ['token']
    inlines = [QuestionInline]
