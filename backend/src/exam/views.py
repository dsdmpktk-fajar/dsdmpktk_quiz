from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from django.utils import timezone

from rest_framework import viewsets, status, permissions as drf_permissions
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response

import openpyxl
from openpyxl.utils import get_column_letter
from .permissions import IsAdmin
# ============================
# IMPORT MODELS
# ============================
from .models import (
    Course,
    CourseParticipant,
    CourseSyllabus,
    CourseMaterial,
    Exam,
    Question,
    Choice,
    UserExam,
    UserAnswer,
    CourseTask,
    CourseTaskSubmission,
    CourseTaskSubmissionFile,
    CourseRequirementAnswer,
    CourseAssessment,
    CourseRequirementSubmission,
    CourseAssessmentCriteria
)

# ============================
# IMPORT SERIALIZERS
# ============================
from .serializers import (
    CourseSerializer,
    CourseParticipantSerializer,
    CourseSyllabusSerializer,
    CourseSyllabusCreateUpdateSerializer,
    CourseJoinSerializer,
    AssignRoleSerializer,

    CourseMaterialSerializer,
    CourseMaterialCreateUpdateSerializer,

    ExamAdminSerializer,
    ExamPublicSerializer,
    ExamResultSerializer,

    QuestionCreateUpdateSerializer,
    QuestionPublicSerializer,

    SubmitAnswerSerializer,
    QuestionAdminSerializer,

    CourseTaskSerializer,
    CourseTaskSubmissionSerializer,
    CourseTaskSubmissionFileSerializer,

    CourseRequirementTemplateSerializer,
    CourseRequirementSubmissionSerializer,
    CourseRequirementAnswerSerializer,
    CourseRequirementSubmission,

    CourseAssessmentCriteriaSerializer,
    CourseAssessmentCreateSerializer,
    CourseAssessmentSerializer
)

# ============================
# IMPORT PERMISSIONS
# ============================
from .permissions import (
    IsAdmin,
    IsCourseParticipant,
    IsTrainer,
    IsAssessor,
    IsTrainerOrAssessor,
    IsExamParticipant,
    IsExamInstructorOrAssessor,
    IsTaskSubmissionOwner,
    IsTaskGrader,
    ReadOnlyOrAdmin,
    user_role_in_course,
)

