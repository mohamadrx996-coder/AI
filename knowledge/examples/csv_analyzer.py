"""
أداة: محلّل بيانات CSV
الوظيفة: تحليل ملفات CSV وعرض إحصائيات شاملة
"""
import csv, statistics
from pathlib import Path
from collections import Counter

def analyze_csv(file_path: str) -> dict:
    rows = []
    with open(file_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames or []
        for row in reader:
            rows.append(row)
    
    if not rows:
        return {'error': 'الملف فارغ'}
    
    results = {
        'عدد الصفوف': len(rows),
        'عدد الأعمدة': len(headers),
        'الأعمدة': headers,
        'تحليل الأعمدة': {}
    }
    
    for col in headers:
        values = [row[col] for row in rows if row.get(col, '').strip()]
        numeric = []
        for v in values:
            try: numeric.append(float(v.replace(',', '')))
            except: pass
        
        col_info = {'عدد القيم': len(values), 'قيم فارغة': len(rows) - len(values)}
        
        if numeric and len(numeric) > len(values) * 0.5:
            col_info.update({
                'نوع': 'رقمي',
                'المتوسط': round(statistics.mean(numeric), 2),
                'أعلى قيمة': max(numeric),
                'أقل قيمة': min(numeric),
                'الانحراف المعياري': round(statistics.stdev(numeric), 2) if len(numeric) > 1 else 0,
            })
        else:
            top = Counter(values).most_common(3)
            col_info.update({'نوع': 'نصي', 'أكثر قيم تكراراً': top})
        
        results['تحليل الأعمدة'][col] = col_info
    
    return results

if __name__ == '__main__':
    path = input('📊 اكتب مسار ملف CSV: ')
    result = analyze_csv(path)
    print(f"\n📈 عدد الصفوف: {result['عدد الصفوف']}")
    print(f"📋 الأعمدة: {', '.join(result['الأعمدة'])}\n")
    for col, info in result['تحليل الأعمدة'].items():
        print(f"── {col} ({info['نوع']}):")
        for k, v in info.items():
            if k != 'نوع': print(f"   {k}: {v}")
