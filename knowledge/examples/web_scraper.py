"""
أداة: سكرابر مواقع بسيط
الوظيفة: استخراج البيانات من مواقع الويب
المتطلبات: pip install requests beautifulsoup4
"""
import requests
from bs4 import BeautifulSoup
import csv, time
from urllib.parse import urljoin, urlparse

def scrape_page(url: str, selectors: dict) -> dict:
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    response = requests.get(url, headers=headers, timeout=10)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, 'html.parser')
    
    result = {'url': url}
    for field, selector in selectors.items():
        elements = soup.select(selector)
        result[field] = [el.get_text(strip=True) for el in elements]
    return result

def scrape_multiple(urls: list, selectors: dict, delay=1) -> list:
    results = []
    for i, url in enumerate(urls, 1):
        print(f'🔍 [{i}/{len(urls)}] {url}')
        try:
            data = scrape_page(url, selectors)
            results.append(data)
        except Exception as e:
            print(f'  ⚠️ خطأ: {e}')
        if i < len(urls):
            time.sleep(delay)
    return results

def save_to_csv(data: list, filename: str):
    if not data: return
    keys = list(data[0].keys())
    with open(filename, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        writer.writerows(data)
    print(f'✅ تم الحفظ في: {filename}')

if __name__ == '__main__':
    urls = ['https://example.com']
    selectors = {'العنوان': 'h1', 'الروابط': 'a'}
    results = scrape_multiple(urls, selectors)
    save_to_csv(results, 'results.csv')
