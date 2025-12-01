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
    CourseMaterial,
    CourseRequirementTemplate,
    CourseRequirementAnswer,
    CourseRequirementSubmission,
    CourseAssessmentCriteria,
    CourseAssessment,
    CourseAssessmentAnswer,
    UserAnswerFile
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
# COURSE PUBLIC SERIALIZER (UNTUK FRONTEND)
# ============================================================
from .models import CourseParticipant, CourseRequirementSubmission

class CoursePublicSerializer(CourseSerializer):
    joined = serializers.SerializerMethodField()
    requires_approval = serializers.SerializerMethodField()
    requirement_status = serializers.SerializerMethodField()
    token = serializers.SerializerMethodField(read_only=True)

    class Meta(CourseSerializer.Meta):
        fields = CourseSerializer.Meta.fields + [
            "joined",
            "requires_approval",
            "requirement_status",
            "token",
        ]

    # apakah user sudah participant
    def get_joined(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return CourseParticipant.objects.filter(course=obj, user=request.user).exists()

    # apakah course punya requirement template
    def get_requires_approval(self, obj):
        return obj.requirements.exists()

    # pending / approved / rejected / None
    def get_requirement_status(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None

        sub = CourseRequirementSubmission.objects.filter(
            course=obj, user=request.user
        ).order_by("-submitted_at").first()

        return sub.status if sub else None

    # token hanya untuk admin
    def get_token(self, obj):
        request = self.context.get("request")
        if request and request.user.is_staff:
            return obj.token
        return None



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
            "category",
            "sub_category",
            "informant",
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
        fields = ["id", "text", "order", "score"]
        read_only_fields = ["id"]


class QuestionPublicSerializer(serializers.ModelSerializer):
    choices = ChoicePublicSerializer(many=True)
    parent_question = serializers.IntegerField(source="parent_question_id", read_only=True)
    parent_choice = serializers.IntegerField(source="parent_choice_id", read_only=True)
    child_questions = serializers.SerializerMethodField()

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
            "parent_question",
            "parent_choice",
            "child_questions"
        ]
        read_only_fields = ["id"]
    
    def get_child_questions(self, obj):
        return [{"id": q.id, "parent_choice": q.parent_choice_id} for q in obj.child_questions.all()]    



class QuestionCreateUpdateSerializer(serializers.ModelSerializer):
    parent_question = serializers.PrimaryKeyRelatedField(
        queryset=Question.objects.all(), required=False, allow_null=True
    )
    parent_choice = serializers.PrimaryKeyRelatedField(
        queryset=Choice.objects.all(), required=False, allow_null=True
    )


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
            "parent_question",
            "parent_choice"
        ]

    def validate(self, attrs):
        parent_choice = attrs.get("parent_choice")
        parent_question = attrs.get("parent_question")
        if parent_choice and not parent_question:
            raise serializers.ValidationError("parent_choice diberikan tanpa parent_question.")
        if parent_choice and parent_question:
            if parent_choice.question_id != parent_question.id:
                raise serializers.ValidationError("parent_choice harus milik parent_question yang sama.")
        return super().validate(attrs)


class ExamPublicSerializer(serializers.ModelSerializer):
    questions = QuestionPublicSerializer(many=True, read_only=True)
    user_attempt = serializers.SerializerMethodField()

    def get_user_attempt(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        ue = UserExam.objects.filter(exam=obj, user=request.user).order_by("-attempt_number").first()
        return ue.id if ue else None

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
            "user_attempt"
        ]
        read_only_fields = ["id"]


# ============================================================
# USER EXAM + USER ANSWER
# ============================================================

class UserAnswerFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAnswerFile
        fields = ("id", "file", "uploaded_at")

class UserAnswerSerializer(serializers.ModelSerializer):
    selected_choices = serializers.PrimaryKeyRelatedField(
        queryset=Choice.objects.all(), many=True, required=False
    )
    files = UserAnswerFileSerializer(many=True, read_only=True)

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
            "files"
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
            "id",
            "title",
            "description",
            "category",
            "sub_category",
            "informant",
            "start_time",
            "end_time",
            "duration_minutes",
            "order",
        ]


class CourseSyllabusCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseSyllabus
        fields = [
            "id",
            "title",
            "description",
            "category",
            "sub_category",
            "informant",
            "start_time",
            "end_time",
            "duration_minutes",
            "order",
        ]
        extra_kwargs = {
            "description": {"required": False, "allow_blank": True},
            "category": {"required": False, "allow_blank": True, "allow_null": True},
            "sub_category": {"required": False, "allow_blank": True, "allow_null": True},
            "informant": {"required": False, "allow_blank": True, "allow_null": True},
            "start_time": {"required": False, "allow_null": True},
            "end_time": {"required": False, "allow_null": True},
            "duration_minutes": {"required": False, "allow_null": True},
            "order": {"required": False},
        }


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
            "video_url",
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
            "video_url",
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


class CourseRequirementTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseRequirementTemplate
        fields = [
            "id",
            "field_name",
            "field_type",
            "options",
            "required",
            "order",
        ]


class CourseRequirementAnswerSerializer(serializers.ModelSerializer):
    requirement = serializers.PrimaryKeyRelatedField(queryset=CourseRequirementTemplate.objects.all())
    value_file = serializers.FileField(allow_null=True, required=False)

    class Meta:
        model = CourseRequirementAnswer
        fields = ("id", "requirement", "value_text", "value_number", "value_file")


class CourseRequirementSubmissionSerializer(serializers.ModelSerializer):
    answers = CourseRequirementAnswerSerializer(many=True, write_only=True)
    user = serializers.PrimaryKeyRelatedField(read_only=True, default=serializers.CurrentUserDefault())
    reviewer = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = CourseRequirementSubmission
        fields = ("id", "course", "user", "status", "submitted_at", "reviewed_at", "reviewer", "note", "answers")
        read_only_fields = ("status", "submitted_at", "reviewed_at", "reviewer", "id")


    def create(self, validated_data):
        answers_data = validated_data.pop("answers", [])
        # user is set in view (should pass request.user)
        submission = CourseRequirementSubmission.objects.create(**validated_data)
        for ans in answers_data:
            CourseRequirementAnswer.objects.create(
                submission=submission,
                requirement=ans.get("requirement"),
                value_text=ans.get("value_text"),
                value_number=ans.get("value_number"),
                value_file=ans.get("value_file")
            )
        return submission


# Criteria serializer
class CourseAssessmentCriteriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseAssessmentCriteria
        fields = ["id", "course", "name", "max_score", "order"]

# Answer serializer (nested)
class CourseAssessmentAnswerSerializer(serializers.ModelSerializer):
    criteria_detail = CourseAssessmentCriteriaSerializer(source="criteria", read_only=True)

    class Meta:
        model = CourseAssessmentAnswer
        fields = ["id", "criteria", "criteria_detail", "score", "note"]

# Assessment serializer (read)
class CourseAssessmentSerializer(serializers.ModelSerializer):
    answers = CourseAssessmentAnswerSerializer(many=True, read_only=True)
    assessor_detail = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = CourseAssessment
        fields = ["id", "course", "user", "assessor", "assessor_detail", "total_score", "status", "note", "answers", "created_at"]

# Create/update Assessment with nested answers
class CourseAssessmentCreateSerializer(serializers.ModelSerializer):
    answers = CourseAssessmentAnswerSerializer(many=True)

    class Meta:
        model = CourseAssessment
        fields = ["id", "course", "user", "assessor", "status", "note", "answers"]

    def create(self, validated_data):
        answers_data = validated_data.pop("answers", [])
        assessment = CourseAssessment.objects.create(**validated_data)
        for a in answers_data:
            CourseAssessmentAnswer.objects.create(assessment=assessment, **a)
        assessment.recalc_total()
        return assessment

    def update(self, instance, validated_data):
        answers_data = validated_data.pop("answers", None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if answers_data is not None:
            # simple approach: delete old answers and recreate
            instance.answers.all().delete()
            for a in answers_data:
                CourseAssessmentAnswer.objects.create(assessment=instance, **a)
        instance.recalc_total()
        return instance