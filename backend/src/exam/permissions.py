from rest_framework.permissions import BasePermission, SAFE_METHODS
from exam.models import CourseParticipant, CourseTask, Exam, CourseTaskSubmission


# =====================================================================
# GLOBAL ADMIN (Django is_staff)
# =====================================================================
class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_staff
        )


# =====================================================================
# Helper: Ambil course_id dari view OR body
# =====================================================================
def extract_course_id(view, request):
    """
    Mendapatkan course_id dari berbagai endpoint:
    - /courses/<pk>/
    - /courses/<pk>/syllabus
    - /tasks/<pk>/submit → task.course_id
    - /exams/<pk>/questions → exam.course_id
    - POST create exam/material: course_id ada di request.data
    """

    # From URL
    course_id = view.kwargs.get("pk") or view.kwargs.get("course_id")

    # ----- Task: pk = task_id -----
    if view.basename == "tasks":
        task_id = view.kwargs.get("pk")
        if task_id:
            try:
                task = CourseTask.objects.get(id=task_id)
                return task.course_id
            except CourseTask.DoesNotExist:
                pass

    # ----- Exam: pk = exam_id -----
    if view.basename == "exams":
        exam_id = view.kwargs.get("pk")
        if exam_id:
            try:
                exam = Exam.objects.get(id=exam_id)
                return exam.course_id
            except Exam.DoesNotExist:
                pass

    # Fallback from POST body (important for exam/material creation)
    if not course_id:
        course_id = request.data.get("course") or request.data.get("course_id")

    return course_id


# =====================================================================
# Helper: cek role user dalam course
# =====================================================================
def user_has_role(user, course_id, roles):
    if not user or not user.is_authenticated:
        return False

    if not course_id:
        return False

    return CourseParticipant.objects.filter(
        course_id=course_id,
        user=user,
        role__in=roles
    ).exists()


# =====================================================================
# Course Participant (semua role)
# =====================================================================
class IsCourseParticipant(BasePermission):
    def has_permission(self, request, view):
        cid = extract_course_id(view, request)
        return user_has_role(request.user, cid, ["participant", "trainer", "assessor"])


# =====================================================================
# Trainer only
# =====================================================================
class IsTrainer(BasePermission):
    def has_permission(self, request, view):
        cid = extract_course_id(view, request)
        return user_has_role(request.user, cid, ["trainer"])


# =====================================================================
# Assessor only
# =====================================================================
class IsAssessor(BasePermission):
    def has_permission(self, request, view):
        cid = extract_course_id(view, request)
        return user_has_role(request.user, cid, ["assessor"])


# =====================================================================
# Trainer OR Assessor
# =====================================================================
class IsTrainerOrAssessor(BasePermission):
    def has_permission(self, request, view):
        cid = extract_course_id(view, request)
        return user_has_role(request.user, cid, ["trainer", "assessor"])


# =====================================================================
# Trainer OR Admin (untuk CRUD Course, Task, Material)
# =====================================================================
class IsTrainerOrAdmin(BasePermission):
    def has_permission(self, request, view):
        if request.user.is_authenticated and request.user.is_staff:
            return True

        cid = extract_course_id(view, request)
        return user_has_role(request.user, cid, ["trainer"])


# =====================================================================
# Exam Creator (Admin + Trainer + Assessor)
# digunakan untuk CRUD exam & CRUD questions
# =====================================================================
class IsExamCreator(BasePermission):
    def has_permission(self, request, view):
        # Admin = always allowed
        if request.user.is_authenticated and request.user.is_staff:
            return True

        cid = extract_course_id(view, request)
        return user_has_role(request.user, cid, ["trainer", "assessor"])


# =====================================================================
# Task Grader (Trainer + Assessor)
# =====================================================================
class IsTaskGrader(BasePermission):
    def has_object_permission(self, request, view, submission: CourseTaskSubmission):
        cid = submission.task.course_id
        return user_has_role(request.user, cid, ["trainer", "assessor"])


# =====================================================================
# Task Submission Owner (peserta hanya boleh melihat punya sendiri)
# =====================================================================
class IsTaskSubmissionOwner(BasePermission):
    def has_object_permission(self, request, view, submission: CourseTaskSubmission):
        return submission.user == request.user


# =====================================================================
# Read-only for all, write-only for admin
# =====================================================================
class ReadOnlyOrAdmin(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_staff
        )
