import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")

SILICONFLOW_API_KEY = os.environ["SILICONFLOW_API_KEY"]
SILICONFLOW_BASE_URL = os.environ.get("SILICONFLOW_BASE_URL", "https://api.siliconflow.cn/v1")
EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "BAAI/bge-m3")
DATABASE_URL = os.environ["DATABASE_URL"]
CONTENT_DIR = (BACKEND_DIR / os.environ.get("CONTENT_DIR", "../content")).resolve()
