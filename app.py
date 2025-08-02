import sys, os

# if _MEIPASS is in sys
if '_MEIPASS' in sys.__dict__:
    os.chdir(sys._MEIPASS)
    
import shutil
from PyQt6 import QtGui, QtCore
from PyQt6.QtCore import Qt, QThread, QObject, pyqtSignal, QTimer, QDateTime, QSize
from PyQt6.QtWidgets import QApplication, QVBoxLayout, QFileDialog, QFrame
from qfluentwidgets import PushButton as QPushButton, TextEdit as QTextEdit, LineEdit as QLineEdit, ComboBox as QComboBox, Slider as QSlider, FluentWindow as QMainWindow, PlainTextEdit as QPlainTextEdit, SplashScreen
from qfluentwidgets import FluentIcon, NavigationItemPosition, SubtitleLabel, TitleLabel, BodyLabel

import re
import json
import requests
import subprocess
from time import sleep
from prompt2srt import make_srt, make_lrc
from srt2prompt import make_prompt
from GalTransl.__main__ import worker

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

# redirect sys.stdout and sys.stderr to one log file
LOG_PATH = 'log.txt'
sys.stdout = open(LOG_PATH, 'w', encoding='utf-8')
sys.stderr = sys.stdout

class Widget(QFrame):

    def __init__(self, text: str, parent=None):
        super().__init__(parent=parent)
        # Set the scroll area as the parent of the widget
        self.vBoxLayout = QVBoxLayout(self)

        # Must set a globally unique object name for the sub-interface
        self.setObjectName(text.replace(' ', '-'))

