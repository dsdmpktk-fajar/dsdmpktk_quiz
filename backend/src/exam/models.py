import uuid
import random
from django.conf import settings
from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User



# Class

def generate_token():
    return str(random.randint(100000, 999999))

class Course(models.Model):



    METHOD_CHOICES = [
        ("online", "Online"),
        ("offline", "Offline"),
        ("hybrid", "Hybrid"),
    ]

    LEVEL_CHOICES = [
        ("beginner", "Pemula"),
        ("intermediate", "Menengah"),
        ("advanced", "Mahir"),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES)

    quota = models.PositiveIntegerField(default=0)

    token = models.CharField(
        max_length=6,
        default=generate_token,
        unique=True,
        editable=False
        )


    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    is_active = models.BooleanField(default=True)


    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = generate_token()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


# Course Participant

class CourseParticipant(models.Model):
    ROLE_CHOICES = [
        ("participant", "Peserta"),
        ("trainer", "Instruktur"),
        ("assessor", "Asesor"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, related_name="participants", on_delete=models.CASCADE)

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="participant")

    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "course")

    def __str__(self):
        return f"{self.user} → {self.course} ({self.role})"


# Silabus

class CourseSyllabus(models.Model):
    course = models.ForeignKey(Course, related_name="syllabus", on_delete=models.CASCADE)

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    category = models.CharField(max_length=255, blank=True, null=True)
    sub_category = models.CharField(max_length=255, blank=True, null=True)
    informant = models.CharField(max_length=255, blank=True, null=True)

    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)

    duration_minutes = models.PositiveIntegerField(null=True, blank=True)

    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "start_time"]

# Exam

class Exam(models.Model):
    course = models.ForeignKey(Course, related_name="exams", on_delete=models.CASCADE)

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_private = models.BooleanField(default=False)

    duration_minutes = models.PositiveIntegerField(default=0)
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)

    shuffle_questions = models.BooleanField(default=False)  # default False lebih aman
    shuffle_choices = models.BooleanField(default=False)

    random_question_count = models.PositiveIntegerField(null=True, blank=True)
    attempt_limit = models.PositiveIntegerField(default=1)
    passing_grade = models.FloatField(null=True, blank=True)

    # token
    token = models.CharField(max_length=12, unique=True, blank=True, null=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_open(self):
        now = timezone.now()

        # Jika exam memiliki jadwal
        if self.start_time and self.end_time:
            return self.start_time <= now <= self.end_time

        # Jika tidak pakai jadwal, gunakan status active
        return self.is_active
    

    def save(self, *args, **kwargs):
        # Jika exam private, token wajib ada → generate otomatis bila kosong
        if self.is_private and not self.token:
            self.token = generate_token()

        # Jika exam tidak private → pastikan token dihapus
        if not self.is_private:
            self.token = None

        super().save(*args, **kwargs)


    def __str__(self):
        return f"{self.course.title} - {self.title}"   

# Pertanyaan

class Question(models.Model):
    QUESTION_TYPES = [
        ("MCQ", "Multiple Choice"),
        ("CHECK", "Checkbox (Multiple Correct)"),
        ("TEXT", "Essay / Text"),
        ("FILE", "File Upload"),
        ("TRUEFALSE", "True / False"),
        ("DROPDOWN", "Dropdown"),
    ]

    exam = models.ForeignKey(Exam, related_name="questions", on_delete=models.CASCADE)

    text = models.TextField()
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES)

    required = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    points = models.FloatField(default=1.0)
    weight = models.FloatField(default=1.0)

    allow_multiple_files = models.BooleanField(default=False)
    allow_blank_answer = models.BooleanField(default=False)

    parent_question = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="child_questions",
        help_text="Jika diisi, pertanyaan ini muncul hanya ketika parent_choice dipilih."
    )

    parent_choice = models.ForeignKey(
        "Choice",          # string reference karena Choice didefinisikan setelah Question
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="triggered_questions",
        help_text="Choice pada parent_question yang akan memicu question ini muncul."
    )

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.exam.title} - Q{self.order}"
    
