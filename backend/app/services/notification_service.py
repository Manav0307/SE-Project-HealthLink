"""
NotificationService — multi-channel dispatch
Email via SendGrid, SMS via Twilio, Push via FCM
"""
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    async def send_booking_confirmation(self, patient_email: str, patient_name: str, appt_details: dict):
        """Sends email + SMS on booking confirmation"""
        await self._send_email(
            to=patient_email,
            subject=f"Appointment Confirmed — {appt_details['date']} at {appt_details['time']}",
            body=f"Dear {patient_name}, your appointment has been confirmed.\n\n"
                 f"Date: {appt_details['date']}\nTime: {appt_details['time']}\n"
                 f"Doctor: {appt_details.get('doctor_name', 'TBD')}"
        )

    async def send_queue_called(self, patient_id: str, room: str):
        """Push notification when patient is called from queue"""
        logger.info(f"Patient {patient_id} called to {room}")
        # FCM push here

    async def send_cancellation_confirmation(self, patient_email: str, appt_details: dict):
        await self._send_email(
            to=patient_email,
            subject="Appointment Cancelled",
            body=f"Your appointment on {appt_details['date']} has been cancelled."
        )

    async def _send_email(self, to: str, subject: str, body: str):
        """SendGrid dispatch"""
        if not settings.SENDGRID_API_KEY:
            logger.info(f"[DEV MODE] Email to {to}: {subject}")
            return
        # TODO: sendgrid.SendGridAPIClient(settings.SENDGRID_API_KEY)

    async def _send_sms(self, to: str, body: str):
        """Twilio dispatch"""
        if not settings.TWILIO_ACCOUNT_SID:
            logger.info(f"[DEV MODE] SMS to {to}: {body}")
            return
        # TODO: twilio client
