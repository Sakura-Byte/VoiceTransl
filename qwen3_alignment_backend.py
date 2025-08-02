"""
Qwen3 Alignment Backend for VoiceTransl
Uses Qwen3-8B 4-bit quantized model for intelligent text alignment between rough and accurate transcripts
"""

import torch
import logging
import json
from typing import Optional, Dict, Any, List
from transformers import AutoModelForCausalLM, AutoTokenizer

try:
    import bitsandbytes as bnb
    from transformers.utils.quantization_config import BitsAndBytesConfig
    BITSANDBYTES_AVAILABLE = True
except ImportError:
    BITSANDBYTES_AVAILABLE = False
    print("Warning: bitsandbytes not available. Install with: pip install bitsandbytes")

class Qwen3AlignmentBackend:
    """
    Qwen3-8B 4-bit quantized backend for aligning accurate text with rough timestamps
    Used in hybrid transcription approach with transformers + bitsandbytes
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.device = None
        self.torch_dtype = None
        self.model = None
        self.tokenizer = None
        # Use smaller quantized model for testing (fallback to larger if needed)
        self.model_name = self.config.get("model_name", "unsloth/Qwen3-4B-unsloth-bnb-4bit")
        self.is_initialized = False

        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)

        if not BITSANDBYTES_AVAILABLE:
            self.logger.warning("bitsandbytes not available, will use regular precision")
            self.logger.warning("For better memory efficiency, install with: pip install bitsandbytes")

    def _get_optimal_device(self) -> str:
        """Determine best available device with fallback chain"""
        if torch.cuda.is_available():
            device_count = torch.cuda.device_count()
            self.logger.info(f"CUDA available with {device_count} device(s)")
            return "cuda"
        elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            self.logger.info("MPS (Apple Silicon) available")
            return "mps"
        else:
            self.logger.info("Using CPU device")
            return "cpu"

    def _get_optimal_dtype(self) -> torch.dtype:
        """Select appropriate dtype based on device"""
        if self.device == "cuda":
            return torch.float16  # GPU optimization
        else:
            return torch.float32  # CPU compatibility
    
    def initialize(self) -> bool:
        """Initialize the Qwen3-8B model with progressive fallback strategies"""
        # Load tokenizer first
        if not self._load_tokenizer():
            return False

        # Try different initialization strategies in order of preference
        strategies = [
            ("4-bit quantized GPU", self._try_4bit_gpu),
            ("8-bit quantized GPU", self._try_8bit_gpu),
            ("Full precision GPU", self._try_full_gpu),
            ("CPU fallback", self._try_cpu_fallback)
        ]

        for strategy_name, strategy_func in strategies:
            self.logger.info(f"Attempting {strategy_name} initialization...")
            try:
                if strategy_func():
                    self.is_initialized = True
                    self.logger.info(f"✅ {strategy_name} initialization successful")
                    return True
            except Exception as e:
                self.logger.warning(f"❌ {strategy_name} failed: {e}")
                continue

        self.logger.error("All initialization strategies failed")
        return False

    def _load_tokenizer(self) -> bool:
        """Load tokenizer with online/offline fallback"""
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_name,
                local_files_only=False
            )
            return True
        except Exception as e:
            self.logger.warning(f"Failed to load tokenizer online: {e}")
            try:
                self.logger.info("Trying offline mode...")
                self.tokenizer = AutoTokenizer.from_pretrained(
                    self.model_name,
                    local_files_only=True
                )
                return True
            except Exception as e2:
                self.logger.error(f"Failed to load tokenizer offline: {e2}")
                return False

    def _try_4bit_gpu(self) -> bool:
        """Try 4-bit quantized GPU initialization"""
        if not BITSANDBYTES_AVAILABLE:
            raise RuntimeError("bitsandbytes not available")

        self.device = "cuda"
        self.torch_dtype = torch.float16

        model_kwargs = {
            "device_map": "auto",
            "torch_dtype": self.torch_dtype,
            "trust_remote_code": True,
            "local_files_only": False
        }

        return self._load_model_with_kwargs(model_kwargs)

    def _try_8bit_gpu(self) -> bool:
        """Try 8-bit quantized GPU initialization"""
        if not BITSANDBYTES_AVAILABLE:
            raise RuntimeError("bitsandbytes not available")

        self.device = "cuda"
        self.torch_dtype = torch.float16

        model_kwargs = {
            "device_map": "auto",
            "torch_dtype": self.torch_dtype,
            "trust_remote_code": True,
            "local_files_only": False
        }

        return self._load_model_with_kwargs(model_kwargs)

    def _try_full_gpu(self) -> bool:
        """Try full precision GPU initialization"""
        self.device = "cuda"
        self.torch_dtype = torch.float16

        model_kwargs = {
            "device_map": "auto",
            "torch_dtype": self.torch_dtype,
            "trust_remote_code": True,
            "local_files_only": False
        }

        return self._load_model_with_kwargs(model_kwargs)

    def _try_cpu_fallback(self) -> bool:
        """Try CPU initialization"""
        self.device = "cpu"
        self.torch_dtype = torch.float32

        model_kwargs = {
            "device_map": None,
            "torch_dtype": self.torch_dtype,
            "trust_remote_code": True,
            "local_files_only": False
        }

        success = self._load_model_with_kwargs(model_kwargs)
        if success:
            # Move to CPU explicitly
            self.model = self.model.to(self.device)
        return success

    def _load_model_with_kwargs(self, model_kwargs: dict) -> bool:
        """Load model with given kwargs, with online/offline fallback"""
        try:
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_name,
                **model_kwargs
            )
            return True
        except Exception as e:
            self.logger.warning(f"Online loading failed: {e}")
            try:
                self.logger.info("Trying offline mode...")
                model_kwargs["local_files_only"] = True
                self.model = AutoModelForCausalLM.from_pretrained(
                    self.model_name,
                    **model_kwargs
                )
                return True
            except Exception as e2:
                self.logger.error(f"Offline loading also failed: {e2}")
                return False



    def _create_alignment_prompt(self, rough_segments: List[Dict], accurate_text: str) -> str:
        """
        Create prompt for text alignment task
        
        Args:
            rough_segments: List of segments with timestamps and rough text
            accurate_text: Accurate transcription text without timestamps
            
        Returns:
            Formatted prompt for alignment
        """
        # Format rough segments for prompt
        rough_formatted = ""
        for i, segment in enumerate(rough_segments, 1):
            start = segment.get("start", 0)
            end = segment.get("end", 0)
            text = segment.get("text", "")
            rough_formatted += f"  Segment {i}: {start:.2f}s-{end:.2f}s - \"{text}\"\n"
        
        prompt = f"""You are a professional subtitle alignment expert. Your task is to align accurate Japanese text with rough timestamp segments.

