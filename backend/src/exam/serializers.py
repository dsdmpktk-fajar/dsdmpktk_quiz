from rest_framework import serializers
from django.utils import timezone

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
    CourseTaskSubmissionFile,
    CourseMaterial
)

# ============================================================
# BASIC SERIALIZERS (COURSE)
# ============================================================

class CourseSerializer(serializers.ModelSerializer):
    participants_count = serializers.IntegerField(source='participants.count', read_only=True)

    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "description",
            "method",
            "level",
            "quota",
            "participants_count",
            "start_date",
            "end_date",
            "token",        # hanya admin lihat token
            "created_at",
        ]
        read_only_fields = ["id", "participants_count", "created_at"]


# ============================================================
# COURSE PARTICIPANT
# ============================================================

class CourseParticipantSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_name = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = CourseParticipant
        fields = [
            "id",
            "user",
            "user_email",
            "user_name",
            "role",
            "joined_at",
        ]
        read_only_fields = ["id", "joined_at", "user_email", "user_name"]


# ============================================================
# COURSE SYLLABUS
# ============================================================

class CourseSyllabusSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseSyllabus
        fields = [
            "id",
            "title",
            "description",
            "start_time",
            "end_time",
            "duration_minutes",
            "order",
        ]
        read_only_fields = ["id"]


# ============================================================
# EXAM SERIALIZERS
# ============================================================

# ---------- ADMIN ----------
class ChoiceAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ["id", "text", "score", "order"]
        read_only_fields = ["id"]


class QuestionAdminSerializer(serializers.ModelSerializer):
    choices = ChoiceAdminSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = [
            "id",
            "exam",
            "text",
            "question_type",
            "required",
            "order",
            "points",
            "weight",
            "allow_multiple_files",
            "allow_blank_answer",
            "choices",
        ]
        read_only_fields = ["id"]


class ExamAdminSerializer(serializers.ModelSerializer):
    questions = QuestionAdminSerializer(many=True, read_only=True)

    class Meta:
        model = Exam
        fields = [
            "id",
            "course",
            "title",
            "description",
            "is_private",
            "token",
            "duration_minutes",
            "start_time",
            "end_time",
            "shuffle_questions",
            "shuffle_choices",
            "random_question_count",
            "attempt_limit",
            "passing_grade",
            "is_active",
            "created_at",
            "questions",
        ]
        read_only_fields = ["id", "token", "created_at"]


# ---------- PARTICIPANT (ANTI CHEAT) ----------
class ChoicePublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ["id", "text", "order"]
        read_only_fields = ["id"]


class QuestionPublicSerializer(serializers.ModelSerializer):
    choices = ChoicePublicSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = [
            "id",
            "text",
            "question_type",
            "required",
            "order",
            "points",
            "choices",
        ]
        read_only_fields = ["id"]


class ExamPublicSerializer(serializers.ModelSerializer):
    questions = QuestionPublicSerializer(many=True, read_only=True)

    class Meta:
        model = Exam
        fields = [
            "id",
            "title",
            "description",
            "duration_minutes",
            "start_time",
            "end_time",
            "passing_grade",
            "questions",
        ]
        read_only_fields = ["id"]


# ============================================================
# USER EXAM + USER ANSWER
# ============================================================

class UserAnswerSerializer(serializers.ModelSerializer):
    selected_choices = serializers.PrimaryKeyRelatedField(
        queryset=Choice.objects.all(), many=True, required=False
    )

    class Meta:
        model = UserAnswer
        fields = [
            "id",
            "user_exam",
            "question",
            "selected_choices",
            "text_answer",
            "score",
            "graded",
        ]
        read_only_fields = ["id", "score", "graded"]


class UserExamSerializer(serializers.ModelSerializer):
    answers = UserAnswerSerializer(many=True, read_only=True)
    exam_title = serializers.CharField(source="exam.title", read_only=True)

    class Meta:
        model = UserExam
        fields = [
            "id",
            "user",
            "exam",
            "exam_title",
            "attempt_number",
            "joined_at",
            "start_time",
            "end_time",
            "status",
            "score",
            "raw_score",
            "finished",
            "answers",
        ]
        read_only_fields = [
            "id",
            "joined_at",
            "start_time",
            "end_time",
            "score",
            "raw_score",
            "finished",
            "answers",
        ]


