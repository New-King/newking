"""配置层：统一从"环境变量"里读取所有配置。

先搞懂两个概念，这个文件就全懂了：
- 环境变量（os.environ）：操作系统给每个程序准备的一个"配置字典"。
  里面存着像 SILICONFLOW_API_KEY=xxx 这种键值对，程序运行时能读。
- .env 文件：一个普通文本文件，里面写"变量名=值"。
  它只是方便本地开发：load_dotenv 会把 .env 里的内容"倒进"环境变量字典里。

所以本文件的工作只有一件事：从"环境变量字典"里取值。
本地：值来自 .env 文件（load_dotenv 负责倒进去）。
线上：值来自 CI/CD 注入的环境变量（load_dotenv 找不到文件就安静跳过）。

优先级：系统环境变量 > .env 文件 > 默认值。
换环境（本地/服务器）只改"值的来源"，代码不用动。
"""
import os
from pathlib import Path

from dotenv import load_dotenv

# 找到 backend/ 目录的绝对路径。
# Path(__file__) 是当前文件（config.py）的路径，
# .parent 是它所在的 agent/ 目录，再 .parent 就是 backend/。
BACKEND_DIR = Path(__file__).resolve().parent.parent

# 把 backend/.env 文件里的内容读进环境变量字典（os.environ）。
# 文件不存在时不会报错，只是什么都不做（线上就没有这个文件）。
load_dotenv(BACKEND_DIR / ".env")


def _get(name, default=None):
    """从环境变量字典里安全取值。

    name：要取的变量名（比如 "SILICONFLOW_API_KEY"）。
    default：取不到时用的兜底值（默认是 None）。
    等价于 os.environ.get(name, default)：找到了返回值，找不到返回兜底值。
    """
    return os.environ.get(name, default)


# 下面是具体的配置项。每一项 = 从环境变量里取一个值。
# 必填的（key、数据库）不设默认值：取不到就是 None，后续代码会因为缺值而报错，
# 这样能及时提醒"你忘了配置"。
SILICONFLOW_API_KEY = _get("SILICONFLOW_API_KEY")  # SiliconFlow 的 API 密钥（embedding 用）
SILICONFLOW_BASE_URL = _get(
    "SILICONFLOW_BASE_URL", "https://api.siliconflow.cn/v1"
)  # SiliconFlow 的接口地址（OpenAI 兼容格式）
EMBEDDING_MODEL = _get("EMBEDDING_MODEL", "BAAI/bge-large-zh-v1.5")  # 向量模型名（中文检索专用）

DEEPSEEK_API_KEY = _get("DEEPSEEK_API_KEY")  # DeepSeek 的 API 密钥（对话生成用）
DEEPSEEK_BASE_URL = _get(
    "DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1"
)  # DeepSeek 的接口地址（OpenAI 兼容格式）
DEEPSEEK_MODEL = _get("DEEPSEEK_MODEL", "deepseek-chat")  # DeepSeek 对话模型名

DATABASE_URL = _get("DATABASE_URL")  # Postgres 连接串（形如 postgresql://用户:密码@地址:端口/库名）
CONTENT_DIR = (BACKEND_DIR / _get("CONTENT_DIR", "../content")).resolve()  # 内容目录（content/）

# LangSmith：全链路追踪（agent 每一步操作的日志，见 langsmith.com）
LANGSMITH_API_KEY = _get("LANGSMITH_API_KEY")  # LangSmith API key（不填则不追踪）
LANGSMITH_ENDPOINT = _get("LANGSMITH_ENDPOINT", "https://api.smith.langchain.com")  # 区域端点（eu=欧洲区）
LANGSMITH_PROJECT = _get("LANGSMITH_PROJECT", "newking-agent")  # 追踪项目名
