from django.template.loader import get_template
from weasyprint import HTML
from django.http import HttpResponse


def render_pdf(template_src, context={}, filename="document.pdf", mode="download"):
    """
    mode:
      - 'preview'  → tampil di browser (inline)
      - 'download' → langsung download
    """

    template = get_template(template_src)
    html_string = template.render(context)
    pdf = HTML(string=html_string).write_pdf()

    response = HttpResponse(pdf, content_type="application/pdf")

    if mode == "preview":
        response["Content-Disposition"] = f'inline; filename="{filename}"'
    else:
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

    return response
