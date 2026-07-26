"""Files router — serves verified uploaded files securely (e.g., certifications, deliverables)."""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
import os

from app.auth.dependencies import get_current_session

router = APIRouter(prefix="/api/files", tags=["files"])


@router.get("/{file_path:path}")
async def serve_uploaded_file(
    file_path: str,
    session: dict = Depends(get_current_session),
):
    # Base uploads directory is inside the apps/api folder
    base_dir = os.path.abspath("app/uploads")

    # Construct complete path
    full_path = os.path.abspath(os.path.join(base_dir, file_path))

    # Path traversal check
    if not full_path.startswith(base_dir):
        raise HTTPException(status_code=403, detail="Forbidden")

    if not os.path.exists(full_path) or os.path.isdir(full_path):
        raise HTTPException(status_code=404, detail="File not found")

    # Detect Content-Type
    ext = os.path.splitext(full_path)[1].lower()
    mime_types = {
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
    }
    media_type = mime_types.get(ext, "application/octet-stream")

    return FileResponse(
        path=full_path,
        media_type=media_type,
        filename=os.path.basename(full_path),
        headers={"Cache-Control": "private, max-age=3600"},
    )
