from django.contrib import admin
from django.utils import timezone
from .models import (
    Course,
    CourseParticipant,
    CourseSyllabus,
    CourseRequirementTemplate,
    CourseRequirementSubmission,
    CourseRequirementAnswer,
    Exam,
    Question,
    Choice,
    UserExam,
    UserAnswer,
    CourseTask,
    CourseTaskSubmission,
    CourseTaskSubmissionFile,
    CourseAssessment,
    CourseAssessmentCriteria,
    CourseAssessmentAnswer,
    UserAnswerFile
)

# ======================================================
# COURSE
# ======================================================

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "method", "level", "quota",
                    "start_date", "end_date", "token", "created_at")
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
    list_display = ("id", "course", "title", "category", "sub_category",
                    "informant", "start_time", "end_time",
                    "duration_minutes", "order")
    search_fields = ("title", "category", "sub_category")
    list_filter = ("course",)
    ordering = ("order",)


# ======================================================
# REQUIREMENTS (FIXED SESUAI MODEL)
# ======================================================

@admin.register(CourseRequirementTemplate)
class CourseRequirementTemplateAdmin(admin.ModelAdmin):
    list_display = ("id", "course", "field_name", "field_type", "required", "order")
    list_filter = ("course", "field_type", "required")
    search_fields = ("field_name", "course__title")
    ordering = ("course", "order")


class CourseRequirementAnswerInline(admin.TabularInline):
    model = CourseRequirementAnswer
    extra = 0
    fields = ("requirement", "value_text", "value_number", "value_file")
    readonly_fields = ("requirement",)


@admin.register(CourseRequirementSubmission)
class CourseRequirementSubmissionAdmin(admin.ModelAdmin):
    list_display = ("id", "course", "user", "status", "submitted_at", "reviewed_at", "reviewer")
    list_filter = ("status", "course")
    search_fields = ("user__username", "course__title")
    ordering = ("-submitted_at",)

    inlines = [CourseRequirementAnswerInline]

    # ACTIONS
    actions = ["approve_selected", "reject_selected"]

    def approve_selected(self, request, queryset):
        queryset.update(
            status="approved",
            reviewed_at=timezone.now(),
            reviewer=request.user
        )
    approve_selected.short_description = "Approve selected submissions"

    def reject_selected(self, request, queryset):
        queryset.update(
            status="rejected",
            reviewed_at=timezone.now(),
            reviewer=request.user
        )
    reject_selected.short_description = "Reject selected submissions"


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
# QUESTIONS
# ======================================================

class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 1


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("id", "exam", "text_preview", "question_type",
                    "order", "points", "weight")
    list_filter = ("question_type", "exam")
    search_fields = ("text",)
    inlines = [ChoiceInline]

    def text_preview(self, obj):
        return obj.text[:50] + "..." if len(obj.text) > 50 else obj.text


# ======================================================
# USER EXAM
# ======================================================

@admin.register(UserExam)
class UserExamAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "exam", "attempt_number",
                    "status", "score", "raw_score",
                    "finished", "start_time", "end_time")
    list_filter = ("status", "exam", "finished")
    search_fields = ("user__username", "exam__title")


@admin.register(UserAnswer)
class UserAnswerAdmin(admin.ModelAdmin):
    list_display = ("id", "user_exam", "question", "score", "graded")
    list_filter = ("graded", "question__question_type")
    search_fields = ("user_exam__user__username", "question__text")

@admin.register(UserAnswerFile)
class UserAnswerFileAdmin(admin.ModelAdmin):
    list_display = ("id", "answer", "file", "uploaded_at")
    readonly_fields = ("uploaded_at",)
    search_fields = ("answer__user__username", "file")


# ======================================================
# TASK & SUBMISSION
# ======================================================

class TaskSubmissionFileInline(admin.TabularInline):
    model = CourseTaskSubmissionFile
    extra = 0
    readonly_fields = ("file", "uploaded_at")


@admin.register(CourseTask)
class CourseTaskAdmin(admin.ModelAdmin):
    list_display = ("id", "course", "title", "due_date",
                    "created_at", "max_submissions")
    list_filter = ("course",)
    search_fields = ("title",)


@admin.register(CourseTaskSubmission)
class CourseTaskSubmissionAdmin(admin.ModelAdmin):
    list_display = ("id", "task", "user", "submitted_at",
                    "graded", "score")
    list_filter = ("graded", "task")
    search_fields = ("user__username", "task__title")
    inlines = [TaskSubmissionFileInline]


@admin.register(CourseTaskSubmissionFile)
class CourseTaskSubmissionFileAdmin(admin.ModelAdmin):
    list_display = ("id", "submission", "file", "uploaded_at")
    search_fields = ("submission__task__title",)
    list_filter = ("uploaded_at",)


# ======================================================
# ASSESSMENT
# ======================================================

@admin.register(CourseAssessmentCriteria)
class CourseAssessmentCriteriaAdmin(admin.ModelAdmin):
    list_display = ("id", "course", "name", "max_score", "order")
    list_filter = ("course",)
    search_fields = ("name",)


@admin.register(CourseAssessment)
class CourseAssessmentAdmin(admin.ModelAdmin):
    list_display = ("id", "course", "user", "assessor",
                    "total_score", "status", "created_at")
    list_filter = ("status", "course")
    search_fields = ("user__username", "course__title")


@admin.register(CourseAssessmentAnswer)
class CourseAssessmentAnswerAdmin(admin.ModelAdmin):
    list_display = ("id", "assessment", "criteria", "score")
    list_filter = ("criteria",)
    search_fields = ("assessment__user__username", "criteria__name")

