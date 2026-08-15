"""agent 包标记文件。

这个文件的作用：告诉 Python"agent 这个目录是一个包（package）"。
有了它，其他文件才能用 `from .xxx import ...` 这种相对导入，
以及 `from backend.agent.indexer import index_all` 这种整体导入。

内容通常为空（或只写说明）。包的意义：
backend/agent/ 下所有模块（config/db/indexer/app）组成一个整体，
通过这个文件把它们组织成一个可整体导入的 Python 包。
"""
