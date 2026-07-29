import os
from google import genai

def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: Please set the GEMINI_API_KEY environment variable.")
        return

    print("Initializing Gemini Client...")
    client = genai.Client(api_key=api_key)

    print("\nFetching available models...")
    try:
        models = client.models.list()
        
        print("\n--- Available Embedding Models ---")
        found = False
        for m in models:
            if "embed" in m.name.lower():
                print(f"✅ Found: {m.name}")
                found = True
        
        if not found:
            print("❌ No embedding models found for this API key!")
            print("\nHere are all the models your API key has access to:")
            for m in models:
                print(f"- {m.name}")
                
    except Exception as e:
        print(f"\n❌ Error fetching models: {e}")
        print("Please verify that your GEMINI_API_KEY is correct and active.")

if __name__ == "__main__":
    main()
