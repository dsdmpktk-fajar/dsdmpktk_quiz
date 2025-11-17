from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


# =======================
# User Profile
# =======================
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    full_name = models.CharField(max_length=255)
    title_prefix = models.CharField(max_length=50, blank=True, null=True)
    title_suffix = models.CharField(max_length=50, blank=True, null=True)
    birth_date = models.DateField(blank=True, null=True)
    birth_place = models.CharField(max_length=255, blank=True, null=True)
    gender = models.CharField(max_length=10, choices=(('M', 'Laki-laki'), ('F', 'Perempuan')))
    religion = models.CharField(max_length=50, choices=(
        ('Islam','Islam'), ('Kristen Protestan','Kristen Protestan'), 
        ('Katolik','Katolik'), ('Hindu','Hindu'), ('Buddha','Buddha'), 
        ('Konghucu','Konghucu')
    ))
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    linkedin = models.URLField(blank=True, null=True)

    def __str__(self):
        return self.full_name


# =======================
# Education
# =======================
class Education(models.Model):
    DEGREE_CHOICES = [
        ('SLTP', 'SLTP'),
        ('SLTA', 'SLTA'),
        ('S1', 'S1'),
        ('Profesi', 'Profesi'),
        ('S2', 'S2'),
        ('Sp1', 'Sp1'),
        ('S3', 'S3'),
        ('Sp2', 'Sp2'),
    ]

    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='educations')
    degree = models.CharField(max_length=20, choices=DEGREE_CHOICES)
    institution = models.CharField(max_length=255)
    program = models.CharField(max_length=255, blank=True, null=True)
    year_in = models.PositiveIntegerField(blank=True, null=True)
    year_out = models.PositiveIntegerField(blank=True, null=True)
    gpa = models.FloatField(blank=True, null=True)

    def __str__(self):
        return f"{self.degree} - {self.institution}"


# =======================
# Work Experience
# =======================
class WorkExperience(models.Model):
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='work_experiences')
    company = models.CharField(max_length=255)
    position = models.CharField(max_length=255)
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)

    def __str__(self):
        return f"{self.position} @ {self.company}"


# =======================
# Skill
# =======================
class Skill(models.Model):
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='skills')
    category = models.CharField(max_length=100, blank=True, null=True)
    name = models.CharField(max_length=255)

    def __str__(self):
        return self.name


# =======================
# Certification
# =======================
class Certification(models.Model):
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='certifications')
    name = models.CharField(max_length=255)
    issuer = models.CharField(max_length=255)
    issue_date = models.DateField(blank=True, null=True)
    expiry_date = models.DateField(blank=True, null=True)
    file = models.FileField(upload_to='certificates/', blank=True, null=True)

    def __str__(self):
        return self.name
