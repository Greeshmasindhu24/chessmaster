import asyncio
import logging
import smtplib
from email.message import EmailMessage

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class EmailService:
    @staticmethod
    def is_configured() -> bool:
        settings = get_settings()
        return bool(
            settings.SMTP_HOST.strip()
            and settings.SMTP_USER.strip()
            and settings.SMTP_PASSWORD.strip()
        )

    @staticmethod
    def _send_sync(to: str, subject: str, body: str) -> None:
        settings = get_settings()
        msg = EmailMessage()
        msg["From"] = settings.smtp_from_address
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(body)

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)

    @staticmethod
    async def send_email(to: str, subject: str, body: str) -> bool:
        """Send email when SMTP is configured. Returns True if sent, False for dev stub."""
        if not EmailService.is_configured():
            logger.info("Email stub (SMTP not configured) to=%s subject=%s", to, subject)
            logger.info("Email body: %s", body)
            return False

        try:
            await asyncio.to_thread(EmailService._send_sync, to, subject, body)
            logger.info("Email sent to=%s subject=%s", to, subject)
            return True
        except Exception:
            logger.exception("Failed to send email to=%s subject=%s", to, subject)
            return False
