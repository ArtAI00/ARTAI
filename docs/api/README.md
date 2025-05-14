# Art.AI API Documentation

## Overview
This documentation provides detailed information about the Art.AI API endpoints, request/response formats, and integration guidelines.

## Base URL
```
https://api.artai.com/v1
```

## Authentication
All API requests require authentication using a bearer token:
```http
Authorization: Bearer <your_api_key>
```

## AI Generation API

### Generate Art
```http
POST /generate
```

#### Request Body
```json
{
  "prompt": "string",
  "style": "string",
  "character_id": "string",
  "size": [width, height],
  "num_images": 1,
  "quality": "standard"
}
```

#### Response
```json
{
  "images": ["base64_string"],
  "metadata": {
    "prompt": "string",
    "style": "string",
    "size": [width, height],
    "quality": "string"
  }
}
```

### Save Character
```http
POST /character/save
```

#### Request Body
```json
{
  "character_id": "string",
  "reference_images": ["base64_string"]
}
```

#### Response
```json
{
  "status": "success",
  "message": "Character embedding saved successfully"
}
```

## NFT API

### Mint NFT
```http
POST /nft/mint
```

#### Request Body
```json
{
  "name": "string",
  "description": "string",
  "image": "string",
  "attributes": [
    {
      "trait_type": "string",
      "value": "string"
    }
  ]
}
```

#### Response
```json
{
  "mint_address": "string",
  "transaction_signature": "string"
}
```

### Get NFT Metadata
```http
GET /nft/{mint_address}
```

#### Response
```json
{
  "name": "string",
  "description": "string",
  "image": "string",
  "attributes": [
    {
      "trait_type": "string",
      "value": "string"
    }
  ]
}
```

## Marketplace API

### Create Listing
```http
POST /marketplace/listing
```

#### Request Body
```json
{
  "nft_mint": "string",
  "price": "number",
  "duration": "number"
}
```

#### Response
```json
{
  "listing_id": "string",
  "transaction_signature": "string"
}
```

### Get Listings
```http
GET /marketplace/listings
```

#### Query Parameters
- `limit`: number (default: 20)
- `offset`: number (default: 0)
- `sort`: string (price_asc, price_desc, created_at)

#### Response
```json
{
  "listings": [
    {
      "id": "string",
      "nft_mint": "string",
      "price": "number",
      "seller": "string",
      "created_at": "string",
      "expires_at": "string"
    }
  ],
  "total": "number"
}
```

## Error Handling
All API endpoints return standard HTTP status codes:

- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

Error responses follow this format:
```json
{
  "error": {
    "code": "string",
    "message": "string"
  }
}
```

## Rate Limits
- Free tier: 100 requests/hour
- Pro tier: 1000 requests/hour
- Enterprise tier: Custom limits

## SDKs and Libraries
- [JavaScript SDK](https://github.com/artai/js-sdk)
- [Python SDK](https://github.com/artai/python-sdk)
- [Rust SDK](https://github.com/artai/rust-sdk)

## Support
For technical support or questions, please contact:
- Email: support@artai.com
- Discord: https://discord.gg/artai