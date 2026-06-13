"""
أداة: مُرسل إيميلات تلقائي
الوظيفة: إرسال إيميلات تلقائياً مع دعم HTML والمرفقات
"""
import smtplib, ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from pathlib import Path

class EmailSender:
    def __init__(self, email: str, password: str, smtp='smtp.gmail.com', port=465):
        self.email = email
        self.password = password
        self.smtp = smtp
        self.port = port
    
    def send(self, to: str | list, subject: str, body: str, html=False, attachments=None) -> bool:
        msg = MIMEMultipart('alternative')
        msg['From'] = self.email
        msg['To'] = to if isinstance(to, str) else ', '.join(to)
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body, 'html' if html else 'plain', 'utf-8'))
        
        for file_path in (attachments or []):
            path = Path(file_path)
            with open(path, 'rb') as f:
                part = MIMEBase('application', 'octet-stream')
                part.set_payload(f.read())
            encoders.encode_base64(part)
            part.add_header('Content-Disposition', f'attachment; filename={path.name}')
            msg.attach(part)
        
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(self.smtp, self.port, context=context) as server:
            server.login(self.email, self.password)
            recipients = [to] if isinstance(to, str) else to
            server.sendmail(self.email, recipients, msg.as_string())
        return True

if __name__ == '__main__':
    sender = EmailSender('your@gmail.com', 'your-app-password')
    sender.send(
        to='recipient@email.com',
        subject='مرحباً من Python!',
        body='<h1>أهلاً!</h1><p>هذا إيميل تلقائي من Python.</p>',
        html=True
    )
    print('✅ تم الإرسال!')
