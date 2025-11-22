from django.contrib import admin
from .models import (
    Course,
    CourseParticipant,
    CourseSyllabus,
    Exam,
    Question,
    Choice,
    UserExam,
    UserAnswer,
    CourseTask,
    CourseTaskSubmission,
    CourseTaskSubmissionFile
)

# ======================================================
# COURSE
# ======================================================

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "method", "level", "quota", "start_date", "end_date", "token", "created_at")
    search_fields = ("title", "description", "token")
    list_filter = ("method", "level")
    readonly_fields = ("token", "created_at")


# ======================================================
# PARTICIPANT
# ======================================================

@admin.register(CourseParticipant)
class CourseParticipantAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "course", "role", "joined_at")
    search_fields = ("user__username", "course__title")
    list_filter = ("role",)


# ======================================================
# SYLLABUS
# ======================================================

@admin.register(CourseSyllabus)
class CourseSyllabusAdmin(admin.ModelAdmin):
    list_display = ("id", "course", "title", "start_time", "end_time", "duration_minutes", "order")
    search_fields = ("title", "course__title")
    list_filter = ("course", )
    ordering = ("order",)


# ======================================================
# EXAM
# ======================================================

@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "course", "is_private", "duration_minutes",
                    "start_time", "end_time", "attempt_limit", "token", "is_active")
    search_fields = ("title", "course__title", "token")
    list_filter = ("is_private", "is_active", "course")
    readonly_fields = ("token", "created_at")


# ======================================================
# QUESTION
# ======================================================

class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 1


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("id", "exam", "text_preview", "question_type", "order", "points", "weight")
    list_filter = ("question_type", "exam")
    search_fields = ("text",)
    ordering = ("order",)
    inlines = [ChoiceInline]

    def text_preview(self, obj):
        return obj.text[:50] + "..." if len(obj.text) > 50 else obj.text


# ======================================================
# USER EXAM & ANSWER
# ======================================================

@admin.register(UserExam)
class UserExamAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "exam", "attempt_number", "status", "score", "raw_score", "finished", "start_time", "end_time")
    list_filter = ("status", "exam", "finished")
    search_fields = ("user__username", "exam__title")


@admin.register(UserAnswer)
class UserAnswerAdmin(admin.ModelAdmin):
    list_display = ("id", "user_exam", "question", "score", "graded")
    list_filter = ("graded", "question__question_type")
    search_fields = ("user_exam__user__username", "question__text")


# ======================================================
# TASK & SUBMISSION
# ======================================================

class TaskSubmissionFileInline(admin.TabularInline):
    model = CourseTaskSubmissionFile
    extra = 0
    readonly_fields = ("file", "uploaded_at")


@admin.register(CourseTask)
class CourseTaskAdmin(admin.ModelAdmin):
    list_display = ("id", "course", "title", "due_date", "created_at", "max_submissions")
    list_filter = ("course",)
    search_fields = ("title",)


@admin.register(CourseTaskSubmission)
class CourseTaskSubmissionAdmin(admin.ModelAdmin):
    list_display = ("id", "task", "user", "submitted_at", "graded", "score")
    list_filter = ("graded", "task")
    search_fields = ("user__username", "task__title")
    inlines = [TaskSubmissionFileInline]


@admin.register(CourseTaskSubmissionFile)
class CourseTaskSubmissionFileAdmin(admin.ModelAdmin):
    list_display = ("id", "submission", "file", "uploaded_at")
    search_fields = ("submission__task__title",)
    list_filter = ("uploaded_at",)
