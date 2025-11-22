from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

import openpyxl
from openpyxl.utils import get_column_letter

from django.http import HttpResponse
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db import models
from django.utils import timezone

from .models import (
    Course, CourseParticipant, CourseSyllabus,
    Exam, Question, Choice,
    UserExam, UserAnswer,
    CourseTask, CourseTaskSubmission,
    CourseTaskSubmissionFile, CourseMaterial
)

from .serializers import (
    AssignRoleSerializer,CourseSerializer, CourseParticipantSerializer, CourseSyllabusSerializer,
    ExamAdminSerializer, ExamPublicSerializer,
    QuestionAdminSerializer, QuestionPublicSerializer,
    ChoiceAdminSerializer, ChoicePublicSerializer,
    UserExamSerializer, UserAnswerSerializer, SubmitAnswerSerializer,
    CourseTaskSerializer, CourseTaskSubmissionSerializer, CourseTaskSubmissionFileSerializer,
    CourseJoinSerializer, CourseSyllabusCreateUpdateSerializer,
    ChoiceCreateUpdateSerializer,CourseMaterialCreateUpdateSerializer,CourseMaterialSerializer
)

from .permissions import (
    IsAdmin,
    IsExamParticipant,
    IsExamInstructorOrAssessor,
    IsCourseParticipant,
    IsAssessor,
    IsTrainer,
)


User = get_user_model()

