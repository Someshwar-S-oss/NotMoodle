import os
from google import genai

def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: Please set the GEMINI_API_KEY environment variable.")
        print("Run: set GEMINI_API_KEY=your_key_here")
        return

    print("Initializing Gemini Client...")
    client = genai.Client(api_key=api_key)

    print("\nFetching available models...")
    try:
        models = client.models.list()
        
        print("\n--- Available Chat Models ---")
        for m in models:
            name = getattr(m, 'name', '')
            # Filter out embedding models to just see chat models
            if "embed" not in name.lower() and "gemini" in name.lower():
                print(f"✅ {name}")
                
    except Exception as e:
        print(f"\n❌ Error fetching models: {e}")

if __name__ == "__main__":
    main()
