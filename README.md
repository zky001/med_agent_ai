
# 医学AI Agent

这是一个用于演示的临床试验方案智能撰写系统，包含使用 **FastAPI** 构建的后端与纯静态前端页面。项目通过调用本地或远程的大语言模型(LLM)以及向量化检索，生成多模块的临床试验方案，并提供知识库管理与对话功能。

## 项目结构

- `index.html` / `style.css` / `script.js` - Web 前端界面，支持模型配置、文件上传、方案生成与对话等功能。
- `start_simple.py` - 启动 FastAPI 后端服务，提供生成和文件处理等 API。
- `start_frontend.py` - 简单的 HTTP 服务器，用于本地预览前端页面。
- `start_all.py` - 便捷脚本，一次启动前端与后端。
- `real_protocol_generator.py` - 分步骤生成临床试验方案的核心逻辑。
- `requirements.txt` - Python 依赖列表。

仓库中还包含若干用于前端测试的 HTML 文件。

## 快速开始

1. 安装依赖：
   ```bash
   pip install -r requirements.txt
   ```
2. 启动后端服务：
   ```bash
   python start_simple.py
   ```
3. 启动前端服务：
   ```bash
   python start_frontend.py
   ```
   或者直接执行 `python start_all.py` 同时启动二者。

启动完成后，在浏览器访问 [http://localhost:3000](http://localhost:3000) 即可使用。

## 运行环境

- Python 3.10 及以上
- 建议在 Linux 或 macOS 下运行，如需在 Windows 环境使用请自行调整端口及路径配置。

## 流程示意

项目的智能生成流程如下所示：

```mermaid
flowchart TD
    A[需求输入<br>(自然语言/表单)] --> B[关键信息抽取<br>(LLM JSON 输出)]
    B --> C[向量检索<br>(指南/法规/文献/内部模板)]
    C --> D[模块级 Prompt 组装<br>(RAG 拼装)]
    D --> E[LLM 逐模块生成<br>(Stream 输出)]
    E --> F[自动质量检查<br>(AI + 规则)]
    F --> G{通过?}
    G -- 否 --> D
    G -- 是 --> H[交互式编辑/审阅<br>(人机协同)]
    H --> I[一键导出<br>(Word/PDF/结构化 JSON)]
    I --> J[后续配套<br>(SAP/CRF/ICF 等生成)]
```

## 许可

本项目仅供学习与演示使用，代码和示例数据均不应用于真实医疗场景。