# ==========
# COURSE VIEW SET
# ==========
class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]
    

    # JOIN COURSE VIA TOKEN
    @action(detail=False, methods=["post"], url_path="join")
    def join(self, request):
        serializer = CourseJoinSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data["token"]
        course = get_object_or_404(Course, token=token)

        # Check already joined
        if CourseParticipant.objects.filter(course=course, user=request.user).exists():
            return Response({"detail": "Anda sudah tergabung dalam course ini."}, status=200)

        # Check quota
        if course.quota and course.participants.count() >= course.quota:
            return Response({"detail": "Kuota peserta penuh."}, status=400)

        participant = CourseParticipant.objects.create(
            user=request.user,
            course=course,
            role="participant"
        )

        return Response({
            "detail": "Berhasil bergabung.",
            "course": course.id,
            "participant_id": participant.id
        })
    
    @action(detail=True, methods=["post"], url_path="assign-role", permission_classes=[IsAdmin])
    def assign_role(self, request, pk=None):
        course = self.get_object()
        serializer = AssignRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_id = serializer.validated_data["user_id"]
        role = serializer.validated_data["role"]

        # Ambil user
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"detail": "User tidak ditemukan."}, status=400)

        # Jika sudah ada, update role
        cp, created = CourseParticipant.objects.get_or_create(
            course=course,
            user=user,
            defaults={"role": role},
        )

        if not created:
            cp.role = role
            cp.save()

        return Response({
            "detail": "Role berhasil diassign.",
            "course_id": course.id,
            "user_id": user.id,
            "role": cp.role
        })
    
    @action(
        detail=True,
        methods=["post"],
        url_path="syllabus/create",
        permission_classes=[IsTrainer | IsAdmin]
    )
    def create_syllabus(self, request, pk=None):
        course = self.get_object()
        serializer = CourseSyllabusCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        syllabus = CourseSyllabus.objects.create(
            course=course,
            **serializer.validated_data
        )

        return Response({
            "detail": "Syllabus berhasil ditambahkan.",
            "id": syllabus.id
        }, status=201)
    
    @action(
        detail=True,
        methods=["patch"],
        url_path="syllabus/(?P<sid>[^/.]+)/update",
        permission_classes=[IsTrainer | IsAdmin]
    )
    def update_syllabus(self, request, pk=None, sid=None):
        course = self.get_object()
        syllabus = get_object_or_404(CourseSyllabus, id=sid, course=course)

        serializer = CourseSyllabusCreateUpdateSerializer(
            syllabus,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({"detail": "Syllabus berhasil diperbarui."})
    
    @action(
        detail=True,
        methods=["delete"],
        url_path="syllabus/(?P<sid>[^/.]+)/delete",
        permission_classes=[IsTrainer | IsAdmin]
    )
    def delete_syllabus(self, request, pk=None, sid=None):
        course = self.get_object()
        syllabus = get_object_or_404(CourseSyllabus, id=sid, course=course)
        syllabus.delete()

        return Response({"detail": "Syllabus berhasil dihapus."})


    # LIST PARTICIPANT
    @action(detail=True, methods=["get"], url_path="participants")
    def participants(self, request, pk=None):
        course = self.get_object()
        role = request.query_params.get("role")

        qs = CourseParticipant.objects.filter(course=course)

        # Filter by role
        if role:
            qs = qs.filter(role=role)

        serializer = CourseParticipantSerializer(qs, many=True)
        return Response(serializer.data)
    
    @action(
        detail=True,
        methods=["delete"],
        url_path="participants/(?P<user_id>[^/.]+)/remove",
        permission_classes=[IsAdmin]
    )
    def remove_participant(self, request, pk=None, user_id=None):
        course = self.get_object()

        qs = CourseParticipant.objects.filter(course=course, user_id=user_id)
        if not qs.exists():
            return Response({"detail": "Peserta tidak ditemukan."}, status=404)

        qs.delete()

        return Response({"detail": "Peserta berhasil dihapus."})

    # LIST SYLLABUS
    @action(detail=True, methods=["get"], url_path="syllabus")
    def syllabus(self, request, pk=None):
        course = self.get_object()
        qs = CourseSyllabus.objects.filter(course=course).order_by("order")
        serializer = CourseSyllabusSerializer(qs, many=True)
        return Response(serializer.data)
    
    @action(
        detail=True,
        methods=["patch"],
        url_path="participants/(?P<user_id>[^/.]+)/update-role",
        permission_classes=[IsAdmin]
    )
    def update_role(self, request, pk=None, user_id=None):
        course = self.get_object()
        new_role = request.data.get("role")

        if new_role not in ["participant", "trainer", "assessor"]:
            return Response({"detail": "Role tidak valid."}, status=400)

        try:
            cp = CourseParticipant.objects.get(course=course, user_id=user_id)
        except CourseParticipant.DoesNotExist:
            return Response({"detail": "Peserta tidak ditemukan."}, status=404)

        cp.role = new_role
        cp.save()

        return Response({
            "detail": "Role berhasil diperbarui.",
            "user_id": user_id,
            "course_id": course.id,
            "role": new_role,
        })
    
    @action(detail=True, methods=["get"], url_path="analytics")
    def course_analytics(self, request, pk=None):
        course = self.get_object()

        participants = CourseParticipant.objects.filter(course=course)
        syllabus_count = course.syllabus.count()
        exam_count = course.exams.count()
        task_count = course.tasks.count()

        submissions = CourseTaskSubmission.objects.filter(task__course=course)
        submitted_per_task = (
            submissions.values("task_id")
            .annotate(count=models.Count("id"))
        )   

        return Response({
            "total_participants": participants.count(),
            "participants_breakdown": {
                "participant": participants.filter(role="participant").count(),
                "trainer": participants.filter(role="trainer").count(),
                "assessor": participants.filter(role="assessor").count(),
            },
            "syllabus_count": syllabus_count,
            "exam_count": exam_count,
            "task_count": task_count,
            "task_submissions": list(submitted_per_task),
        })
    
    
    @action(
        detail=True,
        methods=["post"],
        url_path="materials/create",
        permission_classes=[IsAdmin | IsTrainer]
    )
    def create_material(self, request, pk=None):
        course = self.get_object()

        serializer = CourseMaterialCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        material = CourseMaterial.objects.create(
            course=course,
            **serializer.validated_data
        )

        return Response({
            "detail": "Materi berhasil ditambahkan.",
            "id": material.id
        }, status=201)


    @action(
        detail=True,
        methods=["patch"],
        url_path="materials/(?P<mid>[^/.]+)/update",
        permission_classes=[IsAdmin | IsTrainer]
    )
    def update_material(self, request, pk=None, mid=None):
        course = self.get_object()
        material = get_object_or_404(CourseMaterial, id=mid, course=course)

        serializer = CourseMaterialCreateUpdateSerializer(material, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({"detail": "Materi berhasil diperbarui."})



    @action(
        detail=True,
        methods=["delete"],
        url_path="materials/(?P<mid>[^/.]+)/delete",
        permission_classes=[IsAdmin | IsTrainer]
    )
    def delete_material(self, request, pk=None, mid=None):
        course = self.get_object()
        material = get_object_or_404(CourseMaterial, id=mid, course=course)
        material.delete()

        return Response({"detail": "Materi berhasil dihapus."})



    @action(detail=True, methods=["get"], url_path="materials")
    def list_materials(self, request, pk=None):
        course = self.get_object()
        qs = course.materials.all()
        serializer = CourseMaterialSerializer(qs, many=True)
        return Response(serializer.data)


    

# ===================================================================
# EXAM VIEWSET
# ===================================================================
class ExamViewSet(viewsets.ModelViewSet):
    queryset = Exam.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "destroy"]:
            return [IsAdmin()]

        if self.action in ["start", "questions", "submit", "finish"]:
            return [IsExamParticipant()]

        return [permissions.IsAuthenticated()] 


    def get_serializer_class(self):
        """Admin = full detail, Participant = public anti-cheat"""
        exam = self.get_object() if self.action in ["retrieve", "start", "questions"] else None
        user = self.request.user

        # Admin check (superuser or staff)
        if exam and user.is_staff or user_role_in_course(user, exam.course.id, ["trainer"]):
            return ExamAdminSerializer

        # Default for participants
        if self.action in ["list", "retrieve"]:
            return ExamPublicSerializer

        # Create / update by admin
        if self.action in ["create", "update", "partial_update"]:
            return ExamAdminSerializer

        return ExamPublicSerializer
    
    @action(
        detail=True,
        methods=["get"],
        url_path="results",
        permission_classes=[IsExamInstructorOrAssessor | IsAdmin]
    )
    def list_results(self, request, pk=None):
        exam = self.get_object()
        results = UserExam.objects.filter(exam=exam)
        serializer = ExamResultSerializer(results, many=True)
        return Response(serializer.data)


    @action(
        detail=True,
        methods=["get"],
        url_path="results/(?P<user_id>[^/.]+)",
        permission_classes=[IsExamInstructorOrAssessor | IsAdmin]
    )
    def user_result(self, request, pk=None, user_id=None):
        exam = self.get_object()
        result = get_object_or_404(UserExam, exam=exam, user_id=user_id)
        serializer = ExamResultSerializer(result)
        return Response(serializer.data)


    @action(
        detail=True,
        methods=["get"],
        url_path="my-result",
        permission_classes=[IsExamParticipant]
    )
    def my_result(self, request, pk=None):
        exam = self.get_object()
        result = UserExam.objects.filter(exam=exam, user=request.user).order_by("-attempt_number").first()

        if not result:
            return Response({"detail": "Anda belum mengikuti exam ini."}, status=404)

        serializer = ExamResultSerializer(result)
        return Response(serializer.data)

    @action(
        detail=True,
        methods=["post"],
        url_path="grade-answer/(?P<answer_id>[^/.]+)",
        permission_classes=[IsAssessor | IsAdmin]
    )
    def grade_answer(self, request, pk=None, answer_id=None):
        exam = self.get_object()

        # Ambil jawaban user
        answer = get_object_or_404(
            UserAnswer,
            id=answer_id,
            user_exam__exam=exam
        )

        # Validasi role → hanya assessor course ini
        course = exam.course
        if not CourseParticipant.objects.filter(
            course=course, 
            user=request.user, 
            role="assessor"
        ).exists() and not request.user.is_staff:
            return Response({"detail": "Tidak diizinkan."}, status=403)

        serializer = GradeAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        answer.score = serializer.validated_data["score"]
        answer.graded = True
        answer.save()

        return Response({
            "detail": "Jawaban telah dinilai.",
            "answer_id": answer.id,
            "score": answer.score
        })


    # ------------------------------------------------------
    # START EXAM (BEGIN AN ATTEMPT)
    # ------------------------------------------------------
    @action(detail=True, methods=["post"], url_path="start")
    def start(self, request, pk=None):
        exam = self.get_object()

        # Check if exam open
        if not exam.is_open():
            return Response({"detail": "Exam ditutup."}, status=400)

        # Check if user is participant of this course
        if not CourseParticipant.objects.filter(course=exam.course, user=request.user).exists():
            return Response({"detail": "Anda bukan peserta course ini."}, status=403)

        # Check attempt limit
        previous_attempts = UserExam.objects.filter(user=request.user, exam=exam).count()
        if exam.attempt_limit and previous_attempts >= exam.attempt_limit:
            return Response({"detail": "Limit attempt tercapai."}, status=400)

        attempt_number = previous_attempts + 1

        user_exam = UserExam.objects.create(
            user=request.user,
            exam=exam,
            attempt_number=attempt_number,
            start_time=timezone.now(),
            status="in_progress",
        )

        return Response({
            "detail": "Exam dimulai.",
            "user_exam_id": user_exam.id,
            "attempt_number": attempt_number
        })


    @action(
        detail=True,
        methods=["post"],
        url_path="questions/create",
        permission_classes=[IsAdmin | IsTrainer]
    )
    def create_question(self, request, pk=None):
        exam = self.get_object()
        serializer = QuestionCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        question = Question.objects.create(
            exam=exam,
            **serializer.validated_data
        )

        return Response({
            "detail": "Question created.",
            "question_id": question.id
        }, status=201)
    

    @action(
        detail=True,
        methods=["patch"],
        url_path="questions/(?P<qid>[^/.]+)/update",
        permission_classes=[IsAdmin | IsTrainer]
    )
    def update_question(self, request, pk=None, qid=None):
        exam = self.get_object()
        question = get_object_or_404(Question, id=qid, exam=exam)

        serializer = QuestionCreateUpdateSerializer(
            question,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({"detail": "Question updated."})

    @action(
        detail=True,
        methods=["delete"],
        url_path="questions/(?P<qid>[^/.]+)/delete",
        permission_classes=[IsAdmin | IsTrainer]
    )
    def delete_question(self, request, pk=None, qid=None):
        exam = self.get_object()
        question = get_object_or_404(Question, id=qid, exam=exam)
        question.delete()
        return Response({"detail": "Question deleted."})


    # ------------------------------------------------------
    # GET QUESTIONS (APPLY SHUFFLE + RANDOM SUBSET)
    # ------------------------------------------------------
    @action(detail=True, methods=["get"], url_path="questions")
    def questions(self, request, pk=None):
        exam = self.get_object()

        # must be participant
        if not CourseParticipant.objects.filter(course=exam.course, user=request.user).exists():
            return Response({"detail": "Tidak diizinkan."}, status=403)

        questions = exam.questions.all()

        # Shuffle questions
        if exam.shuffle_questions:
            questions = list(questions.order_by("?"))

        # Random subset
        if exam.random_question_count:
            questions = questions[: exam.random_question_count]

        serializer = QuestionPublicSerializer(questions, many=True)
        return Response(serializer.data)


    # ------------------------------------------------------
    # SUBMIT ANSWERS
    # ------------------------------------------------------
    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, pk=None):
        exam = self.get_object()

        user_exam_id = request.data.get("user_exam")
        user_exam = get_object_or_404(UserExam, id=user_exam_id, exam=exam, user=request.user)

        if user_exam.status != "in_progress":
            return Response({"detail": "Exam sudah selesai."}, status=400)

        serializer = SubmitAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        answers_list = serializer.validated_data["answers"]

        # Save answers
        for ans_data in answers_list:
            q_id = ans_data.get("question")
            question = get_object_or_404(Question, id=q_id, exam=exam)

            user_answer, created = UserAnswer.objects.get_or_create(
                user_exam=user_exam,
                question=question
            )

            # MCQ / CHECK
            if "selected_choices" in ans_data:
                selected_ids = ans_data["selected_choices"]
                choices = Choice.objects.filter(id__in=selected_ids, question=question)
                user_answer.selected_choices.set(choices)

            # TEXT
            if "text_answer" in ans_data:
                user_answer.text_answer = ans_data["text_answer"]

            user_answer.save()

        return Response({"detail": "Jawaban disimpan."})


    # ------------------------------------------------------
    # FINISH EXAM
    # ------------------------------------------------------
    @action(detail=True, methods=["post"], url_path="finish")
    def finish(self, request, pk=None):
        exam = self.get_object()
        user_exam_id = request.data.get("user_exam")

        user_exam = get_object_or_404(UserExam, id=user_exam_id, exam=exam, user=request.user)

        if user_exam.status == "completed":
            return Response({"detail": "Exam sudah diselesaikan."})

        # Auto scoring
        raw_score = 0
        total_points = 0

        for ans in user_exam.answers.select_related("question").all():
            q = ans.question

            if q.question_type in ["MCQ", "CHECK", "DROPDOWN", "TRUEFALSE"]:
                # Score = sum choices
                score_sum = sum(c.score for c in ans.selected_choices.all())
                ans.score = min(score_sum, q.points)
                ans.graded = True
                ans.save()
                raw_score += ans.score

            total_points += q.points

        user_exam.raw_score = raw_score
        user_exam.score = (raw_score / total_points) * 100 if total_points > 0 else 0
        user_exam.status = "completed"
        user_exam.end_time = timezone.now()
        user_exam.finished = True
        user_exam.save()

        return Response({
            "detail": "Exam selesai.",
            "score": user_exam.score,
            "raw_score": user_exam.raw_score,
        })
    
    @action(
        detail=True,
        methods=["get"],
        url_path="analytics",
        permission_classes=[IsExamInstructorOrAssessor | IsAdmin]
    )
    def analytics(self, request, pk=None):
        exam = self.get_object()

        user_exams = UserExam.objects.filter(exam=exam)
        participants = CourseParticipant.objects.filter(course=exam.course, role="participant")

        total_participants = participants.count()
        total_attempts = user_exams.count()
        completed_exams = user_exams.filter(status="completed")

        # Hitung statistik
        scores = list(completed_exams.values_list("score", flat=True))
        high = max(scores) if scores else None
        low = min(scores) if scores else None
        avg = sum(scores) / len(scores) if scores else None

        # distribusi nilai 0–100
        distribution = {
            "0-20": sum(1 for s in scores if 0 <= s <= 20),
            "21-40": sum(1 for s in scores if 21 <= s <= 40),
            "41-60": sum(1 for s in scores if 41 <= s <= 60),
            "61-80": sum(1 for s in scores if 61 <= s <= 80),
            "81-100": sum(1 for s in scores if 81 <= s <= 100),
        }

        # passing grade
        passed = completed_exams.filter(score__gte=exam.passing_grade).count() if exam.passing_grade else None

        return Response({
            "total_participants": total_participants,
            "total_attempts": total_attempts,
            "attempt_rate": (total_attempts / total_participants * 100) if total_participants else 0,
            "completed_count": completed_exams.count(),
            "average_score": avg,
            "highest_score": high,
            "lowest_score": low,
            "score_distribution": distribution,
            "passing_grade": exam.passing_grade,
            "passed_count": passed,
            "not_passed_count": (completed_exams.count() - passed) if passed is not None else None
        })
    
    @action(
        detail=True,
        methods=["get"],
        url_path="export",
        permission_classes=[IsExamInstructorOrAssessor | IsAdmin]
    )
    def export_excel(self, request, pk=None):
        exam = self.get_object()
        user_exams = UserExam.objects.filter(exam=exam).select_related("user")

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Exam Results"

        headers = [
            "User ID",
            "Username",
            "Email",
            "Attempt",
            "Score",
            "Raw Score",
            "Status",
            "Start Time",
            "End Time",
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

        # auto adjust column width
        for col in ws.columns:
            length = max(len(str(cell.value)) for cell in col)
            ws.column_dimensions[get_column_letter(col[0].column)].width = length + 2

        response = HttpResponse(
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        filename = f"exam_{exam.id}_results.xlsx"
        response["Content-Disposition"] = f"attachment; filename={filename}"

        wb.save(response)
        return response




# ===================================================================
# TASK VIEWSET
# ===================================================================
class CourseTaskViewSet(viewsets.ModelViewSet): 
    queryset = CourseTask.objects.all()
    serializer_class = CourseTaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action == "submit_task":
            return [IsCourseParticipant()]

        return [permissions.IsAuthenticated()]

    # SUBMISSION
    @action(detail=True, methods=["post"], url_path="submit")
    def submit_task(self, request, pk=None):
        task = self.get_object()

        # Check participant
        if not CourseParticipant.objects.filter(course=task.course, user=request.user).exists():
            return Response({"detail": "Tidak diizinkan."}, status=403)

        # Check existing submission limit
        if CourseTaskSubmission.objects.filter(task=task, user=request.user).exists():
            return Response({"detail": "Sudah submit sebelumnya."}, status=400)

        submission = CourseTaskSubmission.objects.create(
            task=task,
            user=request.user,
        )

        # Upload files
        files = request.FILES.getlist("files")
        for f in files:
            CourseTaskSubmissionFile.objects.create(
                submission=submission,
                file=f
            )

        return Response({"detail": "Submission berhasil.", "submission_id": submission.id})


class TaskSubmissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CourseTaskSubmission.objects.all()
    serializer_class = CourseTaskSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(
        detail=True,
        methods=["post"],
        url_path="grade",
        permission_classes=[IsAssessor | IsAdmin]
    )
    def grade_submission(self, request, pk=None):
        submission = self.get_object()
        task = submission.task
        course = task.course

        # hanya assessor, bukan trainer atau participant
        if not CourseParticipant.objects.filter(
            course=course, 
            user=request.user, 
            role="assessor"
        ).exists() and not request.user.is_staff:
            return Response({"detail": "Tidak diizinkan."}, status=403)

        serializer = GradeTaskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        submission.score = serializer.validated_data["score"]
        submission.graded = True
        submission.remarks = serializer.validated_data.get("remarks", "")
        submission.save()

        return Response({
            "detail": "Submission berhasil dinilai.",
            "submission_id": submission.id,
            "score": submission.score
        })



class ChoiceViewSet(viewsets.ViewSet):
    
    permission_classes = [IsAdmin | IsTrainer]

    @action(detail=True, methods=["post"], url_path="choices/create")
    def create_choice(self, request, pk=None):
        question = get_object_or_404(Question, id=pk)
        serializer = ChoiceCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        choice = Choice.objects.create(
            question=question,
            **serializer.validated_data
        )

        return Response({
            "detail": "Choice created.",
            "choice_id": choice.id
        }, status=201)
    

    @action(detail=True, methods=["patch"], url_path="choices/(?P<cid>[^/.]+)/update")
    def update_choice(self, request, pk=None, cid=None):
        question = get_object_or_404(Question, id=pk)
        choice = get_object_or_404(Choice, id=cid, question=question)

        serializer = ChoiceCreateUpdateSerializer(
            choice,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({"detail": "Choice updated."})
    
    
    @action(detail=True, methods=["delete"], url_path="choices/(?P<cid>[^/.]+)/delete")
    def delete_choice(self, request, pk=None, cid=None):
        question = get_object_or_404(Question, id=pk)
        choice = get_object_or_404(Choice, id=cid, question=question)
        choice.delete()
        return Response({"detail": "Choice deleted."})



