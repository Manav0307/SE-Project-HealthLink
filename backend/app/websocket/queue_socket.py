"""
Socket.io server for Live Queue real-time updates.
PROTOTYPE MODE: Uses in-memory transport instead of Redis adapter.
Original Redis adapter code preserved in comments.
"""
import socketio

# PROTOTYPE: Use simple in-memory mode (no Redis needed)
# Original: client_manager=socketio.AsyncRedisManager(settings.REDIS_URL)
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    # client_manager=socketio.AsyncRedisManager(settings.REDIS_URL),  # PROTOTYPE: disabled
)
sio_app = socketio.ASGIApp(sio)


@sio.event
async def connect(sid, environ, auth):
    """Authenticate JWT on WS handshake"""
    token = (auth or {}).get("token")
    if not token:
        return False  # Reject unauthenticated connections
    # TODO: validate JWT, get patient + clinic_id
    print(f"Client connected: {sid}")


@sio.event
async def join_queue(sid, data):
    """Patient joins their clinic's queue room"""
    clinic_id = data.get("clinic_id")
    if clinic_id:
        await sio.enter_room(sid, f"queue_{clinic_id}")
        # Emit current position immediately
        await sio.emit("queue:position", {
            "position": 4,
            "total": 12,
            "eta_seconds": 525,  # 8:45
            "status": "waiting",
        }, room=sid)


@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")


async def broadcast_queue_update(clinic_id: str, queue_data: dict):
    """Called by QueueService.recalculate_queue() after every queue event"""
    await sio.emit("queue:position", queue_data, room=f"queue_{clinic_id}")


async def notify_patient_called(patient_sid: str, room: str):
    """Called when patient reaches position 1 and is summoned"""
    await sio.emit("queue:called", {"room": room, "message": "Your turn! Please proceed."}, room=patient_sid)
