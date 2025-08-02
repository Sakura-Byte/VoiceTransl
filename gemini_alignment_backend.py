"""
Gemini Alignment Backend for VoiceTransl
Uses Google Generative AI library with all safety filters disabled
Specialized backend for text alignment between rough and accurate transcripts
"""

import json
import logging
import os
from typing import Optional, Dict, Any, List

try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

class GeminiAlignmentBackend:
    """
    Google Gemini API backend for aligning accurate text with rough timestamps
    Uses official google.generativeai library with all safety filters disabled for maximum performance
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.api_key = self.config.get("api_key", "")
        self.model_name = self.config.get("model_name", "gemini-2.0-flash-exp")
        self.timeout = self.config.get("timeout", 60)
        self.max_retries = self.config.get("max_retries", 3)
        self.is_initialized = False
        self.client = None

        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)

        # Enable debug logging if needed for troubleshooting
        if os.getenv("GEMINI_DEBUG"):
            self.logger.setLevel(logging.DEBUG)

    def _extract_response_text(self, response) -> Optional[str]:
        """Extract text from Gemini API response"""
        if not response:
            return None

        # Try direct text access first
        if hasattr(response, 'text') and response.text:
            return response.text

        # Try candidates structure
        if hasattr(response, 'candidates') and response.candidates:
            candidate = response.candidates[0]
            if hasattr(candidate, 'content') and candidate.content:
                if hasattr(candidate.content, 'parts') and candidate.content.parts:
                    part = candidate.content.parts[0]
                    if hasattr(part, 'text'):
                        return part.text

        return None
        
    def initialize(self) -> bool:
        """Initialize the Gemini API backend"""
        try:
            if not GENAI_AVAILABLE:
                self.logger.error("google-genai library not available. Install with: pip install google-genai")
                return False

            if not self.api_key:
                self.logger.error("Gemini API key is required but not provided")
                return False

            # Initialize the client
            self.client = genai.Client(api_key=self.api_key)

            # Test API connection
            self.logger.info("Testing connection to Gemini API")
            test_success = self._test_api_connection()

            if test_success:
                self.is_initialized = True
                self.logger.info("Gemini API backend initialized successfully")
                self.logger.info(f"Model: {self.model_name}")
                return True
            else:
                self.logger.error("Failed to connect to Gemini API")
                return False

        except Exception as e:
            self.logger.error(f"Failed to initialize Gemini backend: {e}")
            return False
    
    def _test_api_connection(self) -> bool:
        """Test API connection with a minimal request"""
        try:
            if not self.client:
                self.logger.error("Client not initialized")
                return False

            # Simple test with the client
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=["Hello"],
                config=types.GenerateContentConfig(
                    safety_settings=[
                        types.SafetySetting(
                            category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
                            threshold=types.HarmBlockThreshold.BLOCK_NONE,
                        ),
                        types.SafetySetting(
                            category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                            threshold=types.HarmBlockThreshold.BLOCK_NONE,
                        ),
                        types.SafetySetting(
                            category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                            threshold=types.HarmBlockThreshold.BLOCK_NONE,
                        ),
                        types.SafetySetting(
                            category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                            threshold=types.HarmBlockThreshold.BLOCK_NONE,
                        ),
                    ],
                    max_output_tokens=10,
                    temperature=0.1
                )
            )

            # Debug: Log the response structure
            self.logger.debug(f"Response type: {type(response)}")

            # Extract response text using helper function
            response_text = self._extract_response_text(response)

            if response_text:
                self.logger.info("Gemini API connection test successful")
                self.logger.debug(f"Response text: {response_text[:50]}...")
                return True
            else:
                self.logger.error("Gemini API connection test failed: No response text found")
                self.logger.debug(f"Full response: {response}")
                return False

        except Exception as e:
            self.logger.error(f"Gemini API connection test error: {e}")
            import traceback
            self.logger.debug(f"Traceback: {traceback.format_exc()}")
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
- All text from the accurate transcript is included

ROUGH SEGMENTS:
{rough_formatted}

ACCURATE TEXT:
{accurate_text}

Please return ONLY a JSON array with aligned segments. Each segment should have:
- "start": start time in seconds (number)
- "end": end time in seconds (number)
- "text": aligned accurate Japanese text (string)

Example format:
[
  {{"start": 0.0, "end": 6.0, "text": "こんばんは、マゾで変態などうしようもないお兄さん？"}},
  {{"start": 6.0, "end": 8.0, "text": "ふふっ、この音声を聞いているってことは..."}}
]

Return only the JSON array, no other text or explanation:"""
        
        return prompt
    
    def _make_gemini_request(self, prompt: str) -> Optional[str]:
        """
        Make Gemini API request with retry logic

        Args:
            prompt: The alignment prompt

        Returns:
            API response text or None if failed
        """
        if not self.client:
            self.logger.error("Client not initialized")
            return None

        for attempt in range(self.max_retries):
            try:
                self.logger.info(f"Making Gemini API request (attempt {attempt + 1}/{self.max_retries})")

                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=[prompt],
                    config=types.GenerateContentConfig(
                        safety_settings=[
                            types.SafetySetting(
                                category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
                                threshold=types.HarmBlockThreshold.BLOCK_NONE,
                            ),
                            types.SafetySetting(
                                category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                                threshold=types.HarmBlockThreshold.BLOCK_NONE,
                            ),
                            types.SafetySetting(
                                category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                                threshold=types.HarmBlockThreshold.BLOCK_NONE,
                            ),
                            types.SafetySetting(
                                category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                                threshold=types.HarmBlockThreshold.BLOCK_NONE,
                            ),
                        ],
                        max_output_tokens=8192,
                        temperature=0.7,
                        top_p=0.8,
                        top_k=40
                    )
                )

                # Extract response text using helper function
                response_text = self._extract_response_text(response)

                if response_text:
                    self.logger.info("Gemini API request successful")
                    return response_text.strip()
                else:
                    self.logger.error("No response text found in Gemini API response")
                    self.logger.debug(f"Response structure: {response}")

            except Exception as e:
                self.logger.error(f"Gemini API request error (attempt {attempt + 1}): {e}")
                if attempt == self.max_retries - 1:
                    import traceback
                    self.logger.error(f"Traceback: {traceback.format_exc()}")

        self.logger.error("All Gemini API request attempts failed")
        return None
    
    def align_text_with_timestamps(self, rough_segments: List[Dict], accurate_text: str) -> List[Dict]:
        """
        Align accurate text with rough timestamps using Gemini API
        
        Args:
            rough_segments: List of segments with timestamps and rough text
            accurate_text: Accurate transcription text without timestamps
            
        Returns:
            List of aligned segments with accurate text and timestamps
        """
        if not self.is_initialized:
            if not self.initialize():
                raise RuntimeError("Failed to initialize Gemini API backend")
        
        try:
            # Create alignment prompt
            prompt = self._create_alignment_prompt(rough_segments, accurate_text)
            
            # Make API request
            self.logger.info("Generating text alignment using Gemini API...")
            response_text = self._make_gemini_request(prompt)
            
            if not response_text:
                self.logger.error("Failed to get response from Gemini API")
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
            "name": "gemini-alignment",
            "model": self.model_name,
            "api_provider": "Google Generative AI",
            "initialized": self.is_initialized,
            "purpose": "Text alignment for hybrid transcription via Gemini API",
            "features": [
                "Official google-generativeai library",
                "All safety filters disabled",
                "High-performance text alignment",
                "Japanese language optimized",
                "Retry logic for reliability"
            ]
        }
    
    def cleanup(self):
        """Clean up resources (no local resources to clean for API backend)"""
        self.is_initialized = False
        self.logger.info("Gemini alignment backend cleaned up")
