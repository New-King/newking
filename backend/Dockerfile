# Python 后端镜像
# 构建：在 backend/ 目录下 docker build，或用 1Panel 的"构建镜像"功能
FROM python:3.12-slim

# 避免 Python 产生 .pyc 和缓冲输出（容器日志友好）
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# 先装依赖（利用 Docker 层缓存：requirements 不变则不重装）
# 用国内 pip 镜像（阿里云），避免服务器访问国外 PyPI 超时
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    -i https://mirrors.aliyun.com/pypi/simple/ \
    --trusted-host mirrors.aliyun.com

# 复制后端代码
COPY agent ./agent

# 创建 content 目录（运行时由外部挂载 /app/content）
RUN mkdir -p /app/content

# 暴露 FastAPI 端口（1Panel 反向代理 /api → 此端口）
EXPOSE 8000

# 启动 FastAPI（生产：不 --reload）
CMD ["uvicorn", "agent.app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
