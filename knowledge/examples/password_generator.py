"""
أداة: مولّد كلمات مرور قوية
الوظيفة: توليد كلمات مرور آمنة وعشوائية
"""
import secrets, string, pyperclip

def generate_password(length=16, upper=True, digits=True, symbols=True) -> str:
    chars = string.ascii_lowercase
    required = [secrets.choice(string.ascii_lowercase)]
    if upper:
        chars += string.ascii_uppercase
        required.append(secrets.choice(string.ascii_uppercase))
    if digits:
        chars += string.digits
        required.append(secrets.choice(string.digits))
    if symbols:
        chars += '!@#$%^&*()_+-=[]{}|'
        required.append(secrets.choice('!@#$%^&*()_+-=[]{}|'))
    
    remaining = [secrets.choice(chars) for _ in range(length - len(required))]
    password_list = required + remaining
    secrets.SystemRandom().shuffle(password_list)
    return ''.join(password_list)

def check_strength(password: str) -> str:
    score = 0
    if len(password) >= 12: score += 1
    if len(password) >= 16: score += 1
    if any(c.isupper() for c in password): score += 1
    if any(c.isdigit() for c in password): score += 1
    if any(c in '!@#$%^&*' for c in password): score += 1
    levels = {5: '🟢 قوية جداً', 4: '🟡 قوية', 3: '🟠 متوسطة', 2: '🔴 ضعيفة', 1: '⛔ ضعيفة جداً'}
    return levels.get(score, '⛔ ضعيفة جداً')

if __name__ == '__main__':
    pwd = generate_password(16)
    print(f'🔑 كلمة المرور: {pwd}')
    print(f'💪 القوة: {check_strength(pwd)}')
    try:
        pyperclip.copy(pwd)
        print('📋 تم النسخ للحافظة!')
    except: pass
