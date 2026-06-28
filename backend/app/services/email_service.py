import logging

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class EmailService:
    @staticmethod
    def is_configured() -> bool:
        settings = get_settings()
        return bool(settings.SMTP_HOST.strip() and settings.SMTP_USER.strip())

    @staticmethod
    async def send_email(to: str, subject: str, body: str) -> bool:
        """Send email when SMTP is configured; otherwise log for dev."""
        settings = get_settings()
        if not EmailService.is_configured():
            logger.info("Email stub (SMTP not configured) to=%s subject=%s", to, subject)
            logger.debug("Email body: %s", body)
            return False

        # Phase 2+: wire aiosmtplib or similar
        logger.warning("SMTP configured but send not implemented yet — to=%s subject=%s", to, subject)
        return False