# Pilihan Jawaban    

class Choice(models.Model):
    question = models.ForeignKey(Question, related_name="choices", on_delete=models.CASCADE)

    text = models.CharField(max_length=1024)
    score = models.FloatField(default=0.0)  
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"Choice Q{self.question_id}: {self.text[:30]}"

# User Exam

class UserExam(models.Model):
    STATUS_CHOICES = [
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("abandoned", "Abandoned"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="user_exams", on_delete=models.CASCADE)
    exam = models.ForeignKey(Exam, related_name="user_exams", on_delete=models.CASCADE)

    attempt_number = models.PositiveIntegerField(default=1)

    joined_at = models.DateTimeField(auto_now_add=True)
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="in_progress")

    score = models.FloatField(default=0.0)
    raw_score = models.FloatField(default=0.0)

    finished = models.BooleanField(default=False)

    class Meta:
        unique_together = ("user", "exam", "attempt_number")

    def __str__(self):
        return f"{self.user} → {self.exam} (Attempt {self.attempt_number})"


# Jawaban User

class UserAnswer(models.Model):
    user_exam = models.ForeignKey(UserExam, related_name="answers", on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.CASCADE)

    selected_choices = models.ManyToManyField(Choice, blank=True)
    text_answer = models.TextField(blank=True, null=True)

    score = models.FloatField(default=0.0)
    graded = models.BooleanField(default=False)

    class Meta:
        unique_together = ("user_exam", "question")

    def __str__(self):
        return f"Answer: {self.user_exam} - {self.question}"
    
class UserAnswerFile(models.Model):
    answer = models.ForeignKey(UserAnswer, related_name="files", on_delete=models.CASCADE)
    file = models.FileField(upload_to="exam_uploads/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"File for Answer {self.answer.id} - {self.file.name}"


# Submmit Task

class CourseTask(models.Model):
    course = models.ForeignKey(Course, related_name="tasks", on_delete=models.CASCADE)

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    due_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    max_submissions = models.PositiveIntegerField(default=1)

    def __str__(self):
        return f"{self.course.title} - {self.title}"


# Submit Tugas

class CourseTaskSubmission(models.Model):
    task = models.ForeignKey(CourseTask, related_name="submissions", on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="course_task_submissions", on_delete=models.CASCADE)

    submitted_at = models.DateTimeField(auto_now_add=True)
    remarks = models.TextField(blank=True, null=True)

    graded = models.BooleanField(default=False)
    score = models.FloatField(null=True, blank=True)

    class Meta:
        unique_together = ("task", "user")

    def __str__(self):
        return f"{self.user} - {self.task}"



# SUBMISSION FILES (MULTIFILE)

class CourseTaskSubmissionFile(models.Model):
    submission = models.ForeignKey(CourseTaskSubmission, related_name="files", on_delete=models.CASCADE)
    file = models.FileField(upload_to="course_task_submissions/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"File for {self.submission}"
    

class CourseMaterial(models.Model):
    MATERIAL_TYPES = [
        ("pdf", "PDF"),
        ("image", "Image"),
        ("video", "Video"),
        ("file", "File"),
        ("link", "External Link"),
    ]

    course = models.ForeignKey(Course, related_name="materials", on_delete=models.CASCADE)

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    material_type = models.CharField(max_length=20, choices=MATERIAL_TYPES)

    # Optional file
    file = models.FileField(upload_to="course_materials/", null=True, blank=True)
    video_url = models.URLField(null=True, blank=True)

    # Optional URL
    url = models.URLField(null=True, blank=True)

    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.course.title} - {self.title}"


from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()

class CourseRequirementTemplate(models.Model):
    FIELD_TYPES = [
        ("text", "Text"),
        ("number", "Number"),
        ("file", "File Upload"),
        ("select", "Select"),
    ]

    course = models.ForeignKey(
        Course,
        related_name="requirements",
        on_delete=models.CASCADE
    )
    field_name = models.CharField(max_length=255)
    field_type = models.CharField(max_length=20, choices=FIELD_TYPES)
    options = models.JSONField(null=True, blank=True)   # untuk select list
    required = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.course.title} - {self.field_name}"



