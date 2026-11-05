"""Local HTTP transport. Camera access belongs exclusively to the browser."""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from starlette.responses import JSONResponse

from pipeline import BusyError, FERPipeline, LABELS, MAX_FRAME_BYTES, MODEL_NAME, Prediction

logger = logging.getLogger("fer")


def create_app(pipeline_factory=FERPipeline):
    @asynccontextmanager
    async def lifespan(app):
        app.state.pipeline = pipeline_factory()
        try:
            yield
        finally:
            app.state.pipeline.close()

    app = FastAPI(title="LMS FER Service", version="1.0.0", lifespan=lifespan)
    origins = [item.strip() for item in os.getenv(
        "FER_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",") if item.strip()]
    if not origins or "*" in origins:
        raise ValueError("FER_ALLOWED_ORIGINS harus berisi origin LMS eksplisit.")
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET", "POST"],
                       allow_headers=["Content-Type"], allow_credentials=False)

    @app.middleware("http")
    async def local_origin_guard(request, call_next):
        origin = request.headers.get("origin")
        if origin and origin not in origins:
            return JSONResponse({"detail": "Origin tidak diizinkan."}, status_code=403)
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.get("/health")
    def health():
        return {"status": "ready", "schema_version": 1, "model": MODEL_NAME,
                "detector": app.state.pipeline.detector_name, "labels": LABELS}

    @app.post("/predict", response_model=Prediction)
    async def predict(request: Request):
        if request.headers.get("content-type", "").split(";")[0].strip() != "image/jpeg":
            raise HTTPException(415, "Content-Type harus image/jpeg.")
        data = bytearray()
        async for chunk in request.stream():
            if len(data) + len(chunk) > MAX_FRAME_BYTES:
                raise HTTPException(413, "Frame melebihi batas 1 MB.")
            data.extend(chunk)
        if not data:
            raise HTTPException(400, "Frame kosong.")
        try:
            return await run_in_threadpool(app.state.pipeline.predict, bytes(data))
        except BusyError as error:
            raise HTTPException(429, str(error)) from error
        except ValueError as error:
            raise HTTPException(400, str(error)) from error
        except Exception as error:
            logger.exception("FER inference failed")
            raise HTTPException(500, "Inferensi FER gagal. Periksa terminal service.") from error

    return app


app = create_app()
