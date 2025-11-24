from django import template
import datetime

register = template.Library()

BULAN_ID = {
    1: "Januari",
    2: "Februari",
    3: "Maret",
    4: "April",
    5: "Mei",
    6: "Juni",
    7: "Juli",
    8: "Agustus",
    9: "September",
    10: "Oktober",
    11: "November",
    12: "Desember"
}

@register.filter
def indo_date(value):
    if not value:
        return ""
    if isinstance(value, (str,)):
        try:
            value = datetime.datetime.strptime(value, "%Y-%m-%d").date()
        except:
            return value

    return f"{value.day} {BULAN_ID[value.month]} {value.year}"
