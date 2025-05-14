from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from PIL import Image
import io
import base64
from .model import ArtGenerator
from .config import AIConfig

app = FastAPI(title="Art.AI Engine API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize AI model
model = ArtGenerator()

class GenerationRequest(BaseModel):
    prompt: str
    style: Optional[str] = None
    character_id: Optional[str] = None
    size: Optional[tuple] = None
    num_images: Optional[int] = 1
    quality: Optional[str] = "standard"

class CharacterRequest(BaseModel):
    character_id: str
    reference_images: List[str]  # Base64 encoded images

class GenerationResponse(BaseModel):
    images: List[str]  # Base64 encoded images
    metadata: dict

@app.post("/generate", response_model=GenerationResponse)
async def generate_art(request: GenerationRequest, background_tasks: BackgroundTasks):
    try:
        # Validate request
        if request.num_images > AIConfig.MAX_BATCH_SIZE:
            raise HTTPException(status_code=400, message=f"Maximum batch size is {AIConfig.MAX_BATCH_SIZE}")
        
        # Set image size based on quality
        size = AIConfig.get_image_size(request.quality)
        
        # Generate images
        images = model.generate_image(
            prompt=request.prompt,
            style=request.style,
            character_id=request.character_id,
            size=size,
            num_images=request.num_images
        )
        
        # Convert images to base64
        encoded_images = []
        for img in images:
            buffered = io.BytesIO()
            img.save(buffered, format="PNG")
            encoded_images.append(base64.b64encode(buffered.getvalue()).decode())
        
        # Prepare metadata
        metadata = {
            "prompt": request.prompt,
            "style": request.style,
            "size": size,
            "quality": request.quality
        }
        
        return GenerationResponse(images=encoded_images, metadata=metadata)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/character/save")
async def save_character(request: CharacterRequest):
    try:
        # Convert base64 images to PIL Images
        reference_images = []
        for img_str in request.reference_images:
            img_data = base64.b64decode(img_str)
            img = Image.open(io.BytesIO(img_data))
            reference_images.append(img)
        
        # Save character embedding
        model.save_character_embedding(request.character_id, reference_images)
        
        return {"status": "success", "message": "Character embedding saved successfully"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/character/{character_id}")
async def delete_character(character_id: str):
    try:
        if character_id in model.character_embeddings:
            del model.character_embeddings[character_id]
            return {"status": "success", "message": "Character embedding deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Character not found")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/styles")
async def get_styles():
    return {"styles": list(AIConfig.STYLE_TEMPLATES.keys())}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model": AIConfig.MODEL_NAME}