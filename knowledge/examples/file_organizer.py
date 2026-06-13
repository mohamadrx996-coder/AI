"""
أداة: منظّم الملفات التلقائي
الوظيفة: تنظيم الملفات في مجلد حسب نوعها تلقائياً
"""
import os, shutil
from pathlib import Path

CATEGORIES = {
    'صور':      ['.jpg','.jpeg','.png','.gif','.bmp','.svg','.webp'],
    'فيديو':    ['.mp4','.avi','.mkv','.mov','.wmv','.flv'],
    'صوت':      ['.mp3','.wav','.flac','.aac','.ogg'],
    'مستندات':  ['.pdf','.doc','.docx','.xls','.xlsx','.ppt','.pptx','.txt'],
    'كود':      ['.py','.js','.ts','.html','.css','.java','.cpp','.c'],
    'ضغط':      ['.zip','.rar','.7z','.tar','.gz'],
    'أخرى':     [],
}

def organize_folder(folder_path: str) -> dict:
    folder = Path(folder_path)
    results = {cat: 0 for cat in CATEGORIES}
    
    for file in folder.iterdir():
        if not file.is_file():
            continue
        ext = file.suffix.lower()
        category = 'أخرى'
        for cat, exts in CATEGORIES.items():
            if ext in exts:
                category = cat
                break
        dest = folder / category
        dest.mkdir(exist_ok=True)
        shutil.move(str(file), str(dest / file.name))
        results[category] += 1
    
    return results

if __name__ == '__main__':
    path = input('📁 اكتب مسار المجلد: ')
    results = organize_folder(path)
    print('\n✅ تم التنظيم:')
    for cat, count in results.items():
        if count > 0:
            print(f'  {cat}: {count} ملف')