class MainWindow(QMainWindow):
    status = pyqtSignal(str)

    def __init__(self):
        super().__init__()
        self.thread = None
        self.worker = None
        self.setWindowTitle("VoiceTransl")
        self.setWindowIcon(QtGui.QIcon('icon.png'))
        self.status.connect(lambda x: self.setWindowTitle(f"VoiceTransl - {x}"))
        self.resize(800, 600)
        self.splashScreen = SplashScreen(self.windowIcon(), self)
        self.splashScreen.setIconSize(QSize(102, 102))
        self.show()
        self.initUI()
        self.setup_timer()
        self.splashScreen.finish()
        
    def initUI(self):
        self.initAboutTab()
        self.initInputOutputTab()
        self.initLogTab()
        self.initSettingsTab()
        self.initAdvancedSettingTab()
        self.initDictTab()

        # load config (simplified - no whisper model selection needed)
        if os.path.exists('config.txt'):
            with open('config.txt', 'r', encoding='utf-8') as f:
                lines = f.readlines()
                if len(lines) >= 8:  # Skip whisper_file (line 0), start from translator
                    translator = lines[1].strip()
                    language = lines[2].strip()
                    gpt_token = lines[3].strip()
                    gpt_address = lines[4].strip()
                    gpt_model = lines[5].strip()
                    sakura_file = lines[6].strip()
                    sakura_mode = int(lines[7].strip())
                    output_format = lines[8].strip()

                    self.translator_group.setCurrentText(translator)
                    self.input_lang.setCurrentText(language)
                    self.gpt_token.setText(gpt_token)
                    self.gpt_address.setText(gpt_address)
                    self.gpt_model.setText(gpt_model)
                    if self.sakura_file: self.sakura_file.setCurrentText(sakura_file)
                    self.sakura_mode.setValue(sakura_mode)

                    self.output_format.setCurrentText(output_format)

        # Load anime-whisper config if exists
        if os.path.exists('anime_whisper_config.txt'):
            with open('anime_whisper_config.txt', 'r', encoding='utf-8') as f:
                config_line = f.read().strip()
                if config_line == 'suppress_repetitions':
                    self.suppress_repetitions.setCurrentText('启用重复抑制')

        if os.path.exists('llama/param.txt'):
            with open('llama/param.txt', 'r', encoding='utf-8') as f:
                self.param_llama.setPlainText(f.read())

        if os.path.exists('project/dict_pre.txt'):
            with open('project/dict_pre.txt', 'r', encoding='utf-8') as f:
                self.before_dict.setPlainText(f.read())

        if os.path.exists('project/dict_gpt.txt'):
            with open('project/dict_gpt.txt', 'r', encoding='utf-8') as f:
                self.gpt_dict.setPlainText(f.read())

        if os.path.exists('project/dict_after.txt'):
            with open('project/dict_after.txt', 'r', encoding='utf-8') as f:
                self.after_dict.setPlainText(f.read())

        if os.path.exists('project/extra_prompt.txt'):
            with open('project/extra_prompt.txt', 'r', encoding='utf-8') as f:
                self.extra_prompt.setPlainText(f.read())

    def setup_timer(self):
        self.timer = QTimer(self)
        self.timer.timeout.connect(self.read_log_file)
        self.timer.start(1000)
        self.last_read_position = 0
        self.file_not_found_message_shown = False

    def read_log_file(self):
        """读取日志文件并更新显示"""
        try:
            # 检查文件是否存在
            if not os.path.exists(LOG_PATH):
                if not self.file_not_found_message_shown:
                    timestamp = QDateTime.currentDateTime().toString("yyyy-MM-dd hh:mm:ss")
                    self.log_display.setPlainText(f"[{timestamp}] 错误: 日志文件 '{LOG_PATH}' 未找到。正在等待文件创建...\n")
                    self.file_not_found_message_shown = True
                self.last_read_position = 0 # 如果文件消失了，重置读取位置
                return

            # 如果文件之前未找到但现在找到了
            if self.file_not_found_message_shown:
                self.log_display.clear() # 清除之前的错误信息
                self.file_not_found_message_shown = False
                self.last_read_position = 0 # 从头开始读

            with open(LOG_PATH, 'r', encoding='utf-8', errors='replace') as f:
                # 检查文件是否被截断或替换 (例如日志轮转)
                # 通过 seek(0, 2) 获取当前文件大小
                current_file_size = f.seek(0, os.SEEK_END)
                if current_file_size < self.last_read_position:
                    # 文件变小了，意味着文件被截断或替换了
                    timestamp = QDateTime.currentDateTime().toString("yyyy-MM-dd hh:mm:ss")
                    self.log_display.appendPlainText(f"\n[{timestamp}] 检测到日志文件截断或轮转。从头开始读取...\n")
                    self.last_read_position = 0
                    # 可以选择清空显示: self.log_display.clear()
                    # 但通常追加提示然后从头读新内容更好

                f.seek(self.last_read_position)
                new_content = f.read()
                if new_content:
                    self.log_display.appendPlainText(new_content) # appendPlainText 会自动处理换行
                    # 自动滚动到底部
                    scrollbar = self.log_display.verticalScrollBar()
                    scrollbar.setValue(scrollbar.maximum())

                self.last_read_position = f.tell() # 更新下次读取的起始位置

        except FileNotFoundError: # 这个理论上在上面的 os.path.exists 检查后不应频繁触发
            if not self.file_not_found_message_shown:
                timestamp = QDateTime.currentDateTime().toString("yyyy-MM-dd hh:mm:ss")
                self.log_display.setPlainText(f"[{timestamp}] 错误: 日志文件 '{LOG_PATH}' 再次检查时未找到。\n")
                self.file_not_found_message_shown = True
            self.last_read_position = 0
        except IOError as e:
            timestamp = QDateTime.currentDateTime().toString("yyyy-MM-dd hh:mm:ss")
            self.log_display.appendPlainText(f"[{timestamp}] 读取日志文件IO错误: {e}\n")
            # 可以考虑在IO错误时停止timer或做其他处理
        except Exception as e:
            timestamp = QDateTime.currentDateTime().toString("yyyy-MM-dd hh:mm:ss")
            self.log_display.appendPlainText(f"[{timestamp}] 读取日志文件时发生未知错误: {e}\n")

    def closeEvent(self, event):
        """确保在关闭窗口时停止定时器"""
        self.timer.stop()
        event.accept()

    def initLogTab(self):
        self.log_tab = Widget("Log", self)
        self.log_layout = self.log_tab.vBoxLayout
        self.log_layout.addWidget(BodyLabel("📜 日志文件"))

        # log
        self.log_display = QPlainTextEdit(self)
        self.log_display.setReadOnly(True)
        self.log_display.setStyleSheet("font-family: Consolas, Monospace; font-size: 10pt;") # 设置等宽字体
        self.log_layout.addWidget(self.log_display)

        self.addSubInterface(self.log_tab, FluentIcon.INFO, "日志", NavigationItemPosition.TOP)

    def initAboutTab(self):
        self.about_tab = Widget("About", self)
        self.about_layout = self.about_tab.vBoxLayout

        # introduce
        self.about_layout.addWidget(TitleLabel("🎉 感谢使用VoiceTransl！"))
        self.introduce_text = QTextEdit()
        self.introduce_text.setReadOnly(True)
        self.introduce_text.setPlainText(
"""
VoiceTransl（原Galtransl for ASMR）是一个开源免费的离线AI视频字幕生成和翻译软件，您可以使用本程序从外语音视频文件/字幕文件生成中文字幕文件。

项目地址及使用说明: https://github.com/shinnpuru/VoiceTransl。
B站教程：https://space.bilibili.com/36464441/lists/3239068。
""")
        self.about_layout.addWidget(self.introduce_text)

        # mode
        self.about_layout.addWidget(TitleLabel("🔧 模式说明"))
        self.mode_text = QTextEdit()
        self.mode_text.setReadOnly(True)
        self.mode_text.setPlainText(
"""
（1）仅下载模式：选择不进行听写和不进行翻译；
（2）仅听写模式：选择听写模型，选择不进行翻译；
（3）仅翻译模式：上传SRT文件，并且选择翻译模型；  
（4）完整模式：选择所有功能。
""")
        self.about_layout.addWidget(self.mode_text)

        # disclaimer
        self.about_layout.addWidget(TitleLabel("🎇 支持昕蒲"))
        self.disclaimer_text = QTextEdit()
        self.disclaimer_text.setReadOnly(True)
        self.disclaimer_text.setPlainText(
"""
如果您喜欢这个项目并希望支持开发，欢迎通过以下方式赞助：
1. 爱发电: https://afdian.com/a/shinnpuru（微信和支付宝）
2. B站充电: https://space.bilibili.com/36464441（大会员可用免费B币）
3. Ko-fi: https://ko-fi.com/U7U018MISY（PayPal及信用卡）
您的支持将帮助昕蒲持续改进和维护这个项目！
""")
        self.about_layout.addWidget(self.disclaimer_text)

        # start
        self.start_button = QPushButton("🚀 开始")
        self.start_button.clicked.connect(lambda: self.switchTo(self.input_output_tab))
        self.about_layout.addWidget(self.start_button)

        self.addSubInterface(self.about_tab, FluentIcon.HEART, "关于", NavigationItemPosition.TOP)
        
    def initInputOutputTab(self):
        self.input_output_tab = Widget("Home", self)
        self.input_output_layout = self.input_output_tab.vBoxLayout
        
        # Input Section
        self.input_output_layout.addWidget(BodyLabel("📂 请拖拽音视频文件/SRT文件到这里，可多选，路径请勿包含非英文和空格。"))
        self.input_files_list = QTextEdit()
        self.input_files_list.setAcceptDrops(True)
        self.input_files_list.dropEvent = lambda e: self.input_files_list.setPlainText('\n'.join([i[8:] for i in e.mimeData().text().split('\n')]))
        self.input_files_list.setPlaceholderText("当前未选择本地文件...")
        self.input_output_layout.addWidget(self.input_files_list)



        # Format Section
        self.input_output_layout.addWidget(BodyLabel("🎥 选择输出的字幕格式。"))
        self.output_format = QComboBox()
        self.output_format.addItems(['原文SRT', '中文LRC', '中文SRT'])
        self.output_format.setCurrentText('中文SRT')
        self.input_output_layout.addWidget(self.output_format)

        self.run_button = QPushButton("🚀 运行")
        self.run_button.clicked.connect(self.run_worker)
        self.input_output_layout.addWidget(self.run_button)

        self.output_text_edit = QTextEdit()
        self.output_text_edit.setReadOnly(True)
        self.output_text_edit.setPlaceholderText("当前无输出信息...")
        self.status.connect(self.output_text_edit.append)
        self.input_output_layout.addWidget(self.output_text_edit)

        self.open_output_button = QPushButton("📁 打开下载和缓存文件夹")
        self.open_output_button.clicked.connect(lambda: os.startfile(os.path.join(os.getcwd(),'project/cache')))
        self.input_output_layout.addWidget(self.open_output_button)
        
        self.clean_button = QPushButton("🧹 清空下载和缓存")
        self.clean_button.clicked.connect(self.cleaner)
        self.input_output_layout.addWidget(self.clean_button)
        
        self.addSubInterface(self.input_output_tab, FluentIcon.HOME, "主页", NavigationItemPosition.TOP)

    def initDictTab(self):
        self.dict_tab = Widget("Dict", self)
        self.dict_layout = self.dict_tab.vBoxLayout

        self.dict_layout.addWidget(BodyLabel("📚 配置翻译前的字典。"))
        self.before_dict = QTextEdit()
        self.before_dict.setPlaceholderText("日文原文(Tab键)日文替换词\n日文原文(Tab键)日文替换词")
        self.dict_layout.addWidget(self.before_dict)
        
        self.dict_layout.addWidget(BodyLabel("📚 配置翻译中的字典。"))
        self.gpt_dict = QTextEdit()
        self.gpt_dict.setPlaceholderText("日文(Tab键)中文\n日文(Tab键)中文")
        self.dict_layout.addWidget(self.gpt_dict)
        
        self.dict_layout.addWidget(BodyLabel("📚 配置翻译后的字典。"))
        self.after_dict = QTextEdit()
        self.after_dict.setPlaceholderText("中文原文(Tab键)中文替换词\n中文原文(Tab键)中文替换词")
        self.dict_layout.addWidget(self.after_dict)

        self.dict_layout.addWidget(BodyLabel("📕 配置额外提示。"))
        self.extra_prompt = QTextEdit()
        self.extra_prompt.setPlaceholderText("请在这里输入额外的提示信息，例如世界书或台本内容。")
        self.dict_layout.addWidget(self.extra_prompt)

        self.addSubInterface(self.dict_tab, FluentIcon.DICTIONARY, "字典设置", NavigationItemPosition.TOP)
        
    def initSettingsTab(self):
        self.settings_tab = Widget("Settings", self)
        self.settings_layout = self.settings_tab.vBoxLayout
        
        # Hybrid transcription system with improved timestamp accuracy
        self.settings_layout.addWidget(BodyLabel("🚀 混合转录系统: TinyWhisper(时间戳) + AnimeWhisper(文本) + 智能对齐"))

        self.settings_layout.addWidget(BodyLabel("🌍 选择输入的语言。(ja=日语，en=英语，ko=韩语，ru=俄语，fr=法语，zh=中文，仅听写）"))
        self.input_lang = QComboBox()
        self.input_lang.addItems(['ja','en','ko','ru','fr','zh'])
        self.settings_layout.addWidget(self.input_lang)

        self.settings_layout.addWidget(BodyLabel("🔧 转录系统配置选项"))

        # Alignment backend selection
        self.alignment_backend = QComboBox()
        self.alignment_backend.addItems(['本地Qwen3模型', 'OpenAI兼容API', 'Gemini原生API'])
        self.alignment_backend.setCurrentText('本地Qwen3模型')
        self.settings_layout.addWidget(BodyLabel("对齐后端:"))
        self.settings_layout.addWidget(self.alignment_backend)

        # API configuration (initially hidden)
        self.api_config_label = BodyLabel("🌐 API配置:")
        self.settings_layout.addWidget(self.api_config_label)

        # API endpoint (for OpenAI-compatible APIs)
        self.api_endpoint = QLineEdit()
        self.api_endpoint.setPlaceholderText("API端点 (例如: https://api.openai.com/v1)")
        self.api_endpoint.setText("https://api.openai.com/v1")
        self.api_endpoint_label = BodyLabel("API端点:")
        self.settings_layout.addWidget(self.api_endpoint_label)
        self.settings_layout.addWidget(self.api_endpoint)

        # API key (for all API backends)
        self.api_key = QLineEdit()
        self.api_key.setPlaceholderText("API密钥")
        self.api_key.setEchoMode(QLineEdit.EchoMode.Password)
        self.api_key_label = BodyLabel("API密钥:")
        self.settings_layout.addWidget(self.api_key_label)
        self.settings_layout.addWidget(self.api_key)

        # Model selection (different for different backends)
        self.api_model_label = BodyLabel("模型:")
        self.settings_layout.addWidget(self.api_model_label)

        # OpenAI/Generic model input
        self.api_model_input = QLineEdit()
        self.api_model_input.setPlaceholderText("模型名称 (例如: gpt-4, gpt-3.5-turbo)")
        self.api_model_input.setText("gpt-4")
        self.settings_layout.addWidget(self.api_model_input)

        # Gemini model selection
        self.gemini_model_combo = QComboBox()
        self.gemini_model_combo.addItems([
            'gemini-2.5-pro',
            'gemini-2.5-flash',
            'gemini-2.5-flash-lite'
        ])
        self.gemini_model_combo.setCurrentText('gemini-2.0-flash-exp')
        self.settings_layout.addWidget(self.gemini_model_combo)

        # Initially hide API config
        self._toggle_api_config(False, "openai")

        # Connect alignment backend change to toggle API config
        self.alignment_backend.currentTextChanged.connect(self._on_alignment_backend_changed)

        # Repetition handling option
        self.suppress_repetitions = QComboBox()
        self.suppress_repetitions.addItems(['关闭重复抑制', '启用重复抑制'])
        self.suppress_repetitions.setCurrentText('关闭重复抑制')
        self.settings_layout.addWidget(BodyLabel("重复抑制（如果出现重复幻觉可启用）："))
        self.settings_layout.addWidget(self.suppress_repetitions)

        self.addSubInterface(self.settings_tab, FluentIcon.MUSIC, "听写设置", NavigationItemPosition.TOP)

    def _toggle_api_config(self, show: bool, backend_type: str = "openai"):
        """Toggle visibility of API configuration fields"""
        self.api_config_label.setVisible(show)
        self.api_key.setVisible(show)
        self.api_key_label.setVisible(show)
        self.api_model_label.setVisible(show)

        # Show/hide endpoint based on backend type
        is_openai = (backend_type == "openai")
        self.api_endpoint.setVisible(show and is_openai)
        self.api_endpoint_label.setVisible(show and is_openai)

        # Show appropriate model selection widget
        self.api_model_input.setVisible(show and is_openai)
        self.gemini_model_combo.setVisible(show and not is_openai)

    def _on_alignment_backend_changed(self, text: str):
        """Handle alignment backend selection change"""
        show_api_config = (text in ['OpenAI兼容API', 'Gemini原生API'])

        if text == 'Gemini原生API':
            self._toggle_api_config(show_api_config, "gemini")
            # Set default Gemini model
            self.gemini_model_combo.setCurrentText("gemini-2.0-flash-exp")
        elif text == 'OpenAI兼容API':
            self._toggle_api_config(show_api_config, "openai")
            # Set default OpenAI values
            self.api_endpoint.setText("https://api.openai.com/v1")
            self.api_model_input.setText("gpt-4")
        else:
            self._toggle_api_config(False, "openai")

    def initAdvancedSettingTab(self):
        self.advanced_settings_tab = Widget("AdvancedSettings", self)
        self.advanced_settings_layout = self.advanced_settings_tab.vBoxLayout

        # Translator Section
        self.advanced_settings_layout.addWidget(BodyLabel("🚀 选择用于翻译的模型类别。"))
        self.translator_group = QComboBox()
        self.translator_group.addItems(TRANSLATOR_SUPPORTED)
        self.advanced_settings_layout.addWidget(self.translator_group)
        
        self.advanced_settings_layout.addWidget(BodyLabel("🚀 在线模型令牌"))
        self.gpt_token = QLineEdit()
        self.gpt_token.setPlaceholderText("留空为使用上次配置的Token。")
        self.advanced_settings_layout.addWidget(self.gpt_token)

        self.advanced_settings_layout.addWidget(BodyLabel("🚀 在线模型名称"))
        self.gpt_model = QLineEdit()
        self.gpt_model.setPlaceholderText("例如：deepseek-chat")
        self.advanced_settings_layout.addWidget(self.gpt_model)

        self.advanced_settings_layout.addWidget(BodyLabel("🚀 自定义API地址（gpt-custom）"))
        self.gpt_address = QLineEdit()
        self.gpt_address.setPlaceholderText("例如：http://127.0.0.1:11434")
        self.advanced_settings_layout.addWidget(self.gpt_address)
        
        self.advanced_settings_layout.addWidget(BodyLabel("💻 离线模型文件（galtransl， sakura，llamacpp）"))
        self.sakura_file = QComboBox()
        sakura_lst = [i for i in os.listdir('llama') if i.endswith('gguf')]
        self.sakura_file.addItems(sakura_lst)
        self.advanced_settings_layout.addWidget(self.sakura_file)
        
        self.advanced_settings_layout.addWidget(BodyLabel("💻 离线模型参数（galtransl， sakura，llamacpp）"))
        self.sakura_value = QLineEdit()
        self.sakura_value.setPlaceholderText("100")
        self.sakura_value.setReadOnly(True)
        self.advanced_settings_layout.addWidget(self.sakura_value)
        self.sakura_mode = QSlider(Qt.Orientation.Horizontal)
        self.sakura_mode.setRange(0, 100)
        self.sakura_mode.setValue(100)
        self.sakura_mode.valueChanged.connect(lambda: self.sakura_value.setText(str(self.sakura_mode.value())))
        self.advanced_settings_layout.addWidget(self.sakura_mode)

        self.open_model_dir = QPushButton("📁 打开离线模型目录")
        self.open_model_dir.clicked.connect(lambda: os.startfile(os.path.join(os.getcwd(),'llama')))
        self.advanced_settings_layout.addWidget(self.open_model_dir)

        self.advanced_settings_layout.addWidget(BodyLabel("🔧 输入Llama.cpp命令行参数。"))
        self.param_llama = QTextEdit()
        self.param_llama.setPlaceholderText("每个参数空格隔开，请参考Llama.cpp文档，不清楚请保持默认。")
        self.advanced_settings_layout.addWidget(self.param_llama)

        self.addSubInterface(self.advanced_settings_tab, FluentIcon.BOOK_SHELF, "翻译设置", NavigationItemPosition.TOP)






        
    def select_input(self):
        options = QFileDialog.Options()
        files, _ = QFileDialog.getOpenFileNames(self, "选择音视频文件/SRT文件", "", "All Files (*);;Video Files (*.mp4 *.webm, *.flv);;SRT Files (*.srt);;Audio Files (*.wav, *.mp3, *.flac)", options=options)
        if files:
            self.input_files_list.setPlainText('\n'.join(files))

    def run_worker(self):
        self.thread = QThread()
        self.worker = MainWorker(self)
        self.worker.moveToThread(self.thread)
        self.thread.started.connect(self.worker.run)
        self.worker.finished.connect(self.thread.quit)
        self.thread.start()




    
    def cleaner(self):
        self.status.emit("[INFO] 正在清理中间文件...")
        if os.path.exists('project/gt_input'):
            shutil.rmtree('project/gt_input')
        if os.path.exists('project/gt_output'):
            shutil.rmtree('project/gt_output')
        if os.path.exists('project/transl_cache'):
            shutil.rmtree('project/transl_cache')
        self.status.emit("[INFO] 正在清理输出...")
        if os.path.exists('project/cache'):
            shutil.rmtree('project/cache')
        os.makedirs('project/cache', exist_ok=True)

