import os
from django.conf import settings
from django.http import HttpResponse
from django.template.loader import get_template
from weasyprint import HTML, CSS
from pathlib import Path


def render_pdf(template_src, context, filename="document.pdf", mode="download"):
    """
    Generate PDF using WeasyPrint with support for static CSS loading.
    """

    # ======================================
    # RENDER HTML
    # ======================================
    template = get_template(template_src)
    html_string = template.render(context)

    # ======================================
    # SET BASE_URL AGAR WEASYPRINT BISA AKSES STATIC
    # ======================================
    base_url = settings.STATIC_ROOT  # lokasi setelah collectstatic

    # ======================================
    # CARA LOAD CSS: AMBIL FILE CSS ASLI (BUKAN HASH)
    # ======================================
    theme = context.get("theme", "simple")  # dapatkan tema saat ini
    css_path = Path(settings.BASE_DIR) / "static" / "cv_theme" / theme / "style.css"

    if not css_path.exists():
        print("⚠️ CSS TIDAK DITEMUKAN:", css_path)

    css = CSS(filename=str(css_path))

    # ======================================
    # GENERATE PDF
    # ======================================
    pdf_file = HTML(string=html_string, base_url=base_url).write_pdf(
        stylesheets=[css]
    )

    # ======================================
    # MODE PREVIEW
    # ======================================
    if mode == "preview":
        response = HttpResponse(pdf_file, content_type="application/pdf")
        response["Content-Disposition"] = 'inline; filename="preview.pdf"'
        return response

    # ======================================
    # MODE DOWNLOAD
    # ======================================
    response = HttpResponse(pdf_file, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
