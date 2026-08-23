import asyncio
import httpx
import json

async def main():
    query = (
        "Draft an official notesheet for the following request.\n\n"
        "**Category**: lab equipment purchase\n"
        "**Purpose**: purchase of oscilloscopes\n"
        "**Amount**: ₹250,000.00\n"
        "**Budget head**: Electronics Lab Fund\n"
        "**Justification**: Required for 3rd year students for signal processing experiments.\n\n"
        "Cite the relevant GFR rules and any similar precedent cases."
    )
    
    print("Sending query to AgenticRAG...")
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://fastapi-backend-production-4995.up.railway.app/api/v1/generate",
                json={"query": query}
            )
            response.raise_for_status()
            ai_result = response.json()
            
            print(json.dumps(ai_result, indent=2))
            
            print("\n\nProcessed Citations Shape:")
            citations = []
            for chunk in ai_result.get("chunks", []):
                source = chunk.get("source", "Unknown")
                c_type = "precedent" if "notesheet" in source.lower() or "case" in source.lower() else "rule"
                citations.append({
                    "type": c_type,
                    "id": source,
                    "excerpt": chunk.get("text", "")[:500],
                    "source": source,
                    "confidence": chunk.get("score") if chunk.get("score") is not None else 0.85
                })
                
            print(json.dumps(citations, indent=2))
            
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
