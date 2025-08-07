"""
Core constants for the VoiceTransl API
"""

ONLINE_TRANSLATOR_MAPPING = {
    'moonshot': 'https://api.moonshot.cn',
    'glm': 'https://open.bigmodel.cn/api/paas',
    'deepseek': 'https://api.deepseek.com',
    'minimax': 'https://api.minimax.chat',
    'doubao': 'https://ark.cn-beijing.volces.com/api',
    'aliyun': 'https://dashscope.aliyuncs.com/compatible-mode',
    'gemini': 'https://generativelanguage.googleapis.com',
    'ollama': 'http://localhost:11434',
    'llamacpp': 'http://localhost:8989',
}

TRANSLATOR_SUPPORTED = [
    '不进行翻译',
    "gpt-custom",
    "sakura-009",
    "sakura-010",
    "galtransl"
] + list(ONLINE_TRANSLATOR_MAPPING.keys())