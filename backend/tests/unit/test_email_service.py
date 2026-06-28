import asyncio
from unittest.mock import MagicMock, patch

from app.services.email_service import EmailService


def test_is_configured_false_when_smtp_empty():
    with patch("app.services.email_service.get_settings") as gs:
        s = MagicMock()
        s.SMTP_HOST = ""
        s.SMTP_USER = ""
        s.SMTP_PASSWORD = ""
        gs.return_value = s
        assert EmailService.is_configured() is False


def test_send_email_returns_false_when_not_configured():
    with patch("app.services.email_service.get_settings") as gs:
        s = MagicMock()
        s.SMTP_HOST = ""
        s.SMTP_USER = ""
        s.SMTP_PASSWORD = ""
        gs.return_value = s
        result = asyncio.run(EmailService.send_email("test@example.com", "sub", "body"))
        assert result is False


def test_send_email_sends_via_smtp_when_configured():
    with patch("app.services.email_service.get_settings") as gs:
        s = MagicMock()
        s.SMTP_HOST = "smtp.gmail.com"
        s.SMTP_USER = "user@gmail.com"
        s.SMTP_PASSWORD = "app-password"
        s.SMTP_PORT = 587
        s.smtp_from_address = "user@gmail.com"
        gs.return_value = s

        with patch("app.services.email_service.smtplib.SMTP") as smtp_cls:
            server = MagicMock()
            smtp_cls.return_value.__enter__.return_value = server
            result = asyncio.run(
                EmailService.send_email("test@example.com", "Verify", "https://link")
            )

    assert result is True
    smtp_cls.assert_called_once_with("smtp.gmail.com", 587, timeout=30)
    server.starttls.assert_called_once()
    server.login.assert_called_once_with("user@gmail.com", "app-password")
    server.send_message.assert_called_once()
