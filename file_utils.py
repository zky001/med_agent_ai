from pathlib import Path
from typing import List
import chardet
import logging

logger = logging.getLogger("medical_ai_agent")


def read_file_with_encoding_detection(file_path: Path) -> str:
    """Read file with encoding detection."""
    try:
        with open(file_path, 'rb') as f:
            raw_data = f.read()
        detected = chardet.detect(raw_data)
        confidence = detected.get('confidence', 0)
        encoding = detected.get('encoding', 'utf-8')
        logger.info(f"📄 [编码检测] 文件: {file_path.name}")
        logger.info(f"   检测到编码: {encoding} (置信度: {confidence:.2f})")
        if confidence > 0.7 and encoding:
            try:
                content = raw_data.decode(encoding)
                logger.info(f"   ✅ 使用检测编码 {encoding} 成功读取")
                return content
            except (UnicodeDecodeError, LookupError) as e:
                logger.warning(f"   ❌ 检测编码 {encoding} 读取失败: {e}")
        for enc in ['utf-8', 'gbk', 'gb2312', 'utf-16', 'utf-16le', 'utf-16be', 'latin1', 'cp1252']:
            try:
                content = raw_data.decode(enc)
                logger.info(f"   ✅ 使用备选编码 {enc} 成功读取")
                return content
            except (UnicodeDecodeError, LookupError):
                continue
        try:
            content = raw_data.decode('utf-8', errors='replace')
            logger.warning("   ⚠️ 使用UTF-8错误替换模式读取")
            return content
        except Exception as e:
            logger.error(f"   ❌ 所有编码尝试失败: {e}")
            return "无法读取文件内容: 编码检测失败"
    except Exception as e:
        logger.error(f"   💥 文件读取异常: {e}")
        return f"无法读取原始文件: {str(e)}"


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """Split text into chunks at sentence boundaries with optional overlap."""
    if len(text) <= chunk_size:
        return [text.strip()]
    import re
    sentences = re.split(r"(?<=[。！？.!?])", text)
    chunks = []
    current = ""
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        if len(current) + len(sentence) <= chunk_size:
            current += sentence
        else:
            chunks.append(current)
            current = (current[-overlap:] if overlap > 0 else "") + sentence
    if current:
        chunks.append(current)
    return chunks


def extract_text_from_file(file_content: bytes, filename: str) -> List[str]:
    """Extract text content from uploaded file."""
    file_extension = Path(filename).suffix.lower()
    try:
        if file_extension in ['.txt', '.md']:
            text = file_content.decode('utf-8')
            paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
            return paragraphs if paragraphs else [text]
        elif file_extension == '.csv':
            import io
            import csv
            text_data = file_content.decode('utf-8')
            reader = csv.reader(io.StringIO(text_data))
            rows = []
            for row in reader:
                if any(cell.strip() for cell in row):
                    rows.append(' | '.join(row))
            return rows
        elif file_extension == '.pdf':
            try:
                import io
                import PyPDF2
                pdf_file = io.BytesIO(file_content)
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                pages_text = []
                for page_num, page in enumerate(pdf_reader.pages):
                    try:
                        page_text = page.extract_text()
                        if page_text.strip():
                            cleaned_text = page_text.replace('\n', ' ').replace('\r', ' ')
                            cleaned_text = ' '.join(cleaned_text.split())
                            import re
                            cleaned_text = re.sub(r'[^\u4e00-\u9fff\u3400-\u4dbf\w\s\.,;:!?\'"()\-\[\]{}@#$%^&*+=<>/\\|`~·。，、；：！？""''（）【】《》]+', '', cleaned_text)
                            cleaned_text = re.sub(r'\s+', ' ', cleaned_text)
                            cleaned_text = re.sub(r'([.。,，;；:：!！?？])\1+', r'\1', cleaned_text)
                            if cleaned_text and len(cleaned_text.strip()) > 20:
                                if len(cleaned_text) > 2000:
                                    cleaned_text = cleaned_text[:2000] + "..."
                                pages_text.append(f"第{page_num+1}页: {cleaned_text}")
                            else:
                                raw_text = page_text.strip()
                                if raw_text and len(raw_text) > 10:
                                    pages_text.append(f"第{page_num+1}页: [可能包含表格或图片] {raw_text[:100]}...")
                    except Exception as e:
                        pages_text.append(f"第{page_num+1}页解析错误: {str(e)}")
                if not pages_text:
                    return [f"PDF文件 {filename} 无法提取文本内容，可能是扫描版PDF、加密文件或纯图片文档"]
                return pages_text
            except ImportError:
                return ["PDF解析需要安装PyPDF2库: pip install PyPDF2"]
            except Exception as e:
                return [f"PDF文件解析失败: {str(e)}"]
        elif file_extension in ['.xlsx', '.xls']:
            try:
                import io
                import pandas as pd
                df = pd.read_excel(io.BytesIO(file_content))
                rows = []
                headers = ' | '.join(str(col) for col in df.columns)
                rows.append(f"表头: {headers}")
                for idx, row in df.iterrows():
                    row_text = ' | '.join(str(val) for val in row.values if pd.notna(val))
                    if row_text.strip():
                        rows.append(f"行{idx+1}: {row_text}")
                return rows if rows else [f"Excel文件 {filename} 为空"]
            except Exception as e:
                return [f"Excel文件解析失败: {str(e)}"]
        elif file_extension == '.docx':
            try:
                import io
                from docx import Document
                doc = Document(io.BytesIO(file_content))
                paragraphs = []
                for para in doc.paragraphs:
                    text = para.text.strip()
                    if text:
                        paragraphs.append(text)
                return paragraphs if paragraphs else [f"Word文档 {filename} 无文本内容"]
            except ImportError:
                return ["Word文档解析需要安装python-docx库: pip install python-docx"]
            except Exception as e:
                return [f"Word文档解析失败: {str(e)}"]
        else:
            try:
                text = file_content.decode('utf-8')
                return [text] if text.strip() else [f"文件 {filename} 内容为空"]
            except UnicodeDecodeError:
                return [f"不支持的文件格式: {file_extension}，无法解析为文本"]
    except Exception as e:
        return [f"文件处理错误: {str(e)}"]
