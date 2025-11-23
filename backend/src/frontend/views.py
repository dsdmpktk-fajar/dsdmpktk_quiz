from django.shortcuts import render

def dashboard_view(request):
    return render(request, "pages/dashboard/index.html")

def page_profile(request):
    return render(request, "pages/cv/profile.html")

def page_education(request):
    return render(request, "pages/cv/education.html")

def page_work(request):
    return render(request, "pages/cv/work.html")

def page_skills(request):
    return render(request, "pages/cv/skills.html")

def page_certifications(request):
    return render(request, "pages/cv/certifications.html")

def page_languages(request):
    return render(request, "pages/cv/languages.html")

def page_trainings(request):
    return render(request, "pages/cv/trainings.html")

def page_generate_cv(request):
    return render(request, "pages/cv/generate.html")