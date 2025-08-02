#!/usr/bin/env python3
"""
Debug script to check what Qwen3 is actually generating
"""

import os
import json
from qwen3_alignment_backend import Qwen3AlignmentBackend

def debug_qwen3_alignment():
    """Debug Qwen3 alignment to see what it's actually generating"""
    
    # Load sample data
    rough_segments = [
        {"start": 0.0, "end": 6.0, "text": "こんばんは、マジョで辺体などうしようもない方にいっさ。"},
        {"start": 6.0, "end": 8.0, "text": "ふっふっふっふっふっ。"},
        {"start": 8.0, "end": 13.5, "text": "この音声を聞いているってことは、そういうことなんでしょ?"}
    ]
    
    accurate_text = "こんばんは、マゾで変態などうしようもないお兄さん？ふふっ、この音声を聞いているってことは、そういうことなんでしょう？"
    
    print("🔍 Debugging Qwen3 Alignment Output")
    print("=" * 60)
    
    try:
        # Initialize Qwen3 backend
        backend = Qwen3AlignmentBackend()
        if not backend.initialize():
            print("❌ Failed to initialize Qwen3 backend")
            return
        
        print("✅ Qwen3 backend initialized")
        
        # Create the prompt to see what we're sending
        prompt = backend._create_alignment_prompt(rough_segments, accurate_text)
        print("\n📝 Prompt being sent to Qwen3:")
        print("-" * 40)
        print(prompt[:500] + "..." if len(prompt) > 500 else prompt)
        print("-" * 40)
        
        # Prepare messages
        messages = [{"role": "user", "content": prompt}]
        
        # Apply chat template
        text = backend.tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
            enable_thinking=False
        )
        
        # Tokenize
        model_inputs = backend.tokenizer([text], return_tensors="pt").to(backend.model.device)
        
        print(f"\n🔤 Input tokens: {len(model_inputs.input_ids[0])}")
        
        # Generate response
        print("\n🤖 Generating Qwen3 response...")
        import torch
        with torch.no_grad():
            generated_ids = backend.model.generate(
                **model_inputs,
                max_new_tokens=2048,
                temperature=0.7,
                top_p=0.8,
                top_k=20,
                do_sample=True,
                pad_token_id=backend.tokenizer.eos_token_id
            )
        
        # Decode response
        output_ids = generated_ids[0][len(model_inputs.input_ids[0]):].tolist()
        response_text = backend.tokenizer.decode(output_ids, skip_special_tokens=True).strip()
        
        print("\n📤 Raw Qwen3 Response:")
        print("-" * 40)
        print(response_text)
        print("-" * 40)
        
        # Try to parse JSON
        print("\n🔍 JSON Parsing Analysis:")
        json_start = response_text.find('[')
        json_end = response_text.rfind(']') + 1
        
        print(f"JSON start position: {json_start}")
        print(f"JSON end position: {json_end}")
        
        if json_start != -1 and json_end > json_start:
            json_str = response_text[json_start:json_end]
            print(f"\nExtracted JSON string:")
            print(json_str)
            
            try:
                aligned_segments = json.loads(json_str)
                print(f"\n✅ JSON parsing successful!")
                print(f"Number of aligned segments: {len(aligned_segments)}")
                
                for i, segment in enumerate(aligned_segments, 1):
                    print(f"Segment {i}: {segment}")
                    
            except json.JSONDecodeError as e:
                print(f"\n❌ JSON parsing failed: {e}")
                print("This is why the system falls back to rough segments!")
                
        else:
            print("\n❌ No JSON array found in response")
            print("This is why the system falls back to rough segments!")
        
        backend.cleanup()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_qwen3_alignment()
