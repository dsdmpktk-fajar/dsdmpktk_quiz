from django.shortcuts import render,redirect
from exam.models import CourseParticipant, Exam
from cv.models import UserProfile
from django.contrib.auth.decorators import login_required
from django.template.loader import get_template


@login_required
def dashboard_view(request):
    user = request.user

    courses = CourseParticipant.objects.filter(user=user)
    courses_count = courses.count()

    exams_count = Exam.objects.filter(is_active=True).count()

    active_exams = Exam.objects.filter(is_active=True)[:5]

    tasks_count = 0  # nanti dihubungkan dengan CourseTask

    # CV Status
    try:
        profile = UserProfile.objects.get(user=user)
        cv_complete = bool(profile.full_name)
    except UserProfile.DoesNotExist:
        cv_complete = False

    context = {
        "courses": courses,
        "courses_count": courses_count,
        "exams_count": exams_count,
        "active_exams": active_exams,
        "tasks_count": tasks_count,
        "cv_complete": cv_complete,
    }

    return render(request, "pages/dashboard/index.html", context)

@login_required
def page_profile(request):
    return render(request, "pages/cv/profile.html")

@login_required
def page_education(request):
    return render(request, "pages/cv/education.html")

@login_required
def page_work(request):
    return render(request, "pages/cv/work.html")

@login_required
def page_skills(request):
    return render(request, "pages/cv/skills.html")

@login_required
def page_certifications(request):
    return render(request, "pages/cv/certifications.html")

@login_required
def page_languages(request):
    return render(request, "pages/cv/languages.html")

@login_required
def page_trainings(request):
    return render(request, "pages/cv/trainings.html")

@login_required
def page_generate_cv(request):
    return render(request, "pages/cv/generate.html")

@login_required
def page_courses(request):
    return render(request, "pages/courses/index.html")

@login_required
def page_course_requirements(request, course_id):
    return render(request, "pages/courses/requirements.html", {"course_id": course_id})

@login_required
def page_exams(request):
    return render(request, "pages/exams/index.html")

@login_required
def admin_dashboard_page(request):
    if not request.user.is_staff:
        return redirect("/")  # or wherever non-admin go
    return render(request, "dashboard/admin_dashboard.html")

@login_required
def page_course_detail(request, course_id):
    return render(request, "pages/courses/detail.html", {"course_id": course_id})

@login_required
def page_exam_start(request, exam_id):
    return render(request, "pages/exams/start.html", {"exam_id": exam_id})


@login_required
def page_exam_attempt(request, exam_id, user_exam_id):
    tpl = get_template("pages/exams/attempt.html")
    return render(request, "pages/exams/attempt.html", {
        "exam_id": exam_id,
        "attempt_id": user_exam_id,
    })


@login_required
def page_exam_result(request, exam_id, user_exam_id):
    tpl = get_template("pages/exams/attempt.html")
    return render(request, "pages/exams/result.html", {
        "exam_id": exam_id,
        "attempt_id": user_exam_id,  # <-- sama
    })
