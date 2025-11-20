import uuid
import random
from django.conf import settings
from django.db import models
from django.utils import timezone


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