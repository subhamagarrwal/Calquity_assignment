Calquity Assignment

Models Used(through Groq API):
Text LLM Used: llama-3.3-70b-versatile
generating vizualizations: llama-4-scout
## Getting Started

First, run the development server:

### 1.Frontend
```bash
cd frontend
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

### 2. Backend

```bash
# From the project root
uv venv
.venv\Scripts\activate  # Windows
# or
source .venv/bin/activate  # macOS/Linux

uv pip install -e .        # Install dependencies
uv run uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
```

- Make sure you have a `.env` file in the project root with your GROQ_API_KEY and GROQ_MODEL.
- The backend will be available at [http://localhost:8000](http://localhost:8000).

---

Open [http://localhost:3000](http://localhost:3000) with your browser to see the frontend.

You can start editing the frontend by modifying `app/page.tsx`. The page auto-updates as you edit the file.