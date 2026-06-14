"""
أداة: مثال أداة احترافية بواجهة Rich
الوظيفة: توضيح كيف تبدو الأداة الاحترافية
المتطلبات: pip install rich
"""
from rich.console import Console
from rich.table import Table
from rich.progress import track
from rich.panel import Panel
from rich import box
import time

console = Console()

def show_welcome():
    console.print(Panel.fit(
        "[bold purple]🔧 أداة احترافية[/bold purple]\n[dim]نسخة 1.0.0[/dim]",
        border_style="purple"
    ))

def show_results(data: list[dict]):
    table = Table(box=box.ROUNDED, border_style="blue", show_header=True)
    if not data: return
    for key in data[0].keys():
        table.add_column(key, style="cyan", justify="right")
    for row in data:
        table.add_row(*[str(v) for v in row.values()])
    console.print(table)

def process_with_progress(items: list, task_name: str) -> list:
    results = []
    for item in track(items, description=f"[green]{task_name}..."):
        time.sleep(0.1)  # محاكاة عمل
        results.append({'العنصر': item, 'الحالة': '✅ تم'})
    return results

if __name__ == '__main__':
    show_welcome()
    items = ['ملف1.txt', 'ملف2.txt', 'ملف3.txt']
    results = process_with_progress(items, 'معالجة الملفات')
    show_results(results)
    console.print("\n[bold green]✅ اكتملت العملية![/bold green]")
