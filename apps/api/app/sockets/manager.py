"""Socket.IO manager — handles real-time deal chats, typing indicators, and notifications."""
import socketio

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",  # allow all origins for now
)


@sio.event
async def connect(sid, environ):
    # print(f"Client connected: {sid}")
    pass


@sio.event
async def disconnect(sid):
    # print(f"Client disconnected: {sid}")
    pass


@sio.on("join-deal")
async def handle_join_deal(sid, deal_id: str):
    await sio.enter_room(sid, f"deal-{deal_id}")


@sio.on("leave-deal")
async def handle_leave_deal(sid, deal_id: str):
    await sio.leave_room(sid, f"deal-{deal_id}")


@sio.on("send-message")
async def handle_send_message(sid, data: dict):
    # Broadcast new message to the room
    deal_id = data.get("dealId")
    msg_data = data.get("message")
    await sio.emit("new-message", msg_data, room=f"deal-{deal_id}")


@sio.on("typing")
async def handle_typing(sid, data: dict):
    deal_id = data.get("dealId")
    alias = data.get("alias")
    is_typing = data.get("isTyping")
    await sio.emit(
        "user-typing",
        {"alias": alias, "isTyping": is_typing},
        room=f"deal-{deal_id}",
        skip_sid=sid,
    )


@sio.on("join-notifications")
async def handle_join_notifications(sid, alias: str):
    await sio.enter_room(sid, f"notifications-{alias}")


@sio.on("join-moderator-room")
async def handle_join_moderator_room(sid):
    await sio.enter_room(sid, "moderator-room")
