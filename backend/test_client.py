import os
from dotenv import load_dotenv
from groq import Groq

# Load environment variables
load_dotenv()

def test_groq():
    
    # Check API key
    api_key = os.getenv("GROQ_API_KEY")
    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    if not api_key:
        print("groq key not found")
        return
    
    print(f"API Key loaded: {api_key[:10]}...{api_key[-4:]}")
    
    try:
        # Initialize Groq client
        client = Groq(api_key=api_key)
        print("Groq client initialized")
        
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "user", "content": "Say 'Groq is working!' in exactly 3 words."}
            ],
            temperature=0.5,
            max_tokens=50
        )
        
        print(f"Response: {response.choices[0].message.content}")
        
        # Test streaming

        stream = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "user", "content": "Count from 1 to 5, one number per line."}
            ],
            stream=True,
            temperature=0.5,
            max_tokens=100
        )
        
        print("Streamed output: ", end="", flush=True)
        for chunk in stream:
            if chunk.choices[0].delta.content:
                print(chunk.choices[0].delta.content, end="", flush=True)
        print("\n")
        
        
    except Exception as e:
        print(f" Error: {e}")
        print(f"Error type: {type(e).__name__}")

if __name__ == "__main__"):
    test_groq()