from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import CourseParticipant, Course, Exam, CourseTask, CourseTaskSubmission


# ===========================================================
# ADMIN GLOBAL (Django is_staff)
# ===========================================================
class IsAdmin(BasePermission):
    """
    Admin global, menggunakan Django is_staff.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.is_staff
        )


# ===========================================================
# ROLE CHECKING UTILITY
# ===========================================================
def get_course_id_from_view(view):
    """
    Ambil ID course dari URL dynamic routing:
    - /courses/<pk>/
    - /courses/<pk>/participants/
    - /tasks/<pk>/submit/ → course diambil dari task.course
    - /exams/<pk>/...
    """
    pk = view.kwargs.get("pk") or view.kwargs.get("course_pk")
    return pk


def user_role_in_course(user, course_id, roles=None):
    """
    Mengecek apakah user memiliki role tertentu dalam course.
    roles bisa berupa ["trainer"], ["assessor"], ["participant"], atau kombinasi.
    """
    qs = CourseParticipant.objects.filter(course_id=course_id, user=user)

    if roles:
        qs = qs.filter(role__in=roles)

    return qs.exists()


# ===========================================================
# PARTICIPANT OF COURSE
# ===========================================================
class IsCourseParticipant(BasePermission):
    """
    User harus terdaftar sebagai participant di course.
    (participant, trainer, assessor → semua role dihitung participant)
    """
    def has_permission(self, request, view):
        course_id = get_course_id_from_view(view)
        if not course_id:
            return False

        return CourseParticipant.objects.filter(
            course_id=course_id,
            user=request.user
        ).exists()


# ===========================================================
# TRAINER
# ===========================================================
class IsTrainer(BasePermission):
    """
    User harus role trainer pada course tersebut.
    """
    def has_permission(self, request, view):
        course_id = get_course_id_from_view(view)
        if not course_id:
            return False

        return user_role_in_course(request.user, course_id, ["trainer"])


# ===========================================================
# ASSESSOR
# ===========================================================
class IsAssessor(BasePermission):
    """
    User harus role assessor pada course tersebut.
    """
    def has_permission(self, request, view):
        course_id = get_course_id_from_view(view)
        if not course_id:
            return False

        return user_role_in_course(request.user, course_id, ["assessor"])


# ===========================================================
# TRAINER OR ASSESSOR
# ===========================================================
class IsTrainerOrAssessor(BasePermission):
    """
    Trainer atau Assessor diperbolehkan.
    """
    def has_permission(self, request, view):
        course_id = get_course_id_from_view(view)
        if not course_id:
            return False

        return user_role_in_course(request.user, course_id, ["trainer", "assessor"])


# ===========================================================
# EXAM PARTICIPANT
# ===========================================================
class IsExamParticipant(BasePermission):
    """
    User harus terdaftar sebagai participant di course milik exam.
    """
    def has_object_permission(self, request, view, exam: Exam):
        return CourseParticipant.objects.filter(
            course=exam.course,
            user=request.user
        ).exists()


# ===========================================================
# EXAM INSTRUCTOR (Trainer/Assessor)
# ===========================================================
class IsExamInstructorOrAssessor(BasePermission):
    """
    Hanya trainer dan assessor yang boleh melihat data peserta exam:
    - melihat answer peserta
    - melihat result peserta
    - mengoreksi essay
    """
    def has_object_permission(self, request, view, exam: Exam):
        return CourseParticipant.objects.filter(
            course=exam.course,
            user=request.user,
            role__in=["trainer", "assessor"]
        ).exists()


# ===========================================================
# TASK SUBMISSION OWNER
# ===========================================================
class IsTaskSubmissionOwner(BasePermission):
    """
    User hanya boleh melihat submitan dirinya sendiri.
    """
    def has_object_permission(self, request, view, submission: CourseTaskSubmission):
        return submission.user == request.user


# ===========================================================
# TASK GRADER (Assessor)
# ===========================================================
class IsTaskGrader(BasePermission):
    """
    Hanya assessor boleh menilai task submission.
    """
    def has_object_permission(self, request, view, submission: CourseTaskSubmission):
        course = submission.task.course
        return CourseParticipant.objects.filter(
            course=course,
            user=request.user,
            role="assessor"
        ).exists()


# ===========================================================
# READONLY UNTUK SEMUA USER, WRITE UNTUK ADMIN/STAFF
# ===========================================================
class ReadOnlyOrAdmin(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_staff