def error_handler(func):
    def wrapper(self):
        try:
            func(self)
        except Exception as e:
            self.status.emit(f"[ERROR] {e}")
            self.finished.emit()
    return wrapper
class MainWorker(QObject):
    finished = pyqtSignal()

    def __init__(self, master):
        super().__init__()
        self.master = master
        self.status = master.status

    @error_handler
    def save_config(self):
        self.status.emit("[INFO] 正在读取配置...")
        # No whisper_file needed - always use anime-whisper
        translator = self.master.translator_group.currentText()
        language = self.master.input_lang.currentText()
        gpt_token = self.master.gpt_token.text()
        gpt_address = self.master.gpt_address.text()
        gpt_model = self.master.gpt_model.text()
        sakura_file = self.master.sakura_file.currentText()
        sakura_mode = self.master.sakura_mode.value()
        output_format = self.master.output_format.currentText()

        # save config (keep format for compatibility, but whisper_file is always anime-whisper)
        with open('config.txt', 'w', encoding='utf-8') as f:
            f.write(f"anime-whisper\n{translator}\n{language}\n{gpt_token}\n{gpt_address}\n{gpt_model}\n{sakura_file}\n{sakura_mode}\n{output_format}\n")

        # save anime-whisper config
        with open('anime_whisper_config.txt', 'w', encoding='utf-8') as f:
            if self.master.suppress_repetitions.currentText() == '启用重复抑制':
                f.write('suppress_repetitions')
            else:
                f.write('')

        # save llama param
        with open('llama/param.txt', 'w', encoding='utf-8') as f:
            f.write(self.master.param_llama.toPlainText())

        # save before dict
        with open('project/dict_pre.txt', 'w', encoding='utf-8') as f:
            f.write(self.master.before_dict.toPlainText())

        # save gpt dict
        with open('project/dict_gpt.txt', 'w', encoding='utf-8') as f:
            f.write(self.master.gpt_dict.toPlainText())

        # save after dict
        with open('project/dict_after.txt', 'w', encoding='utf-8') as f:
            f.write(self.master.after_dict.toPlainText())

        self.status.emit("[INFO] 配置保存完成！")















    @error_handler
    def run(self):
        self.save_config()
        input_files = self.master.input_files_list.toPlainText()
        # Use hybrid transcription system for better accuracy
        translator = self.master.translator_group.currentText()
        language = self.master.input_lang.currentText()
        gpt_token = self.master.gpt_token.text()
        gpt_address = self.master.gpt_address.text()
        gpt_model = self.master.gpt_model.text()
        sakura_file = self.master.sakura_file.currentText()
        sakura_mode = self.master.sakura_mode.value()
        before_dict = self.master.before_dict.toPlainText()
        gpt_dict = self.master.gpt_dict.toPlainText()
        after_dict = self.master.after_dict.toPlainText()
        extra_prompt = self.master.extra_prompt.toPlainText()
        # Get anime-whisper config
        suppress_repetitions = self.master.suppress_repetitions.currentText() == '启用重复抑制'
        param_llama = self.master.param_llama.toPlainText()
        output_format = self.master.output_format.currentText()

        if not gpt_token:
            gpt_token = 'sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'

        # Old whisper parameter files are no longer needed

        with open('llama/param.txt', 'w', encoding='utf-8') as f:
            f.write(param_llama)

        self.status.emit("[INFO] 正在初始化项目文件夹...")

        os.makedirs('project/cache', exist_ok=True)
        if before_dict:
            with open('project/dict_pre.txt', 'w', encoding='utf-8') as f:
                f.write(before_dict.replace(' ','\t'))
        else:
            if os.path.exists('project/dict_pre.txt'):
                os.remove('project/dict_pre.txt')
        if gpt_dict:
            with open('project/dict_gpt.txt', 'w', encoding='utf-8') as f:
                f.write(gpt_dict.replace(' ','\t'))
        else:
            if os.path.exists('project/dict_gpt.txt'):
                os.remove('project/dict_gpt.txt')
        if after_dict:
            with open('project/dict_after.txt', 'w', encoding='utf-8') as f:
                f.write(after_dict.replace(' ','\t'))
        else:
            if os.path.exists('project/dict_after.txt'):
                os.remove('project/dict_after.txt')
        if extra_prompt:
            with open('project/extra_prompt.txt', 'w', encoding='utf-8') as f:
                f.write(extra_prompt)
        else:
            if os.path.exists('project/extra_prompt.txt'):
                os.remove('project/extra_prompt.txt')

        self.status.emit(f"[INFO] 当前输入文件：{input_files}")

        if input_files:
            input_files = input_files.split('\n')
        else:
            input_files = []

        os.makedirs('project/cache', exist_ok=True)

        self.status.emit("[INFO] 正在进行翻译配置...")
        with open('project/config.yaml', 'r', encoding='utf-8') as f:
            lines = f.readlines()

        for idx, line in enumerate(lines):
            if 'language' in line:
                lines[idx] = f'  language: "{language}2zh-cn"\n'
            if 'gpt' in translator:
                if not gpt_address:
                    gpt_address = 'https://api.openai.com'
                if not gpt_model:
                    gpt_model = ''
                if 'GPT35:' in line:
                    lines[idx+2] = f"      - token: {gpt_token}\n"
                    lines[idx+4] = f"    defaultEndpoint: {gpt_address}\n"
                    lines[idx+5] = f'    rewriteModelName: "{gpt_model}"\n'
            for name, api in ONLINE_TRANSLATOR_MAPPING.items():
                if name == translator:
                    if 'llamacpp' in translator:
                        gpt_model = sakura_file
                    if 'GPT35:' in line:
                        lines[idx+2] = f"      - token: {gpt_token}\n"
                        lines[idx+4] = f"    defaultEndpoint: {api}\n"
                        lines[idx+5] = f'    rewriteModelName: "{gpt_model}"\n'
            if 'proxy' in line:
                lines[idx+1] = "  enableProxy: false\n"

        with open('project/config.yaml', 'w', encoding='utf-8') as f:
            f.writelines(lines)

        for idx, input_file in enumerate(input_files):
            if not os.path.exists(input_file):
                self.status.emit(f"[ERROR] 文件不存在：{input_file}")
                continue

            self.status.emit(f"[INFO] 当前处理文件：{input_file} 第{idx+1}个，共{len(input_files)}个")

            os.makedirs('project/gt_input', exist_ok=True)
            if input_file.endswith('.srt'):
                self.status.emit("[INFO] 正在进行字幕转换...")
                output_file_path = os.path.join('project/gt_input', os.path.basename(input_file).replace('.srt','.json'))
                make_prompt(input_file, output_file_path)
                self.status.emit("[INFO] 字幕转换完成！")
                input_file = input_file[:-4]
            else:
                # Perform transcription with hybrid system for improved timestamp accuracy

                # Check if input audio file exists
                if not os.path.exists(input_file):
                    self.status.emit("[ERROR] 音频文件不存在，请检查文件路径！")
                    break

                self.status.emit("[INFO] 正在进行语音识别...")

                # Use hybrid transcription system for better timestamp accuracy
                try:
                    from hybrid_transcription_backend import HybridTranscriptionBackend

                    # Get alignment backend configuration
                    backend_text = self.master.alignment_backend.currentText()
                    if backend_text == 'OpenAI兼容API':
                        alignment_type = "openai"
                    elif backend_text == 'Gemini原生API':
                        alignment_type = "gemini"
                    else:
                        alignment_type = "qwen3"

                    # Prepare configuration
                    config = {"alignment_type": alignment_type}

                    if alignment_type in ["openai", "gemini"]:
                        # Get API key (common for both)
                        api_key = self.master.api_key.text().strip()

                        if alignment_type == "openai":
                            config.update({
                                "api_endpoint": self.master.api_endpoint.text().strip(),
                                "api_key": api_key,
                                "model_name": self.master.api_model_input.text().strip()
                            })
                        else:  # gemini
                            config.update({
                                "api_key": api_key,
                                "model_name": self.master.gemini_model_combo.currentText()
                            })

                        # Validate API configuration
                        if not api_key:
                            self.status.emit("[ERROR] API密钥未配置")
                            continue

                        if alignment_type == "openai":
                            if not config["api_endpoint"]:
                                self.status.emit("[ERROR] API端点未配置")
                                continue
                            if not config["model_name"]:
                                self.status.emit("[ERROR] 模型名称未配置")
                                continue
                        else:  # gemini
                            if not config["model_name"]:
                                self.status.emit("[ERROR] Gemini模型未选择")
                                continue

                    # Initialize hybrid transcription backend
                    alignment_name = {
                        "openai": "OpenAI兼容API",
                        "gemini": "Gemini原生API",
                        "qwen3": "Qwen3"
                    }.get(alignment_type, "Qwen3")
                    self.status.emit(f"[INFO] 初始化混合转录系统 (TinyWhisper + AnimeWhisper + {alignment_name})...")
                    backend = HybridTranscriptionBackend(config)
                    if not backend.initialize():
                        self.status.emit("[ERROR] Failed to initialize hybrid transcription system")
                        continue

                    # Get configuration
                    suppress_repetitions = self.master.suppress_repetitions.currentText() == '启用重复抑制'

                    # Transcribe audio using hybrid system
                    self.status.emit("[INFO] 使用混合转录系统进行高质量转录...")

                    srt_output_path = '.'.join(input_file.split('.')[:-1]) + '.srt'

                    # Define progress callback to update UI in real-time
                    def progress_callback(message):
                        self.status.emit(message)

                    success = backend.transcribe_to_srt(
                        input_file,  # Use original audio file directly
                        srt_output_path,
                        language=language,
                        progress_callback=progress_callback,
                        suppress_repetitions=suppress_repetitions
                    )

                    if not success:
                        self.status.emit("[ERROR] Hybrid transcription failed")
                        continue

                    self.status.emit("[INFO] ✅ 混合转录完成！时间戳准确性大幅提升！")

                    # Clean up backend
                    backend.cleanup()

                except Exception as e:
                    self.status.emit(f"[ERROR] Hybrid transcription error: {str(e)}")
                    # Fallback to original anime-whisper if hybrid system fails
                    self.status.emit("[INFO] 回退到原始 AnimeWhisper 系统...")
                    try:
                        from anime_whisper_backend import AnimeWhisperBackend

                        backend = AnimeWhisperBackend()
                        if not backend.initialize():
                            self.status.emit("[ERROR] Failed to initialize fallback anime-whisper model")
                            continue

                        suppress_repetitions = self.master.suppress_repetitions.currentText() == '启用重复抑制'
                        srt_output_path = '.'.join(input_file.split('.')[:-1]) + '.srt'

                        success = backend.transcribe_to_srt(
                            input_file,
                            srt_output_path,
                            language=language,
                            suppress_repetitions=suppress_repetitions
                        )

                        if not success:
                            self.status.emit("[ERROR] Fallback transcription also failed")
                            continue

                        backend.cleanup()
                        self.status.emit("[INFO] ⚠️ 使用回退系统完成转录")

                    except Exception as fallback_e:
                        self.status.emit(f"[ERROR] Fallback error: {str(fallback_e)}")
                        continue

                # Generate base filename without extension for further processing
                base_filename = '.'.join(input_file.split('.')[:-1])
                srt_file = base_filename + '.srt'

                output_file_path = os.path.join('project/gt_input', os.path.basename(base_filename)+'.json')
                make_prompt(srt_file, output_file_path)

                # For 原文SRT, keep the SRT file generated by hybrid system
                # For other formats, clean up the temporary SRT file
                if output_format != '原文SRT':
                    if os.path.exists(srt_file):
                        os.remove(srt_file)
                else:
                    self.status.emit(f"[INFO] 原文SRT文件已保存: {srt_file}")
                self.status.emit("[INFO] 语音识别完成！")

            if translator == '不进行翻译':
                self.status.emit("[INFO] 翻译器未选择，跳过翻译步骤...")
                continue

            if language == 'zh':
                self.status.emit("[INFO] 听写语言为中文，跳过翻译步骤...")
                continue

            if 'sakura' in translator or 'llamacpp' in translator or 'galtransl' in translator:
                self.status.emit("[INFO] 正在启动Llamacpp翻译器...")
                if not sakura_file:
                    self.status.emit("[INFO] 未选择模型文件，跳过翻译步骤...")
                    continue
                
                print(param_llama)
                self.pid = subprocess.Popen([param.replace('$model_file',sakura_file).replace('$num_layers',str(sakura_mode)).replace('$port', '8989') for param in param_llama.split()], stdout=sys.stdout, stderr=sys.stdout, creationflags=0x08000000)
                
                self.status.emit("[INFO] 正在等待Sakura翻译器启动...")
                while True:
                    try:
                        response = requests.get("http://localhost:8989")
                        if response.status_code == 200:
                            break
                    except requests.exceptions.RequestException:
                        pass
                    sleep(1)

            if 'galtransl' in translator:
                worker_trans = 'sakura-010'
            elif 'sakura' not in translator:
                worker_trans = 'gpt35-1106'
            else:
                worker_trans = translator

            self.status.emit("[INFO] 正在进行翻译...")
            worker('project', 'config.yaml', worker_trans, show_banner=False)

            self.status.emit("[INFO] 正在生成字幕文件...")
            if output_format == '中文SRT':
                make_srt(output_file_path.replace('gt_input','gt_output'), input_file+'.zh.srt')

            if output_format == '中文LRC':
                make_lrc(output_file_path.replace('gt_input','gt_output'), input_file+'.lrc')

            self.status.emit("[INFO] 字幕文件生成完成！")

            if 'sakura' in translator or 'llamacpp' in translator or 'galtransl' in translator:
                self.status.emit("[INFO] 正在关闭Llamacpp翻译器...")
                self.pid.kill()
                self.pid.terminate()

        self.status.emit("[INFO] 所有文件处理完成！")
        self.finished.emit()

if __name__ == "__main__":
    app = QApplication(sys.argv)
    main_window = MainWindow()
    main_window.show()
    sys.exit(app.exec())
