from start_simple import validate_extraction_quality


def test_validate_extraction_quality():
    info = {
        "drug_type": "待确定",
        "disease": "待定",
        "trial_phase": "",
        "primary_endpoint": ""
    }
    result = validate_extraction_quality(info)
    assert result["score"] < 100
    assert "药物类型未明确" in result["issues"]
    assert "目标疾病未明确" in result["issues"]