# ============================================================
# SUBMIT ANSWER (PARTICIPANT)
# ============================================================

class SubmitAnswerSerializer(serializers.Serializer):
    """
    Dipakai untuk submit jawaban exam.
    Example:
    {
        "answers": [
            { "question": 5, "selected_choices": [9,10] },
            { "question": 6, "text_answer": "penjelasan" }
        ]
    }
    """
    answers = serializers.ListField()


# ============================================================
# COURSE TASK
# ============================================================

class CourseTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseTask
        fields = [
            "id",
            "course",
            "title",
            "description",
            "due_date",
            "created_at",
            "max_submissions",
        ]
        read_only_fields = ["id", "created_at"]


# ============================================================
# TASK SUBMISSION
# ============================================================

class CourseTaskSubmissionFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseTaskSubmissionFile
        fields = ["id", "file", "uploaded_at"]
        read_only_fields = ["id", "uploaded_at"]


class CourseTaskSubmissionSerializer(serializers.ModelSerializer):
    files = CourseTaskSubmissionFileSerializer(many=True, read_only=True)
    task_title = serializers.CharField(source="task.title", read_only=True)

    class Meta:
        model = CourseTaskSubmission
        fields = [
            "id",
            "task",
            "task_title",
            "user",
            "submitted_at",
            "remarks",
            "graded",
            "score",
            "files",
        ]
        read_only_fields = ["id", "submitted_at", "graded", "score", "files"]


# ============================================================
# JOIN COURSE
# ============================================================

class CourseJoinSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=64, required=True)

    def validate_token(self, value):
        try:
            course = Course.objects.get(token=value)
        except Course.DoesNotExist:
            raise serializers.ValidationError("Token course tidak valid.")

        if not course.is_active:
            raise serializers.ValidationError("Course tidak aktif.")

        # optional: check schedule
        now = timezone.now().date()
        if course.start_date and course.end_date:
            if not (course.start_date <= now <= course.end_date):
                raise serializers.ValidationError("Course belum dimulai atau sudah selesai.")

        return value


class AssignRoleSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    role = serializers.ChoiceField(choices=["participant", "trainer", "assessor"])

class CourseSyllabusCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseSyllabus
        fields = [
            "title",
            "description",
            "start_time",
            "end_time",
            "duration_minutes",
            "order",
        ]


class QuestionCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = [
            "text",
            "question_type",
            "required",
            "order",
            "points",
            "weight",
            "allow_multiple_files",
            "allow_blank_answer",
        ]


class ChoiceCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = [
            "text",
            "score",
            "order",
        ]


class ExamResultSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = UserExam
        fields = [
            "id",
            "user",
            "user_name",
            "user_email",
            "attempt_number",
            "score",
            "raw_score",
            "status",
            "start_time",
            "end_time",
            "finished",
        ]
        read_only_fields = fields


class GradeAnswerSerializer(serializers.Serializer):
    score = serializers.FloatField()
    remarks = serializers.CharField(required=False, allow_blank=True)

class GradeTaskSerializer(serializers.Serializer):
    score = serializers.FloatField()
    remarks = serializers.CharField(required=False, allow_blank=True)



class CourseMaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseMaterial
        fields = [
            "id",
            "course",
            "title",
            "description",
            "material_type",
            "file",
            "url",
            "order",
            "created_at",
        ]
        read_only_fields = ["id", "course", "created_at"]


class CourseMaterialCreateUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = CourseMaterial
        fields = [
            "title",
            "description",
            "material_type",
            "file",
            "url",
            "order",
        ]

    def validate(self, data):
        mtype = data.get("material_type")
        file = data.get("file")
        url = data.get("url")

        if mtype == "link":
            if not url:
                raise serializers.ValidationError("URL wajib diisi untuk materi link.")
        else:
            if not file:
                raise serializers.ValidationError("File wajib diupload untuk materi ini.")

        return data