You have two inputs:
1. ROUGH SEGMENTS: These have accurate timestamps but may have incorrect text
2. ACCURATE TEXT: This has correct text but no timestamps

Your job is to intelligently match the accurate text to the timestamp segments, ensuring:
- The text flows logically and matches the timing
- Segment boundaries make sense for natural speech
- The total content is preserved

ROUGH SEGMENTS:
{rough_formatted}

ACCURATE TEXT:
{accurate_text}

Please return ONLY a JSON array with aligned segments. Each segment should have:
- "start": start time in seconds
- "end": end time in seconds  
- "text": aligned accurate Japanese text

Example format:
[
  {{"start": 0.0, "end": 6.0, "text": "こんばんは、マゾで変態などうしようもないお兄さん？"}},
  {{"start": 6.0, "end": 8.0, "text": "ふふっ、この音声を聞いているってことは..."}}
]

Return only the JSON array, no other text:"""
        
        return prompt
    
    def align_text_with_timestamps(self, rough_segments: List[Dict], accurate_text: str) -> List[Dict]:
        """
        Align accurate text with rough timestamps using Qwen3-8B
        
        Args:
            rough_segments: List of segments with timestamps and rough text
            accurate_text: Accurate transcription text without timestamps
            
        Returns:
            List of aligned segments with accurate text and timestamps
        """
        if not self.is_initialized:
            if not self.initialize():
                raise RuntimeError("Failed to initialize Qwen3-8B model")
        
        try:
            # Create alignment prompt
            prompt = self._create_alignment_prompt(rough_segments, accurate_text)

            # Prepare messages for chat template
            messages = [{"role": "user", "content": prompt}]

            # Apply chat template (disable thinking mode for efficiency)
            text = self.tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True,
                enable_thinking=False  # Use non-thinking mode for efficiency
            )

            # Tokenize input
            model_inputs = self.tokenizer([text], return_tensors="pt").to(self.model.device)

            self.logger.info("Generating text alignment...")

            # Generate response
            with torch.no_grad():
                generated_ids = self.model.generate(
                    **model_inputs,
                    max_new_tokens=4096,  # Should be enough for alignment task
                    temperature=0.7,      # Recommended for non-thinking mode
                    top_p=0.8,
                    top_k=20,
                    do_sample=True,
                    pad_token_id=self.tokenizer.eos_token_id
                )

            # Decode response
            output_ids = generated_ids[0][len(model_inputs.input_ids[0]):].tolist()
            response_text = self.tokenizer.decode(output_ids, skip_special_tokens=True).strip()

            self.logger.info("Alignment generation completed")

            # Parse JSON response
            try:
                # Try to extract JSON from response
                json_start = response_text.find('[')
                json_end = response_text.rfind(']') + 1

                if json_start != -1 and json_end > json_start:
                    json_str = response_text[json_start:json_end]
                    aligned_segments = json.loads(json_str)

                    self.logger.info(f"Successfully aligned {len(aligned_segments)} segments")
                    return aligned_segments
                else:
                    raise ValueError("No JSON array found in response")
                    
            except (json.JSONDecodeError, ValueError) as e:
                self.logger.error(f"Failed to parse alignment response: {e}")
                self.logger.error(f"Raw response: {response_text}")

                # Fallback: return rough segments with warning
                self.logger.warning("Using rough segments as fallback")
                return rough_segments
                
        except Exception as e:
            self.logger.error(f"Text alignment failed: {e}")
            # Return rough segments as fallback
            return rough_segments
    
    def get_backend_info(self) -> Dict[str, Any]:
        """Get information about the backend"""
        return {
            "name": "qwen3-alignment",
            "model": self.model_name,
            "device": self.device,
            "initialized": self.is_initialized,
            "purpose": "Text alignment for hybrid transcription",
            "features": [
                "Local inference (no internet required)",
                "Intelligent text alignment",
                "Japanese language optimized",
                "Efficient non-thinking mode"
            ]
        }
    
    def cleanup(self):
        """Clean up resources"""
        if self.model:
            del self.model
            self.model = None

        # Clear GPU memory if available
        try:
            import torch
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        except ImportError:
            pass  # PyTorch not available

        self.is_initialized = False
        self.logger.info("Qwen3 alignment backend cleaned up")
