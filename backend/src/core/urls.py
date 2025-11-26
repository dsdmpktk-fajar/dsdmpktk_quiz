"""core URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include

from rest_framework.routers import DefaultRouter
from rest_framework.decorators import api_view
from rest_framework.response import Response

from cv.urls import router as cv_router

@api_view(["GET"])
def api_root(request):
    return Response({
        "cv": request.build_absolute_uri("cv/"),
        "exam": request.build_absolute_uri("exam/"),
    })


urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('allauth.urls')),
    path('', include('frontend.urls')),

    # 🎯 Inilah route yang membuat /api/ tidak 404 lagi
    path('api/', api_root, name="api-root"),

    # Router asli tetap dipakai
    path('api/cv/', include(cv_router.urls)),
    path('api/exam/', include('exam.urls')),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)