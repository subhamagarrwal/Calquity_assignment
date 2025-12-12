# Backend Dockerfile with uv
# Optimized for smaller image size by avoiding heavy dev dependencies

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN pip install uv

# Copy only dependency files first (for better caching)
COPY pyproject.toml ./
COPY backend/__init__.py ./backend/

# Create minimal pyproject for production (exclude dev deps)
RUN echo '[build-system]\n\
requires = ["setuptools>=68.0", "wheel"]\n\
build-backend = "setuptools.build_meta"\n\
\n\
[project]\n\
name = "calquity-assignment"\n\
version = "0.1.0"\n\
requires-python = ">=3.11"\n\
\n\
dependencies = [\n\
    "fastapi>=0.95.2",\n\
    "uvicorn[standard]>=0.22.0",\n\
    "python-multipart>=0.0.6",\n\
    "PyMuPDF>=1.22.5",\n\
    "pypdf>=3.11.2",\n\
    "chromadb>=0.4.15",\n\
    "sentence-transformers>=2.5.1",\n\
    "groq>=0.4.2",\n\
    "python-dotenv>=1.0.0",\n\
    "pydantic>=2.3.0",\n\
    "aiofiles>=23.2.1",\n\
]\n\
\n\
[tool.setuptools]\n\
packages = ["backend"]' > pyproject.toml

# Install dependencies with uv (production only, no dev)
# Use --no-cache to reduce image size
# Exclude unnecessary packages
RUN uv venv /app/.venv && \
    . /app/.venv/bin/activate && \
    uv pip install --no-cache -e . && \
    # Remove unnecessary files to reduce size
    find /app/.venv -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true && \
    find /app/.venv -type d -name "*.dist-info" -exec rm -rf {} + 2>/dev/null || true && \
    find /app/.venv -type d -name "tests" -exec rm -rf {} + 2>/dev/null || true

# Copy application code
COPY backend/ ./backend/
COPY .env* ./

# Set environment variables
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app"
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Run the application
CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000"]
