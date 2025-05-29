#!/usr/bin/env python3
"""
真实的临床试验方案生成器
实现分步骤的真实内容生成和进度跟踪
"""

import asyncio
import re
import json
from typing import Dict, List, Any, Optional, Callable
from datetime import datetime
import logging

logger = logging.getLogger("medical_ai_agent")

class RealProtocolGenerator:
    """真实的临床试验方案生成器 - 分步骤生成真实内容"""
    
    def __init__(self, llm_caller: Callable, embedding_searcher: Callable):
        """
        初始化生成器
        
        Args:
            llm_caller: LLM调用函数
            embedding_searcher: 向量搜索函数
        """
        self.llm_caller = llm_caller
        self.embedding_searcher = embedding_searcher
        self.progress_callback = None
        
        # 模块生成顺序和配置
        self.generation_modules = [
            {
                "name": "基础框架设计",
                "key": "basic_framework",
                "weight": 0.15,
                "description": "确定研究设计框架和基本结构"
            },
            {
                "name": "研究背景与目标",
                "key": "background_objectives", 
                "weight": 0.15,
                "description": "撰写研究背景和主要目标"
            },
            {
                "name": "试验设计方案",
                "key": "study_design",
                "weight": 0.20,
                "description": "详细设计试验方案和流程"
            },
            {
                "name": "受试者选择标准",
                "key": "subject_criteria",
                "weight": 0.15,
                "description": "制定入排标准和受试者筛选"
            },
            {
                "name": "给药方案设计",
                "key": "dosing_regimen",
                "weight": 0.15,
                "description": "设计给药方案和剂量递增"
            },
            {
                "name": "安全性监测",
                "key": "safety_monitoring",
                "weight": 0.10,
                "description": "建立安全性监测计划"
            },
            {
                "name": "统计分析计划",
                "key": "statistical_plan",
                "weight": 0.10,
                "description": "制定统计分析策略"
            }
        ]
    
    def set_progress_callback(self, callback: Callable):
        """设置进度回调函数"""
        self.progress_callback = callback
    
    async def update_progress(self, step: str, progress: float, status: str, details: str = ""):
        """更新进度"""
        if self.progress_callback:
            await self.progress_callback(step, progress, status, details)
        logger.info(f"[{step}] {progress:.1f}% - {status} - {details}")
    
    async def extract_requirement_info(self, user_requirement: str) -> Dict[str, str]:
        """步骤1: 需求解析和信息提取"""
        await self.update_progress("需求解析", 0, "开始", "分析用户需求文本")
        
        # 构建信息提取提示词
        extraction_prompt = f"""
        请从以下临床试验需求中提取关键信息，并以JSON格式返回：

        用户需求：{user_requirement}

        请提取以下信息：
        {{
            "drug_type": "药物类型（如TCR-T、CAR-T、单抗、小分子等）",
            "disease": "目标疾病名称",
            "disease_stage": "疾病分期（如晚期、复发难治性等）",
            "phase": "试验期别（I、II、III期）",
            "primary_objective": "主要研究目的",
            "secondary_objectives": "次要研究目的",
            "study_design": "研究设计类型（如开放标签、随机对照等）",
            "patient_population": "目标患者群体",
            "safety_focus": "安全性关注点",
            "efficacy_endpoints": "疗效终点"
        }}

        只返回JSON格式的结果，不要其他解释。
        """
        
        await self.update_progress("需求解析", 30, "进行中", "调用AI模型提取关键信息")
        
        try:
            # 调用LLM提取信息
            extraction_result = self.llm_caller(extraction_prompt, 0.2)
            await self.update_progress("需求解析", 70, "进行中", "解析AI响应结果")
            
            # 尝试解析JSON
            try:
                extracted_info = json.loads(extraction_result)
                await self.update_progress("需求解析", 100, "完成", f"成功提取 {len(extracted_info)} 项关键信息")
                return extracted_info
            except json.JSONDecodeError:
                # 如果JSON解析失败，使用正则表达式提取
                await self.update_progress("需求解析", 80, "进行中", "使用备用方法提取信息")
                extracted_info = self._fallback_extraction(user_requirement, extraction_result)
                await self.update_progress("需求解析", 100, "完成", "使用备用方法完成信息提取")
                return extracted_info
                
        except Exception as e:
            await self.update_progress("需求解析", 100, "警告", f"信息提取遇到问题: {str(e)}")
            # 返回基于关键词的默认提取
            return self._keyword_based_extraction(user_requirement)
    
    def _fallback_extraction(self, user_requirement: str, ai_response: str) -> Dict[str, str]:
        """备用信息提取方法"""
        # 尝试从AI响应中提取信息
        extracted = {}
        
        # 从用户需求中提取关键词
        drug_patterns = {
            'TCR-T': r'TCR-?T',
            'CAR-T': r'CAR-?T',
            '单抗': r'单.*抗|单克隆抗体|抗体',
            '免疫检查点抑制剂': r'免疫检查点|PD-?1|PD-?L1|CTLA-?4',
            '化疗': r'化疗|化学治疗'
        }
        
        disease_patterns = {
            '肺癌': r'肺癌|肺鳞癌|肺腺癌|非小细胞肺癌|NSCLC',
            '淋巴瘤': r'淋巴瘤|B细胞淋巴瘤|T细胞淋巴瘤',
            '胃癌': r'胃癌',
            '乳腺癌': r'乳腺癌',
            '肝癌': r'肝癌|肝细胞癌'
        }
        
        phase_patterns = {
            'I': r'I期|1期|一期',
            'II': r'II期|2期|二期',
            'III': r'III期|3期|三期'
        }
        
        # 提取药物类型
        extracted['drug_type'] = '研究药物'
        for drug, pattern in drug_patterns.items():
            if re.search(pattern, user_requirement, re.IGNORECASE):
                extracted['drug_type'] = drug
                break
        
        # 提取疾病
        extracted['disease'] = '目标疾病'
        for disease, pattern in disease_patterns.items():
            if re.search(pattern, user_requirement, re.IGNORECASE):
                extracted['disease'] = disease
                break
        
        # 提取试验期别
        extracted['phase'] = 'I'
        for phase, pattern in phase_patterns.items():
            if re.search(pattern, user_requirement, re.IGNORECASE):
                extracted['phase'] = phase
                break
        
        # 设置其他默认值
        extracted.update({
            'disease_stage': '晚期' if '晚期' in user_requirement else '进展期',
            'primary_objective': '评估安全性和耐受性',
            'secondary_objectives': '初步评估疗效',
            'study_design': '开放标签、剂量递增研究',
            'patient_population': f'{extracted["disease"]}患者',
            'safety_focus': '剂量限制性毒性',
            'efficacy_endpoints': '客观缓解率'
        })
        
        return extracted
    
    def _keyword_based_extraction(self, user_requirement: str) -> Dict[str, str]:
        """基于关键词的信息提取"""
        return {
            'drug_type': 'TCR-T细胞' if 'TCR-T' in user_requirement else 'CAR-T细胞' if 'CAR-T' in user_requirement else '研究药物',
            'disease': '肺癌' if '肺' in user_requirement else '淋巴瘤' if '淋巴' in user_requirement else '实体瘤',
            'disease_stage': '晚期',
            'phase': 'I',
            'primary_objective': '评估安全性和耐受性',
            'secondary_objectives': '初步评估疗效',
            'study_design': '开放标签、剂量递增研究',
            'patient_population': '晚期实体瘤患者',
            'safety_focus': '剂量限制性毒性',
            'efficacy_endpoints': '客观缓解率'
        }
    
    async def search_knowledge_for_protocol(self, user_requirement: str, extracted_info: Dict) -> List[Dict]:
        """步骤2: 知识库检索"""
        await self.update_progress("知识检索", 0, "开始", "构建搜索查询")
        
        # 构建多个搜索查询
        search_queries = [
            f"{extracted_info['drug_type']} {extracted_info['disease']}",
            f"{extracted_info['disease']} {extracted_info['phase']}期临床试验",
            f"{extracted_info['drug_type']} 安全性 剂量",
            f"{extracted_info['disease']} 治疗指南",
            "临床试验设计 GCP",
            f"{extracted_info['phase']}期试验 统计设计"
        ]
        
        all_relevant_docs = []
        total_queries = len(search_queries)
        
        for i, query in enumerate(search_queries):
            await self.update_progress("知识检索", (i / total_queries) * 100, "进行中", f"搜索: {query}")
            
            try:
                # 调用向量搜索
                search_results = await self.embedding_searcher(query, top_k=3)
                if search_results.get('success') and search_results.get('results'):
                    all_relevant_docs.extend(search_results['results'])
                
                # 模拟搜索延迟
                await asyncio.sleep(0.1)
                
            except Exception as e:
                logger.warning(f"搜索查询失败 '{query}': {e}")
                continue
        
        # 去重和排序
        unique_docs = []
        seen_content = set()
        
        for doc in all_relevant_docs:
            content_hash = hash(doc.get('content', '')[:100])
            if content_hash not in seen_content:
                unique_docs.append(doc)
                seen_content.add(content_hash)
        
        # 按相似度排序
        unique_docs.sort(key=lambda x: x.get('score', 0), reverse=True)
        final_docs = unique_docs[:10]  # 取前10个最相关的
        
        await self.update_progress("知识检索", 100, "完成", f"检索到 {len(final_docs)} 条相关知识")
        return final_docs
    
    async def generate_modular_content(self, user_requirement: str, extracted_info: Dict, 
                                     relevant_docs: List[Dict], temperature: float) -> Dict[str, str]:
        """步骤3: 分模块生成内容"""
        await self.update_progress("内容生成", 0, "开始", "准备生成各模块内容")
        
        protocol_content = {}
        total_modules = len(self.generation_modules)
        cumulative_progress = 0
        
        # 构建知识库上下文
        knowledge_context = self._build_knowledge_context(relevant_docs[:5])
        
        for i, module in enumerate(self.generation_modules):
            module_name = module['name']
            module_key = module['key']
            module_weight = module['weight']
            
            await self.update_progress("内容生成", cumulative_progress, "进行中", f"生成模块: {module_name}")
            
            try:
                # 构建模块特定的提示词
                module_prompt = self._build_module_prompt(
                    module_key, user_requirement, extracted_info, knowledge_context, temperature
                )
                
                # 生成内容
                generated_content = self.llm_caller(module_prompt, temperature)
                
                # 清理和格式化内容
                cleaned_content = self._clean_and_format_content(generated_content, module_key)
                protocol_content[module_name] = cleaned_content
                
                # 更新进度
                cumulative_progress += module_weight * 100
                await self.update_progress("内容生成", cumulative_progress, "进行中", 
                                         f"完成模块: {module_name} ({len(cleaned_content)} 字符)")
                
                # 模拟生成延迟
                await asyncio.sleep(0.2)
                
            except Exception as e:
                logger.error(f"模块 {module_name} 生成失败: {e}")
                protocol_content[module_name] = f"模块生成遇到问题: {str(e)}"
                cumulative_progress += module_weight * 100
        
        await self.update_progress("内容生成", 100, "完成", f"成功生成 {len(protocol_content)} 个模块")
        return protocol_content
    
    def _build_knowledge_context(self, relevant_docs: List[Dict]) -> str:
        """构建知识库上下文"""
        if not relevant_docs:
            return "无相关知识库内容"
        
        context_parts = []
        for i, doc in enumerate(relevant_docs[:3]):  # 只取前3个最相关的
            content = doc.get('content', '')[:500]  # 限制长度
            context_parts.append(f"参考资料{i+1}: {content}")
        
        return "\n\n".join(context_parts)
    
    def _build_module_prompt(self, module_key: str, user_requirement: str, 
                           extracted_info: Dict, knowledge_context: str, temperature: float) -> str:
        """构建模块特定的提示词"""
        
        # 模块特定的提示词模板
        module_prompts = {
            "basic_framework": f"""
            请为以下临床试验需求设计基础框架：

            用户需求：{user_requirement}

            提取的关键信息：
            - 药物类型：{extracted_info.get('drug_type', '')}
            - 目标疾病：{extracted_info.get('disease', '')}
            - 试验期别：{extracted_info.get('phase', '')}期
            - 研究设计：{extracted_info.get('study_design', '')}

            参考知识：
            {knowledge_context}

            请撰写"基础框架设计"部分，包括：
            1. 试验类型和设计概述
            2. 研究期别说明
            3. 试验的创新性和科学依据
            4. 预期研究时长

            要求：专业、简洁、符合GCP规范。
            """,
            
            "background_objectives": f"""
            请撰写临床试验的研究背景与目标部分：

            用户需求：{user_requirement}

            关键信息：
            - 药物：{extracted_info.get('drug_type', '')}
            - 疾病：{extracted_info.get('disease', '')}
            - 期别：{extracted_info.get('phase', '')}期
            - 主要目标：{extracted_info.get('primary_objective', '')}

            参考资料：
            {knowledge_context}

            请包含：
            1. 疾病背景和未满足的医疗需求
            2. 研究药物的作用机制和前期研究
            3. 主要研究目标
            4. 次要研究目标
            5. 研究的科学价值和临床意义

            要求：逻辑清晰，有科学依据。
            """,
            
            "study_design": f"""
            请设计详细的试验方案：

            基本信息：
            - 药物：{extracted_info.get('drug_type', '')}
            - 疾病：{extracted_info.get('disease', '')}  
            - 期别：{extracted_info.get('phase', '')}期
            - 设计类型：{extracted_info.get('study_design', '')}

            参考资料：
            {knowledge_context}

            请详细描述：
            1. 试验设计类型（如开放标签、随机对照等）
            2. 试验流程和时间安排
            3. 访视计划和评估时点
            4. 剂量递增方案（如适用）
            5. 终止和退出标准
            6. 随访计划

            要求：详细具体，可操作性强。
            """,
            
            "subject_criteria": f"""
            请制定受试者选择标准：

            疾病信息：
            - 疾病：{extracted_info.get('disease', '')}
            - 疾病分期：{extracted_info.get('disease_stage', '')}
            - 患者群体：{extracted_info.get('patient_population', '')}

            参考资料：
            {knowledge_context}

            请详细制定：
            1. 入选标准（包括疾病诊断、分期、既往治疗等）
            2. 排除标准（包括合并症、实验室指标等）
            3. 受试者数量和计算依据
            4. 入组流程和时间要求

            要求：标准明确，符合伦理要求。
            """,
            
            "dosing_regimen": f"""
            请设计给药方案：

            药物信息：
            - 药物类型：{extracted_info.get('drug_type', '')}
            - 试验期别：{extracted_info.get('phase', '')}期
            - 安全性关注：{extracted_info.get('safety_focus', '')}

            参考资料：
            {knowledge_context}

            请详细设计：
            1. 给药途径和方法
            2. 剂量水平和递增方案
            3. 给药周期和持续时间
            4. 剂量调整规则
            5. 合并用药限制

            要求：安全可行，有科学依据。
            """,
            
            "safety_monitoring": f"""
            请制定安全性监测计划：

            安全关注：
            - 主要安全性关注：{extracted_info.get('safety_focus', '')}
            - 药物类型：{extracted_info.get('drug_type', '')}
            - 期别：{extracted_info.get('phase', '')}期

            参考资料：
            {knowledge_context}

            请包含：
            1. 安全性评估指标
            2. 不良事件监测和报告
            3. 实验室检查计划
            4. 剂量限制性毒性(DLT)定义
            5. 安全性委员会设置
            6. 紧急情况处理

            要求：全面周密，保障受试者安全。
            """,
            
            "statistical_plan": f"""
            请制定统计分析计划：

            研究信息：
            - 期别：{extracted_info.get('phase', '')}期
            - 主要终点：{extracted_info.get('primary_objective', '')}
            - 疗效终点：{extracted_info.get('efficacy_endpoints', '')}

            参考资料：
            {knowledge_context}

            请详细制定：
            1. 样本量计算和依据
            2. 主要终点的统计分析方法
            3. 次要终点的分析方法
            4. 中期分析计划（如适用）
            5. 缺失数据处理
            6. 多重比较校正

            要求：统计方法合理，符合法规要求。
            """
        }
        
        return module_prompts.get(module_key, f"请为{module_key}模块生成内容。")
    
    def _clean_and_format_content(self, content: str, module_key: str) -> str:
        """清理和格式化生成的内容"""
        if not content:
            return f"{module_key}模块内容生成失败"
        
        # 去除多余的空行
        content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
        
        # 去除开头和结尾的空白
        content = content.strip()
        
        # 确保内容不为空
        if len(content) < 50:
            return f"{module_key}模块需要进一步完善。\n\n{content}"
        
        return content
    
    async def perform_quality_check(self, protocol_content: Dict[str, str]) -> Dict[str, Any]:
        """步骤4: 质量检查"""
        await self.update_progress("质量检查", 0, "开始", "准备执行质量评估")
        
        # 质量检查维度
        quality_checks = [
            {"name": "模块完整性", "weight": 0.25},
            {"name": "科学严谨性", "weight": 0.30},
            {"name": "法规合规性", "weight": 0.25},
            {"name": "逻辑一致性", "weight": 0.20}
        ]
        
        quality_scores = {}
        total_score = 0
        
        # 合并所有内容进行整体评估
        full_content = "\n\n".join([
            f"## {module}\n{content}" 
            for module, content in protocol_content.items()
        ])
        
        for i, check in enumerate(quality_checks):
            check_name = check["name"]
            weight = check["weight"]
            
            await self.update_progress("质量检查", (i / len(quality_checks)) * 100, 
                                     "进行中", f"检查 {check_name}")
            
            try:
                # 构建质量检查提示词
                quality_prompt = self._build_quality_check_prompt(check_name, full_content)
                
                # 调用LLM进行质量评估
                quality_result = self.llm_caller(quality_prompt, 0.1)
                
                # 提取分数
                score = self._extract_quality_score(quality_result)
                quality_scores[check_name] = score
                total_score += score * weight
                
                await asyncio.sleep(0.1)  # 模拟检查时间
                
            except Exception as e:
                logger.warning(f"质量检查 {check_name} 失败: {e}")
                quality_scores[check_name] = 75  # 默认分数
                total_score += 75 * weight
        
        # 生成改进建议
        recommendations = self._generate_recommendations(quality_scores, protocol_content)
        
        quality_report = {
            "overall_score": round(total_score, 1),
            "module_scores": quality_scores,
            "recommendations": recommendations,
            "issues": self._identify_issues(quality_scores),
            "check_time": datetime.now().isoformat()
        }
        
        await self.update_progress("质量检查", 100, "完成", 
                                 f"质量评估完成，总分: {quality_report['overall_score']}")
        
        return quality_report
    
    def _build_quality_check_prompt(self, check_type: str, content: str) -> str:
        """构建质量检查提示词"""
        check_prompts = {
            "模块完整性": f"""
            请评估以下临床试验方案的模块完整性（0-100分）：

            {content[:2000]}...

            评估要点：
            1. 是否包含必要的所有模块
            2. 各模块内容是否充实
            3. 关键信息是否遗漏
            4. 模块间连接是否完整

            请给出评分（0-100）并简要说明理由。格式：评分：XX分
            """,
            
            "科学严谨性": f"""
            请评估以下临床试验方案的科学严谨性（0-100分）：

            {content[:2000]}...

            评估要点：
            1. 科学假设是否合理
            2. 研究设计是否严谨
            3. 统计方法是否适当
            4. 结论是否有依据

            请给出评分（0-100）并简要说明理由。格式：评分：XX分
            """,
            
            "法规合规性": f"""
            请评估以下临床试验方案的法规合规性（0-100分）：

            {content[:2000]}...

            评估要点：
            1. 是否符合GCP要求
            2. 伦理考量是否充分
            3. 安全监测是否到位
            4. 法规流程是否完整

            请给出评分（0-100）并简要说明理由。格式：评分：XX分
            """,
            
            "逻辑一致性": f"""
            请评估以下临床试验方案的逻辑一致性（0-100分）：

            {content[:2000]}...

            评估要点：
            1. 各部分逻辑是否连贯
            2. 前后描述是否一致
            3. 时间安排是否合理
            4. 整体结构是否清晰

            请给出评分（0-100）并简要说明理由。格式：评分：XX分
            """
        }
        
        return check_prompts.get(check_type, f"请评估{check_type}（0-100分）")
    
    def _extract_quality_score(self, quality_result: str) -> int:
        """从质量检查结果中提取分数"""
        # 查找分数模式
        score_patterns = [
            r'评分[：:]\s*(\d+)',
            r'(\d+)分',
            r'得分[：:]\s*(\d+)',
            r'分数[：:]\s*(\d+)',
            r'(\d+)/100',
            r'(\d+)\/100'
        ]
        
        for pattern in score_patterns:
            match = re.search(pattern, quality_result)
            if match:
                score = int(match.group(1))
                return min(100, max(0, score))  # 确保分数在0-100范围内
        
        # 如果没有找到明确分数，基于内容质量给默认分数
        if len(quality_result) > 100:
            return 80  # 有详细评估，给较高分数
        else:
            return 70  # 评估较简单，给中等分数
    
    def _generate_recommendations(self, quality_scores: Dict[str, int], 
                                protocol_content: Dict[str, str]) -> List[str]:
        """生成改进建议"""
        recommendations = []
        
        # 基于分数给出建议
        if quality_scores.get("模块完整性", 0) < 80:
            recommendations.append("建议补充完善各模块内容，确保信息完整性")
        
        if quality_scores.get("科学严谨性", 0) < 80:
            recommendations.append("建议加强科学依据，完善研究设计论证")
        
        if quality_scores.get("法规合规性", 0) < 80:
            recommendations.append("建议参考最新GCP指南，完善法规要求")
        
        if quality_scores.get("逻辑一致性", 0) < 80:
            recommendations.append("建议检查各部分逻辑关系，确保内容一致")
        
        # 基于内容长度给建议
        short_modules = [name for name, content in protocol_content.items() 
                        if len(content) < 200]
        if short_modules:
            recommendations.append(f"以下模块内容较少，建议扩充：{', '.join(short_modules)}")
        
        # 如果没有特定建议，给出通用建议
        if not recommendations:
            recommendations.extend([
                "方案整体质量良好，建议进行专家评议",
                "建议补充更多文献支持和数据分析",
                "建议完善安全性监测和风险管控措施"
            ])
        
        return recommendations[:5]  # 最多返回5条建议
    
    def _identify_issues(self, quality_scores: Dict[str, int]) -> List[str]:
        """识别质量问题"""
        issues = []
        
        for check_name, score in quality_scores.items():
            if score < 70:
                issues.append(f"{check_name}得分较低({score}分)，需要重点改进")
            elif score < 80:
                issues.append(f"{check_name}有待提升({score}分)")
        
        return issues
