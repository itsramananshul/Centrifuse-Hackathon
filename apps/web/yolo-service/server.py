"""
YOLOv8 Medication Label Detection Service
Detects medication label bounding boxes and returns cropped regions as base64.
"""

import base64
import io
import os

import cv2
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ultralytics import YOLO

MODEL_PATH = os.path.join(os.path.dirname(__file__), "best.pt")
YOLO_CONF_THRESHOLD = 0.45
BOX_PADDING = 20

app = FastAPI(title="YOLOv8 Medication Detector")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

print(f"[YOLO] Loading model from {MODEL_PATH} ...")
model = YOLO(MODEL_PATH)
print("[YOLO] Model loaded successfully.")


class DetectRequest(BaseModel):
    image: str  # base64-encoded image


class BoxResult(BaseModel):
    image: str  # base64-encoded cropped region
    confidence: float
    bbox: list[int]  # [x1, y1, x2, y2]


class DetectResponse(BaseModel):
    boxes: list[BoxResult]
    total: int


def decode_base64_image(b64: str) -> np.ndarray:
    img_bytes = base64.b64decode(b64)
    img_array = np.frombuffer(img_bytes, dtype=np.uint8)
    return cv2.imdecode(img_array, cv2.IMREAD_COLOR)


def encode_image_base64(img: np.ndarray) -> str:
    _, buffer = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 95])
    return base64.b64encode(buffer).decode("utf-8")


@app.post("/detect", response_model=DetectResponse)
async def detect(req: DetectRequest):
    frame = decode_base64_image(req.image)
    if frame is None:
        return DetectResponse(boxes=[], total=0)

    h, w, _ = frame.shape
    results = model(frame, conf=YOLO_CONF_THRESHOLD, verbose=False)

    boxes_out = []
    for r in results:
        for box in r.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            conf = float(box.conf[0])

            # Crop with padding
            cx1 = max(0, x1 - BOX_PADDING)
            cy1 = max(0, y1 - BOX_PADDING)
            cx2 = min(w, x2 + BOX_PADDING)
            cy2 = min(h, y2 + BOX_PADDING)
            cropped = frame[cy1:cy2, cx1:cx2]

            boxes_out.append(BoxResult(
                image=encode_image_base64(cropped),
                confidence=round(conf, 4),
                bbox=[x1, y1, x2, y2],
            ))

    # Fallback: if no boxes detected, return the full image
    if not boxes_out:
        print("[YOLO] No boxes detected, returning full image as fallback.")
        boxes_out.append(BoxResult(
            image=encode_image_base64(frame),
            confidence=0.0,
            bbox=[0, 0, w, h],
        ))

    print(f"[YOLO] Detected {len(boxes_out)} region(s).")
    return DetectResponse(boxes=boxes_out, total=len(boxes_out))


@app.get("/health")
async def health():
    return {"status": "ok", "model": MODEL_PATH}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8123)
