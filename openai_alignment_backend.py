"""
OpenAI-Compatible Alignment Backend for VoiceTransl
Uses OpenAI-compatible API for intelligent text alignment between rough and accurate transcripts
Alternative to local Qwen3 backend
"""

import json
import logging
import requests
from typing import Optional, Dict, Any, List

class OpenAIAlignmentBackend:
    """
    OpenAI-compatible API backend for aligning accurate text with rough timestamps
    Used as alternative to local Qwen3 backend in hybrid transcription approach
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.api_endpoint = self.config.get("api_endpoint", "https://api.openai.com/v1")
        self.api_key = self.config.get("api_key", "")
        self.model_name = self.config.get("model_name", "gpt-4")
        self.timeout = self.config.get("timeout", 60)
        self.max_retries = self.config.get("max_retries", 3)
        self.is_initialized = False
        
        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
    def initialize(self) -> bool:
        """Initialize the OpenAI-compatible API backend"""
        try:
            if not self.api_key:
                self.logger.error("API key is required but not provided")
                return False
            
            if not self.api_endpoint:
                self.logger.error("API endpoint is required but not provided")
                return False
            
            # Test API connection with a simple request
            self.logger.info(f"Testing connection to {self.api_endpoint}")
            test_success = self._test_api_connection()
            
            if test_success:
                self.is_initialized = True
                self.logger.info(f"OpenAI-compatible API backend initialized successfully")
                self.logger.info(f"Endpoint: {self.api_endpoint}")
                self.logger.info(f"Model: {self.model_name}")
                return True
            else:
                self.logger.error("Failed to connect to API endpoint")
                return False
                
        except Exception as e:
            self.logger.error(f"Failed to initialize OpenAI-compatible backend: {e}")
            return False
    
    def _test_api_connection(self) -> bool:
        """Test API connection with a minimal request"""
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            # Simple test payload
            test_payload = {
                "model": self.model_name,
                "messages": [
                    {"role": "user", "content": "Hello"}
                ],
                "max_tokens": 5,
                "temperature": 0.1
            }
            
            response = requests.post(
                f"{self.api_endpoint}/chat/completions",
                headers=headers,
                json=test_payload,
                timeout=10
            )
            
            if response.status_code == 200:
                self.logger.info("API connection test successful")
                return True
            else:
                self.logger.error(f"API connection test failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.logger.error(f"API connection test error: {e}")
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
    
    def _make_api_request(self, prompt: str) -> Optional[str]:
        """
        Make API request with retry logic
        
        Args:
            prompt: The alignment prompt
            
        Returns:
            API response text or None if failed
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model_name,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 4096,
            "temperature": 0.7,
            "top_p": 0.9
        }
        
        for attempt in range(self.max_retries):
            try:
                self.logger.info(f"Making API request (attempt {attempt + 1}/{self.max_retries})")
                
                response = requests.post(
                    f"{self.api_endpoint}/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=self.timeout
                )
                
                if response.status_code == 200:
                    try:
                        response_data = response.json()
                        self.logger.debug(f"API response data: {response_data}")

                        if "choices" in response_data and len(response_data["choices"]) > 0:
                            choice = response_data["choices"][0]
                            if "message" in choice and "content" in choice["message"]:
                                content = choice["message"]["content"]
                                self.logger.info("API request successful")
                                return content.strip()
                            else:
                                self.logger.error(f"Invalid message structure in API response: {choice}")
                        else:
                            self.logger.error(f"No choices in API response: {response_data}")

                    except json.JSONDecodeError as e:
                        self.logger.error(f"Failed to parse JSON response: {e}")
                        self.logger.error(f"Raw response: {response.text}")

                else:
                    self.logger.error(f"API request failed: {response.status_code} - {response.text}")

            except requests.exceptions.Timeout:
                self.logger.warning(f"API request timeout (attempt {attempt + 1})")
            except requests.exceptions.RequestException as e:
                self.logger.error(f"API request error: {e}")
            except json.JSONDecodeError as e:
                self.logger.error(f"JSON decode error: {e}")
            except KeyError as e:
                self.logger.error(f"Missing key in API response: {e}")
            except Exception as e:
                self.logger.error(f"Unexpected error during API request: {e}")
                import traceback
                self.logger.error(f"Traceback: {traceback.format_exc()}")
        
        self.logger.error("All API request attempts failed")
        return None
    
    def align_text_with_timestamps(self, rough_segments: List[Dict], accurate_text: str) -> List[Dict]:
        """
        Align accurate text with rough timestamps using OpenAI-compatible API
        
        Args:
            rough_segments: List of segments with timestamps and rough text
            accurate_text: Accurate transcription text without timestamps
            
        Returns:
            List of aligned segments with accurate text and timestamps
        """
        if not self.is_initialized:
            if not self.initialize():
                raise RuntimeError("Failed to initialize OpenAI-compatible API backend")
        
        try:
            # Create alignment prompt
            prompt = self._create_alignment_prompt(rough_segments, accurate_text)
            
            # Make API request
            self.logger.info("Generating text alignment using API...")
            response_text = self._make_api_request(prompt)
            
            if not response_text:
                self.logger.error("Failed to get response from API")
                # Return rough segments as fallback
                return rough_segments
            
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
            "name": "openai-alignment",
            "api_endpoint": self.api_endpoint,
            "model": self.model_name,
            "initialized": self.is_initialized,
            "purpose": "Text alignment for hybrid transcription via API",
            "features": [
                "Remote API inference",
                "OpenAI-compatible endpoints",
                "Intelligent text alignment",
                "Configurable model selection",
                "Retry logic for reliability"
            ]
        }
    
    def cleanup(self):
        """Clean up resources (no local resources to clean for API backend)"""
        self.is_initialized = False
        self.logger.info("OpenAI-compatible alignment backend cleaned up")
