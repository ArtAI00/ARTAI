import os
import torch
from pathlib import Path

class AIConfig:
    # Model Configuration
    MODEL_NAME = "stable-diffusion-v2-1"
    MODEL_REVISION = "fp16"
    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
    
    # Generation Parameters
    MAX_BATCH_SIZE = 4
    DEFAULT_IMAGE_SIZE = (1024, 1024)
    HIGH_RES_IMAGE_SIZE = (3840, 2160)  # 4K Resolution
    GENERATION_STEPS = 50
    
    # Style Templates
    STYLE_TEMPLATES = {
        "cyberpunk": "cyberpunk style, neon lights, futuristic city, high tech, low life",
        "surreal": "surrealist art style, dreamlike, abstract, symbolic elements",
        "3d_render": "3D rendered, octane render, high detail, realistic lighting",
        "pixel_art": "pixel art style, 16-bit, retro gaming aesthetic"
    }
    
    # Character Consistency
    CHARACTER_EMBEDDING_SIZE = 768
    CHARACTER_CACHE_SIZE = 1000
    
    # Performance Optimization
    CUDA_MEMORY_FRACTION = 0.9
    MIXED_PRECISION = True
    
    # Storage Configuration
    MODEL_CACHE_DIR = Path(os.getenv("MODEL_CACHE_DIR", "./models"))
    OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "./outputs"))
    
    # API Configuration
    MAX_CONCURRENT_REQUESTS = 100
    REQUEST_TIMEOUT = 60  # seconds
    
    @classmethod
    def get_style_prompt(cls, style_name: str) -> str:
        """Get the base prompt for a specific art style"""
        return cls.STYLE_TEMPLATES.get(style_name, "")
    
    @classmethod
    def get_image_size(cls, quality: str = "standard") -> tuple:
        """Get image dimensions based on quality setting"""
        return cls.HIGH_RES_IMAGE_SIZE if quality == "high" else cls.DEFAULT_IMAGE_SIZE
    
    @classmethod
    def setup_device(cls):
        """Configure device and memory settings"""
        if cls.DEVICE == "cuda":
            torch.cuda.set_per_process_memory_fraction(cls.CUDA_MEMORY_FRACTION)
            if cls.MIXED_PRECISION:
                torch.backends.cuda.matmul.allow_tf32 = True