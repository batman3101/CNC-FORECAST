from fastapi import APIRouter
from app.api.routes import upload, prices, actual, report, templates

api_router = APIRouter()

api_router.include_router(upload.router, prefix="/upload", tags=["upload"])
api_router.include_router(prices.router, prefix="/prices", tags=["prices"])
api_router.include_router(actual.router, prefix="/actual", tags=["actual"])
api_router.include_router(report.router, prefix="/report", tags=["report"])
api_router.include_router(templates.router, prefix="/templates", tags=["templates"])
