import torch
import torch.nn as nn
from diffusers import StableDiffusionPipeline, DPMSolverMultistepScheduler
from transformers import CLIPTextModel, CLIPTokenizer
from PIL import Image
from typing import List, Optional, Tuple, Dict
from .config import AIConfig

class ArtGenerator:
    def __init__(self):
        self.config = AIConfig
        self.device = torch.device(self.config.DEVICE)
        self.pipeline = self._setup_pipeline()
        self.character_embeddings = {}
    
    def _setup_pipeline(self) -> StableDiffusionPipeline:
        """Initialize and configure the Stable Diffusion pipeline"""
        pipeline = StableDiffusionPipeline.from_pretrained(
            self.config.MODEL_NAME,
            revision=self.config.MODEL_REVISION,
            torch_dtype=torch.float16 if self.config.MIXED_PRECISION else torch.float32
        )
        
        # Optimize for faster inference
        pipeline.scheduler = DPMSolverMultistepScheduler.from_config(pipeline.scheduler.config)
        pipeline.enable_attention_slicing()
        if self.config.DEVICE == "cuda":
            pipeline.enable_xformers_memory_efficient_attention()
        
        pipeline.to(self.device)
        return pipeline
    
    def generate_image(
        self,
        prompt: str,
        style: str = None,
        character_id: str = None,
        size: Tuple[int, int] = None,
        num_images: int = 1,
        guidance_scale: float = 7.5,
    ) -> List[Image.Image]:
        """Generate images based on prompt and parameters"""
        # Apply style template if specified
        if style and style in self.config.STYLE_TEMPLATES:
            prompt = f"{prompt}, {self.config.get_style_prompt(style)}"
        
        # Set image size
        size = size or self.config.DEFAULT_IMAGE_SIZE
        
        # Apply character consistency if specified
        if character_id and character_id in self.character_embeddings:
            prompt_embeds = self._apply_character_embedding(prompt, character_id)
        else:
            prompt_embeds = None
        
        # Generate images
        images = self.pipeline(
            prompt=prompt,
            prompt_embeds=prompt_embeds,
            height=size[1],
            width=size[0],
            num_images_per_prompt=num_images,
            num_inference_steps=self.config.GENERATION_STEPS,
            guidance_scale=guidance_scale
        ).images
        
        return images
    
    def _apply_character_embedding(
        self,
        prompt: str,
        character_id: str
    ) -> torch.Tensor:
        """Apply character embedding for consistency"""
        tokenizer = self.pipeline.tokenizer
        text_encoder = self.pipeline.text_encoder
        
        # Get character embedding
        char_embedding = self.character_embeddings[character_id]
        
        # Tokenize and encode prompt
        tokens = tokenizer(
            prompt,
            padding="max_length",
            max_length=tokenizer.model_max_length,
            truncation=True,
            return_tensors="pt"
        )
        
        # Combine prompt embedding with character embedding
        with torch.no_grad():
            prompt_embeds = text_encoder(tokens.input_ids.to(self.device))[0]
            prompt_embeds = torch.lerp(
                prompt_embeds,
                char_embedding.expand_as(prompt_embeds),
                0.3  # Adjustable weight for character consistency
            )
        
        return prompt_embeds
    
    def save_character_embedding(
        self,
        character_id: str,
        reference_images: List[Image.Image]
    ) -> None:
        """Extract and save character embedding from reference images"""
        if len(self.character_embeddings) >= self.config.CHARACTER_CACHE_SIZE:
            # Remove oldest embedding if cache is full
            oldest_id = next(iter(self.character_embeddings))
            del self.character_embeddings[oldest_id]
        
        # Process reference images and extract embedding
        embeddings = []
        for image in reference_images:
            # Extract features using CLIP vision model
            image_features = self.pipeline.image_processor(image)
            with torch.no_grad():
                embedding = self.pipeline.vision_model(image_features)[0]
                embeddings.append(embedding)
        
        # Average embeddings for consistency
        character_embedding = torch.stack(embeddings).mean(dim=0)
        self.character_embeddings[character_id] = character_embedding
    
    def clear_character_cache(self) -> None:
        """Clear character embeddings cache"""
        self.character_embeddings.clear()