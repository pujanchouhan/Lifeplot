from flask import Flask, request, jsonify, render_template
import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Load API key from environment
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("Warning: GROQ_API_KEY is not set in the environment.")
client = Groq(api_key=GROQ_API_KEY)

# Store conversation history in memory for simplicity
sessions = {}

SYSTEM_PROMPT = """You are LifePlot, an AI dietary and health assistant.
You help users create diet plans based on their height, weight, and dietary preferences (veg/non-veg).
When providing a diet plan or suggesting food, you MUST include the calories and macronutrients (protein, carbs, fat) for every suggested food item.
Structure your diet plan clearly, using markdown tables or lists for easy readability.
For EVERY specific food item or meal you suggest, you MUST include a picture of it. You can do this by using standard markdown image syntax with this URL format: ![Food Name](https://image.pollinations.ai/prompt/{url_encoded_food_name}?width=400&height=300&nologo=true). For example, if you suggest "Grilled Chicken Salad", you MUST output: ![Grilled Chicken Salad](https://image.pollinations.ai/prompt/Grilled%20Chicken%20Salad?width=400&height=300&nologo=true)
You should also answer any follow-up questions the user has about their health, diet, or macros.
Keep your tone encouraging, premium, and professional.

CRITICAL RULE: You are STRICTLY RESTRICTED to discussing topics related to diet, nutrition, fitness, and health. If the user asks about ANY other topic (e.g., programming, history, politics, general knowledge, etc.), you MUST politely refuse to answer and remind them that you are a dietary assistant.
"""

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.json
    session_id = data.get("session_id", "default")
    user_message = data.get("message", "")

    if not user_message:
        return jsonify({"error": "Message is required"}), 400

    if session_id not in sessions:
        sessions[session_id] = [
            {"role": "system", "content": SYSTEM_PROMPT}
        ]

    sessions[session_id].append({"role": "user", "content": user_message})

    try:
        chat_completion = client.chat.completions.create(
            messages=sessions[session_id],
            model="llama-3.1-8b-instant",
            temperature=0.7,
            max_tokens=2048,
        )
        
        bot_response = chat_completion.choices[0].message.content
        sessions[session_id].append({"role": "assistant", "content": bot_response})
        
        return jsonify({"response": bot_response})

    except Exception as e:
        print(f"Error calling Groq API: {e}", flush=True)
        # Revert user message on failure to allow retry
        sessions[session_id].pop()
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)