class CourseRequirementSubmission(models.Model):
    STATUS = [
        ("pending", "Pending Review"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    status = models.CharField(max_length=20, choices=STATUS, default="pending")
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewer = models.ForeignKey(
        User,
        null=True,
        blank=True,
        related_name="requirement_reviews",
        on_delete=models.SET_NULL
    )
    note = models.TextField(null=True, blank=True)  # catatan admin

    def __str__(self):
        return f"Submission from {self.user} - {self.course}"



class CourseRequirementAnswer(models.Model):
    submission = models.ForeignKey(
        CourseRequirementSubmission,
        related_name="answers",
        on_delete=models.CASCADE
    )
    requirement = models.ForeignKey(
        CourseRequirementTemplate,
        on_delete=models.CASCADE
    )

    value_text = models.TextField(null=True, blank=True)
    value_number = models.FloatField(null=True, blank=True)
    value_file = models.FileField(
        upload_to="course_requirements/",
        null=True,
        blank=True
    )

    def __str__(self):
        return f"{self.submission.user} - {self.requirement.field_name}"


# models.py (append/modify)
from django.conf import settings
from django.db import models

User = settings.AUTH_USER_MODEL  # use this in ForeignKey definitions below if necessary

# --- COURSE: evaluation_mode (add to Course model) ---
# inside Course model add:
EVALUATION_MODES = [
    ("none", "No Final Result"),
    ("exam_only", "Exam Based"),
    ("assessment_only", "Assessment Based"),
    ("combined", "Exam + Assessment"),
    ("manual", "Manual Decision")
]

# Example insertion (edit existing Course model to include this field):
evaluation_mode = models.CharField(
    max_length=50,
    choices=EVALUATION_MODES,
    default="none",
    help_text="Mode evaluasi final untuk course/event"
)

# --- EXAM: is_mandatory (add to Exam model) ---
# inside Exam model add:
is_mandatory = models.BooleanField(
    default=False,
    help_text="Jika True, exam ini wajib lulus agar peserta dianggap lulus course (bila evaluation_mode membutuhkan)"
)


# ---------------------------------------------------------------------
# New models for Course Assessment (matrix) — add these near other models
# ---------------------------------------------------------------------
class CourseAssessmentCriteria(models.Model):
    course = models.ForeignKey("Course", related_name="assessment_criteria", on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    max_score = models.PositiveIntegerField(default=20)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.course} - {self.name}"


class CourseAssessment(models.Model):
    course = models.ForeignKey("Course", related_name="assessments", on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="course_assessments", on_delete=models.CASCADE)
    assessor = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="given_assessments", on_delete=models.SET_NULL, null=True, blank=True)

    total_score = models.FloatField(default=0)
    status = models.CharField(max_length=20, null=True, blank=True)  # accepted / reserve / rejected — can be free text or choices
    note = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("course", "user")  # one assessment per user per course (adjust if multiple allowed)

    def recalc_total(self):
        total = sum([a.score for a in self.answers.all()])
        self.total_score = total
        self.save()
        return self.total_score

    def __str__(self):
        return f"{self.course} - {self.user} - {self.total_score}"


class CourseAssessmentAnswer(models.Model):
    assessment = models.ForeignKey(CourseAssessment, related_name="answers", on_delete=models.CASCADE)
    criteria = models.ForeignKey(CourseAssessmentCriteria, on_delete=models.CASCADE)
    score = models.FloatField(default=0)
    note = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"{self.assessment} - {self.criteria.name} - {self.score}"
