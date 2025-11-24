from django.shortcuts import render
from exam.models import CourseParticipant, Exam
from cv.models import UserProfile
from django.contrib.auth.decorators import login_required

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
def page_exams(request):
    return render(request, "pages/exams/index.html")