# ================================================================
# ⚡  COURSE VIEWSET
# ================================================================
class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all().order_by("-created_at")
    serializer_class = CourseSerializer
    permission_classes = [drf_permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAdmin()]
        return [drf_permissions.IsAuthenticated()]

    # -----------------------
    # JOIN COURSE
    # -----------------------
    @action(detail=True, methods=["post"], url_path="join")
    def join(self, request, pk=None):
        course = self.get_object()

        # Jika ada persyaratan → user HARUS apply dulu
        if course.requirements.exists():
            return Response({
                "detail": "Course ini memerlukan approval admin.",
                "requires_approval": True
            }, status=400)

        # Jika TIDAK ada persyaratan → pakai token seperti biasa
        serializer = CourseJoinSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if serializer.validated_data["token"] != course.token:
            return Response({"detail": "Token salah."}, status=400)

        cp, created = CourseParticipant.objects.get_or_create(
            user=request.user,
            course=course
        )

        if not created:
            return Response({"detail": "Anda sudah terdaftar."}, status=400)

        return Response({"detail": "Berhasil join.", "participant_id": cp.id})


    # -----------------------
    # PARTICIPANTS
    # -----------------------
    @action(detail=True, methods=["get"], url_path="participants")
    def participants(self, request, pk=None):
        course = self.get_object()
        qs = CourseParticipant.objects.filter(course=course)
        return Response(CourseParticipantSerializer(qs, many=True).data)

    # -----------------------
    # ASSIGN ROLE (ADMIN/TRAINER)
    # -----------------------
    @action(detail=True, methods=["post"], url_path="assign-role")
    def assign_role(self, request, pk=None):
        course = self.get_object()

        if not (request.user.is_staff or user_role_in_course(request.user, course.id, ["trainer"])):
            return Response({"detail": "Tidak diizinkan."}, status=403)

        ser = AssignRoleSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        user_id = ser.validated_data["user_id"]
        role = ser.validated_data["role"]

        cp, _ = CourseParticipant.objects.get_or_create(user_id=user_id, course=course)
        cp.role = role
        cp.save()

        return Response({"detail": "Role diperbarui."})

    # ============================================================
    # SYLLABUS CRUD
    # ============================================================

    def get_serializer_class(self):
        if self.action in ["syllabus_create", "syllabus_update"]:
            return CourseSyllabusCreateUpdateSerializer
        return CourseSerializer

    

    @action(detail=True, methods=["get"], url_path="syllabus")
    def list_syllabus(self, request, pk=None):
        course = self.get_object()
        syllabus = course.syllabus.all().order_by("id")
        serializer = CourseSyllabusSerializer(syllabus, many=True)
        return Response(serializer.data)

    @action(
        detail=True,
        methods=["post"],
        url_path="syllabus/create",
        url_name="syllabus_create"
    )
    def syllabus_create(self, request, pk=None):
        course = self.get_object()

        if not (request.user.is_staff or user_role_in_course(request.user, course.id, ["trainer", "admin"])):
            return Response({"detail": "Tidak diizinkan."}, status=403)

        serializer = CourseSyllabusCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        syllabus = serializer.save(course=course)

        return Response(CourseSyllabusSerializer(syllabus).data, status=201)

    @action(detail=True, methods=["patch"], url_path="syllabus/(?P<sid>[^/.]+)/update")
    def syllabus_update(self, request, pk=None, sid=None):
        course = self.get_object()
        if not (request.user.is_staff or user_role_in_course(request.user, course.id, ["trainer"])):
            return Response({"detail": "Tidak diizinkan."}, status=403)

        syllabus = get_object_or_404(CourseSyllabus, id=sid, course=course)
        ser = CourseSyllabusCreateUpdateSerializer(syllabus, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()

        return Response(CourseSyllabusSerializer(syllabus).data)

    @action(detail=True, methods=["delete"], url_path="syllabus/(?P<sid>[^/.]+)/delete")
    def syllabus_delete(self, request, pk=None, sid=None):
        course = self.get_object()
        if not (request.user.is_staff or user_role_in_course(request.user, course.id, ["trainer"])):
            return Response({"detail": "Tidak diizinkan."}, status=403)

        syllabus = get_object_or_404(CourseSyllabus, id=sid, course=course)
        syllabus.delete()

        return Response({"detail": "Silabus dihapus."})
    
    # ============================================================
    # LIST TASKS (NEW ENDPOINT)
    # ============================================================
    @action(detail=True, methods=["get"], url_path="tasks")
    def list_tasks(self, request, pk=None):
        course = self.get_object()
        tasks = course.tasks.all().order_by("-created_at")
        serializer = CourseTaskSerializer(tasks, many=True)
        return Response(serializer.data)


    # ============================================================
    # LIST EXAMS (NEW ENDPOINT)
    # ============================================================
    @action(detail=True, methods=["get"], url_path="exams")
    def list_exams(self, request, pk=None):
        course = self.get_object()
        exams = course.exams.all().order_by("-created_at")
        serializer = ExamPublicSerializer(exams, many=True)
        return Response(serializer.data)

    # ============================================================
    # MATERIAL CRUD
    # ============================================================

    @action(detail=True, methods=["get"], url_path="materials")
    def list_materials(self, request, pk=None):
        course = self.get_object()
        materials = course.materials.all().order_by("id")
        serializer = CourseMaterialSerializer(materials, many=True)
        return Response(serializer.data)


    @action(detail=True, methods=["post"], url_path="materials/create")
    def create_material(self, request, pk=None):
        course = self.get_object()
        if not (request.user.is_staff or user_role_in_course(request.user, course.id, ["trainer"])):
            return Response({"detail": "Tidak diizinkan."}, status=403)

        ser = CourseMaterialCreateUpdateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        mat = ser.save(course=course)

        return Response(CourseMaterialSerializer(mat).data, status=201)

    @action(detail=True, methods=["patch"], url_path="materials/(?P<mid>[^/.]+)/update")
    def update_material(self, request, pk=None, mid=None):
        course = self.get_object()
        if not (request.user.is_staff or user_role_in_course(request.user, course.id, ["trainer"])):
            return Response({"detail": "Tidak diizinkan."}, status=403)

        mat = get_object_or_404(CourseMaterial, id=mid, course=course)
        ser = CourseMaterialCreateUpdateSerializer(mat, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()

        return Response(CourseMaterialSerializer(mat).data)

    @action(detail=True, methods=["delete"], url_path="materials/(?P<mid>[^/.]+)/delete")
    def delete_material(self, request, pk=None, mid=None):
        course = self.get_object()
        if not (request.user.is_staff or user_role_in_course(request.user, course.id, ["trainer"])):
            return Response({"detail": "Tidak diizinkan."}, status=403)

        mat = get_object_or_404(CourseMaterial, id=mid, course=course)
        mat.delete()
        return Response({"detail": "Materi dihapus."})
    
    @action(detail=True, methods=["post"], url_path="requirements/create")
    def create_requirement(self, request, pk=None):
        course = self.get_object()

        if not request.user.is_staff:
            return Response({"detail": "Tidak diizinkan."}, status=403)

        serializer = CourseRequirementTemplateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(course=course)

        return Response(serializer.data, status=201)
    
    @action(detail=True, methods=["get"], url_path="requirements")
    def list_requirements(self, request, pk=None):
        course = self.get_object()
        reqs = course.requirements.all().order_by("order")
        return Response(CourseRequirementTemplateSerializer(reqs, many=True).data)
    
    @action(detail=True, methods=["post"], url_path="requirements/submit")
    def submit_requirements(self, request, pk=None):
        course = self.get_object()

        if not course.requirements.exists():
            return Response({"detail": "Course ini tidak memiliki persyaratan."}, status=400)

        data = request.data.copy()
        data["course"] = course.id
        data["user"] = request.user.id

        serializer = CourseRequirementSubmissionSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        submission = serializer.save()

        return Response({
            "detail": "Persyaratan berhasil diajukan.",
            "submission_id": submission.id
        })

    @action(detail=True, methods=["get"], url_path="submissions")
    def submissions(self, request, pk=None):
        course = self.get_object()

        if not request.user.is_staff:
            return Response({"detail": "Tidak diizinkan."}, status=403)

        submissions = CourseRequirementSubmission.objects.filter(course=course)
        return Response(CourseRequirementSubmissionSerializer(submissions, many=True).data)
    
    @action(detail=True, methods=["patch"], url_path="submission/(?P<sid>[^/.]+)/approve")
    def approve_submission(self, request, pk=None, sid=None):
        course = self.get_object()

        if not request.user.is_staff:
            return Response({"detail": "Tidak diizinkan."}, status=403)

        submission = get_object_or_404(
            CourseRequirementSubmission,
            id=sid,
            course=course
        )

        submission.status = "approved"
        submission.reviewed_at = timezone.now()
        submission.reviewer = request.user
        submission.save()

        # otomatis buat participant
        CourseParticipant.objects.get_or_create(
            course=course,
            user=submission.user
        )

        return Response({"detail": "Submission disetujui. User kini menjadi peserta."})
    
    @action(detail=True, methods=["patch"], url_path="submission/(?P<sid>[^/.]+)/reject")
    def reject_submission(self, request, pk=None, sid=None):
        course = self.get_object()

        if not request.user.is_staff:
            return Response({"detail": "Tidak diizinkan."}, status=403)

        submission = get_object_or_404(
            CourseRequirementSubmission,
            id=sid,
            course=course
        )

        submission.status = "rejected"
        submission.note = request.data.get("note", "")
        submission.reviewed_at = timezone.now()
        submission.reviewer = request.user
        submission.save()

        return Response({"detail": "Submission ditolak."})

    @action(
        detail=True,
        methods=["get"],
        url_path="submission/(?P<sid>[^/.]+)/download/(?P<answer_id>[^/.]+)",
        permission_classes=[IsAdmin]
    )
    def download_requirement_file(self, request, pk=None, sid=None, answer_id=None):
        submission = get_object_or_404(
            CourseRequirementSubmission,
            id=sid,
            course_id=pk
        )

        answer = get_object_or_404(
            CourseRequirementAnswer,
            id=answer_id,
            submission=submission
        )

        if not answer.value_file:
            return Response({"detail": "Tidak ada file."}, status=404)

        file_handle = answer.value_file.open("rb")
        response = HttpResponse(file_handle.read(), content_type="application/octet-stream")
        response['Content-Disposition'] = f'attachment; filename="{answer.value_file.name}"'
        file_handle.close()
        return response
    
    @action(detail=True, methods=["post"], url_path="assessment/criteria/create", permission_classes=[IsAdmin])
    def create_criteria(self, request, pk=None):
        course = self.get_object()
        data = request.data.copy()
        data["course"] = course.id
        serializer = CourseAssessmentCriteriaSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=201)

    @action(detail=True, methods=["get"], url_path="assessment/criteria", permission_classes=[drf_permissions.IsAuthenticated])
    def list_criteria(self, request, pk=None):
        course = self.get_object()
        qs = CourseAssessmentCriteria.objects.filter(course=course).order_by("order")
        return Response(CourseAssessmentCriteriaSerializer(qs, many=True).data)

    @action(detail=True, methods=["patch"], url_path="assessment/criteria/(?P<cid>[^/.]+)/update", permission_classes=[IsAdmin])
    def update_criteria(self, request, pk=None, cid=None):
        course = self.get_object()
        crit = get_object_or_404(CourseAssessmentCriteria, id=cid, course=course)
        serializer = CourseAssessmentCriteriaSerializer(crit, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=["delete"], url_path="assessment/criteria/(?P<cid>[^/.]+)/delete", permission_classes=[IsAdmin])
    def delete_criteria(self, request, pk=None, cid=None):
        course = self.get_object()
        crit = get_object_or_404(CourseAssessmentCriteria, id=cid, course=course)
        crit.delete()
        return Response({"detail": "deleted"})

    # --- Submit / update assessment for a user (assessor/trainer/admin) ---
    @action(detail=True, methods=["post"], url_path="assessment/submit", permission_classes=[IsTrainer|IsAdmin|IsAssessor])
    def submit_assessment(self, request, pk=None):
        course = self.get_object()
        # request.data should include 'user' and 'answers' array
        data = request.data.copy()
        data["course"] = course.id
        serializer = CourseAssessmentCreateSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        assessment = serializer.save(assessor=request.user)
        return Response(CourseAssessmentSerializer(assessment).data, status=201)

    # --- Get assessment for a user ---
    @action(detail=True, methods=["get"], url_path="assessment/(?P<user_id>[^/.]+)", permission_classes=[drf_permissions.IsAuthenticated])
    def get_assessment(self, request, pk=None, user_id=None):
        course = self.get_object()
        assessment = CourseAssessment.objects.filter(course=course, user__id=user_id).first()
        if not assessment:
            return Response({"detail": "Not found"}, status=404)
        return Response(CourseAssessmentSerializer(assessment).data)
    
    @action(detail=True, methods=["get"], url_path="evaluation/(?P<user_id>[^/.]+)", permission_classes=[drf_permissions.IsAuthenticated])
    def evaluation(self, request, pk=None, user_id=None):
        """
        Return evaluation summary for user in this course depending on course.evaluation_mode.
        """
        course = self.get_object()
        mode = course.evaluation_mode or "none"

        # Gather exam results for the user
        exams = []
        mandatory_failed = False
        for exam in course.exams.all():
            ue = None
            try:
                ue = exam.userexams.filter(user__id=user_id).order_by("-attempt_number").first()
            except Exception:
                ue = None

            score = ue.score if ue else None
            passed = None
            if score is not None and exam.passing_grade is not None:
                passed = (score >= exam.passing_grade)
            exams.append({
                "exam_id": exam.id,
                "title": getattr(exam, "title", str(exam)),
                "score": score,
                "passing_grade": exam.passing_grade,
                "passed": passed,
                "mandatory": bool(getattr(exam, "is_mandatory", False))
            })
            if exam.is_mandatory and passed is False:
                mandatory_failed = True

        # Gather assessment if exists
        assessment = CourseAssessment.objects.filter(course=course, user__id=user_id).first()
        assessment_data = CourseAssessmentSerializer(assessment).data if assessment else None

        final_status = None
        # Logic depending on mode (fully dynamic)
        if mode == "none":
            return Response({"evaluation_enabled": False})
        if mode == "exam_only":
            if mandatory_failed:
                final_status = "not_passed"
            else:
                final_status = "passed"
        elif mode == "assessment_only":
            final_status = assessment.status if assessment else None
        elif mode == "combined":
            # require that mandatory exams are passed first
            if mandatory_failed:
                final_status = "not_passed"
            else:
                final_status = assessment.status if assessment else None
        elif mode == "manual":
            # manual: if assessment exists, use it, else return None
            final_status = assessment.status if assessment else None

        return Response({
            "evaluation_enabled": True,
            "mode": mode,
            "exams": exams,
            "assessment": assessment_data,
            "final_status": final_status
        })




# ================================================================
# ⚡  EXAM VIEWSET (SUPER FIXED)
# ================================================================
class ExamViewSet(viewsets.ModelViewSet):
    queryset = Exam.objects.all().order_by("-created_at")
    serializer_class = ExamAdminSerializer
    permission_classes = [drf_permissions.IsAuthenticated]

    # --------------------------------------------
    # PERMISSIONS
    # --------------------------------------------
    def get_permissions(self):
        if self.action in ["start", "questions", "submit", "finish", "my_result"]:
            return [IsCourseParticipant()]

        if self.action in ["list_results", "user_result", "grade_answer", "analytics", "export"]:
            return [IsExamInstructorOrAssessor()]

        if self.action in ["create", "update", "partial_update", "destroy",
                           "create_question", "update_question", "delete_question"]:
            return [IsAdmin()]

        return [drf_permissions.IsAuthenticated()]

    # --------------------------------------------
    # SAFE SERIALIZER HANDLING
    # --------------------------------------------
    def get_serializer_class(self):
        user = self.request.user

        # LIST
        if self.action == "list":
            return ExamPublicSerializer

        # CRUD
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return ExamAdminSerializer

        # DETAIL
        try:
            exam = self.get_object()
        except:
            exam = None

        if user.is_staff:
            return ExamAdminSerializer

        if exam and user_role_in_course(user, exam.course_id, ["trainer"]):
            return ExamAdminSerializer

        return ExamPublicSerializer

    # ============================================================
    # RESULTS
    # ============================================================
    @action(detail=True, methods=["get"], url_path="results")
    def list_results(self, request, pk=None):
        exam = self.get_object()
        results = UserExam.objects.filter(exam=exam)
        return Response(ExamResultSerializer(results, many=True).data)

    @action(detail=True, methods=["get"], url_path="results/(?P<user_id>[^/.]+)")
    def user_result(self, request, pk=None, user_id=None):
        exam = self.get_object()
        result = get_object_or_404(UserExam, exam=exam, user_id=user_id)
        return Response(ExamResultSerializer(result).data)

    @action(detail=True, methods=["get"], url_path="my-result")
    def my_result(self, request, pk=None):
        exam = self.get_object()
        result = UserExam.objects.filter(
            exam=exam,
            user=request.user
        ).order_by("-attempt_number").first()

        if not result:
            return Response({"detail": "Belum mengikuti exam ini."}, status=404)

        return Response(ExamResultSerializer(result).data)

    # ============================================================
    # GRADE ANSWER (ASSESSOR)
    # ============================================================
    @action(detail=True, methods=["post"], url_path="grade-answer/(?P<answer_id>[^/.]+)")
    def grade_answer(self, request, pk=None, answer_id=None):
        exam = self.get_object()
        ans = get_object_or_404(UserAnswer, id=answer_id, user_exam__exam=exam)

        if not CourseParticipant.objects.filter(
            course=exam.course,
            user=request.user,
            role="assessor"
        ).exists() and not request.user.is_staff:
            return Response({"detail": "Tidak diizinkan."}, status=403)

        ans.score = request.data.get("score")
        ans.graded = True
        ans.save()

        return Response({"detail": "Jawaban dinilai."})

    # ============================================================
    # START EXAM
    # ============================================================
    @action(detail=True, methods=["post"], url_path="start")
    def start(self, request, pk=None):
        exam = self.get_object()

        if not exam.is_open():
            return Response({"detail": "Exam tidak aktif."}, status=400)

        if not CourseParticipant.objects.filter(course=exam.course, user=request.user).exists():
            return Response({"detail": "Anda bukan peserta."}, status=403)

        prev = UserExam.objects.filter(user=request.user, exam=exam).count()

        if exam.attempt_limit and prev >= exam.attempt_limit:
            return Response({"detail": "Limit attempt tercapai."}, status=400)

        ue = UserExam.objects.create(
            user=request.user,
            exam=exam,
            attempt_number=prev + 1,
            start_time=timezone.now(),
            status="in_progress",
        )

        return Response({
            "detail": "Exam dimulai.",
            "user_exam_id": ue.id,
            "attempt_number": ue.attempt_number,
        })

    # ============================================================
    # QUESTION CRUD
    # ============================================================
    @action(detail=True, methods=["post"], url_path="questions/create")
    def create_question(self, request, pk=None):
        exam = self.get_object()
        ser = QuestionCreateUpdateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        q = Question.objects.create(exam=exam, **ser.validated_data)
        return Response({"question_id": q.id}, status=201)

    @action(detail=True, methods=["patch"], url_path="questions/(?P<qid>[^/.]+)/update")
    def update_question(self, request, pk=None, qid=None):
        exam = self.get_object()
        q = get_object_or_404(Question, id=qid, exam=exam)
        ser = QuestionCreateUpdateSerializer(q, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response({"detail": "Updated."})

    @action(detail=True, methods=["delete"], url_path="questions/(?P<qid>[^/.]+)/delete")
    def delete_question(self, request, pk=None, qid=None):
        exam = self.get_object()
        q = get_object_or_404(Question, id=qid, exam=exam)
        q.delete()
        return Response({"detail": "Deleted."})

    # ============================================================
    # GET QUESTIONS
    # ============================================================
    @action(detail=True, methods=["get"], url_path="questions")
    def questions(self, request, pk=None):
        exam = self.get_object()

        if not CourseParticipant.objects.filter(course=exam.course, user=request.user).exists():
            return Response({"detail": "Tidak diizinkan."}, status=403)

        qs = exam.questions.all()

        if exam.shuffle_questions:
            qs = qs.order_by("?")

        if exam.random_question_count:
            qs = qs[: exam.random_question_count]

        return Response(QuestionPublicSerializer(qs, many=True).data)

    # ============================================================
    # SUBMIT ANSWERS
    # ============================================================
    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, pk=None):
        exam = self.get_object()
        user_exam_id = request.data.get("user_exam")

        ue = get_object_or_404(UserExam, id=user_exam_id, exam=exam, user=request.user)

        if ue.status != "in_progress":
            return Response({"detail": "Exam sudah selesai."}, status=400)

        ser = SubmitAnswerSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        for ans in ser.validated_data["answers"]:
            qid = ans["question"]
            q = get_object_or_404(Question, id=qid, exam=exam)

            ua, created = UserAnswer.objects.get_or_create(
                user_exam=ue,
                question=q
            )

            if "selected_choices" in ans:
                ids = ans["selected_choices"]
                choices = Choice.objects.filter(id__in=ids, question=q)
                ua.selected_choices.set(choices)

            if "text_answer" in ans:
                ua.text_answer = ans["text_answer"]

            ua.save()

        return Response({"detail": "Jawaban disimpan."})

    # ============================================================
    # FINISH EXAM
    # ============================================================
    @action(detail=True, methods=["post"], url_path="finish")
    def finish(self, request, pk=None):
        exam = self.get_object()

        ue = get_object_or_404(
            UserExam,
            id=request.data.get("user_exam"),
            exam=exam,
            user=request.user
        )

        if ue.status == "completed":
            return Response({"detail": "Sudah selesai."})

        raw = 0
        total = 0

        for ans in ue.answers.select_related("question"):
            q = ans.question

            if q.question_type in ["MCQ", "CHECK", "DROPDOWN", "TRUEFALSE"]:
                score_sum = sum(c.score for c in ans.selected_choices.all())
                ans.score = min(score_sum, q.points)
                ans.graded = True
                ans.save()
                raw += ans.score

            total += q.points

        ue.raw_score = raw
        ue.score = (raw / total) * 100 if total > 0 else 0
        ue.status = "completed"
        ue.end_time = timezone.now()
        ue.finished = True
        ue.save()

        return Response({
            "detail": "Exam selesai.",
            "score": ue.score,
            "raw_score": ue.raw_score
        })
    

    # ============================================================
    # ANALYTICS
    # ============================================================
    @action(detail=True, methods=["get"], url_path="analytics")
    def analytics(self, request, pk=None):
        exam = self.get_object()

        user_exams = UserExam.objects.filter(exam=exam)
        participants = CourseParticipant.objects.filter(course=exam.course, role="participant")
        completed = user_exams.filter(status="completed")

        scores = list(completed.values_list("score", flat=True))
        high = max(scores) if scores else None
        low = min(scores) if scores else None
        avg = sum(scores) / len(scores) if scores else None

        distr = {
            "0-20": sum(1 for s in scores if 0 <= s <= 20),
            "21-40": sum(1 for s in scores if 21 <= s <= 40),
            "41-60": sum(1 for s in scores if 41 <= s <= 60),
            "61-80": sum(1 for s in scores if 61 <= s <= 80),
            "81-100": sum(1 for s in scores if 81 <= s <= 100),
        }

        passed = completed.filter(score__gte=exam.passing_grade).count() if exam.passing_grade else None

        return Response({
            "total_participants": participants.count(),
            "total_attempts": user_exams.count(),
            "completed_count": completed.count(),
            "highest_score": high,
            "lowest_score": low,
            "average_score": avg,
            "score_distribution": distr,
            "passing_grade": exam.passing_grade,
            "passed_count": passed,
        })

    # ============================================================
    # EXPORT EXCEL
    # ============================================================
    @action(detail=True, methods=["get"], url_path="export")
    def export_excel(self, request, pk=None):
        exam = self.get_object()
        user_exams = UserExam.objects.filter(exam=exam).select_related("user")

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Exam Results"

        headers = [
            "User ID", "Username", "Email",
            "Attempt", "Score", "Raw Score", "Status",
            "Start Time", "End Time"
        ]
        ws.append(headers)

        for ue in user_exams:
            ws.append([
                ue.user.id,
                ue.user.username,
                ue.user.email,
                ue.attempt_number,
                ue.score,
                ue.raw_score,
                ue.status,
                ue.start_time.strftime("%Y-%m-%d %H:%M") if ue.start_time else "",
                ue.end_time.strftime("%Y-%m-%d %H:%M") if ue.end_time else "",
            ])

        for col in ws.columns:
            l = max(len(str(v.value)) for v in col)
            ws.column_dimensions[get_column_letter(col[0].column)].width = l + 2

        resp = HttpResponse(
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        resp["Content-Disposition"] = f"attachment; filename=exam_{exam.id}_results.xlsx"
        wb.save(resp)

        return resp
    
    @action(
    detail=True,
    methods=["get"],
    url_path="competency-summary",
    permission_classes=[IsExamInstructorOrAssessor | IsAdmin]
    )
    def competency_summary(self, request, pk=None):
        exam = self.get_object()

        # Ambil semua attempt yang selesai
        user_exams = UserExam.objects.filter(exam=exam, status="completed")

        # Inisialisasi hasil per kategori
        result = {}

        for ue in user_exams:
            answers = UserAnswer.objects.filter(user_exam=ue).select_related("question")

            for ans in answers:
                category = ans.question.category or "uncategorized"
                score = ans.score or 0

                if category not in result:
                    result[category] = {
                        "total_score": 0,
                        "count": 0,
                    }

                result[category]["total_score"] += score
                result[category]["count"] += 1

        summary = []
        for category, data in result.items():
            avg = data["total_score"] / data["count"]

            if avg < 1.5:
                level = "Belum"
            elif avg < 2.5:
                level = "Cukup"
            elif avg < 3.5:
                level = "Menguasai"
            else:
                level = "Sangat Menguasai"

            summary.append({
                "category": category,
                "average_score": round(avg, 2),
                "level": level,
            })

        return Response(summary)



# ================================================================
# TASK VIEWSET
# ================================================================
class CourseTaskViewSet(viewsets.ModelViewSet):
    queryset = CourseTask.objects.all().order_by("-created_at")
    serializer_class = CourseTaskSerializer
    permission_classes = [drf_permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAdmin()]
        if self.action == "submit_task":
            return [IsCourseParticipant()]
        return [drf_permissions.IsAuthenticated()]

    @action(detail=True, methods=["post"], url_path="submit")
    def submit_task(self, request, pk=None):
        task = self.get_object()

        if not CourseParticipant.objects.filter(course=task.course, user=request.user).exists():
            return Response({"detail": "Tidak diizinkan."}, status=403)

        if CourseTaskSubmission.objects.filter(task=task, user=request.user).exists():
            return Response({"detail": "Sudah submit."}, status=400)

        sub = CourseTaskSubmission.objects.create(task=task, user=request.user)

        for f in request.FILES.getlist("files"):
            CourseTaskSubmissionFile.objects.create(submission=sub, file=f)

        return Response({
            "detail": "Submit berhasil.",
            "submission_id": sub.id
        }, status=201)


# ================================================================
# TASK SUBMISSION VIEWSET
# ================================================================
class TaskSubmissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CourseTaskSubmission.objects.all().order_by("-submitted_at")
    serializer_class = CourseTaskSubmissionSerializer
    permission_classes = [drf_permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAdmin(), IsTrainerOrAssessor()]
        return [drf_permissions.IsAuthenticated()]


class AdminDashboardAPIView(APIView):
    """
    GET /api/exam/dashboard/admin/
    Return aggregated data used by Admin Dashboard.
    """
    permission_classes = [drf_permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        today = timezone.localdate()

        # Basic counts
        total_courses = Course.objects.count()
        total_participants = CourseParticipant.objects.filter(role="participant").count()
        total_trainers = CourseParticipant.objects.filter(role="trainer").values("user").distinct().count()
        total_assessors = CourseParticipant.objects.filter(role="assessor").values("user").distinct().count()
        total_exams = Exam.objects.count()
        total_tasks = CourseTask.objects.count()

        # Pending requirement approvals
        pending_requirements = CourseRequirementSubmission.objects.filter(status="pending").count()

        # Pending task grading: submissions that are not graded
        pending_task_grading = CourseTaskSubmission.objects.filter(graded=False).count()

        # Pending essay grading (UserAnswer with text_answer and graded=False)
        pending_essay_grading = UserAnswer.objects.filter(text_answer__isnull=False, text_answer__exact="",).count()
        # Note: above line counts empty text answers; better detect non-empty:
        pending_essay_grading = UserAnswer.objects.filter(text_answer__isnull=False).exclude(text_answer="").filter(graded=False).count()

        # Running / active courses (overlapping today)
        running_courses_qs = Course.objects.filter(start_date__lte=today, end_date__gte=today).order_by("start_date")[:10]
        running_courses = [
            {"id": c.id, "title": c.title, "start_date": c.start_date, "end_date": c.end_date}
            for c in running_courses_qs
        ]

        # Active exams (now between start and end time) - show those with end_time >= now
        now = timezone.now()
        active_exams_qs = Exam.objects.filter(start_time__lte=now, end_time__gte=now).select_related("course")[:10]
        active_exams = [
            {
                "id": e.id,
                "title": e.title,
                "course_title": e.course.title if e.course else None,
                "end_time": e.end_time
            }
            for e in active_exams_qs
        ]

        # Tasks due today
        tasks_due_today_qs = CourseTask.objects.filter(due_date=today).select_related("course")[:10]
        tasks_due_today = [
            {"id": t.id, "course_title": t.course.title if t.course else None, "title": t.title, "due_date": t.due_date}
            for t in tasks_due_today_qs
        ]

        data = {
            "stats": {
                "total_courses": total_courses,
                "total_participants": total_participants,
                "total_trainers": total_trainers,
                "total_assessors": total_assessors,
                "total_exams": total_exams,
                "total_tasks": total_tasks,
                "pending_requirements": pending_requirements,
                "pending_task_grading": pending_task_grading,
                "pending_essay_grading": pending_essay_grading
            },
            "running_courses": running_courses,
            "active_exams": active_exams,
            "today_deadlines": tasks_due_today
        }

        return Response(data, status=status.HTTP_200_OK)