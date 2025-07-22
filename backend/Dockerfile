FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .

# Create non-root user for security
RUN addgroup --gid 1001 --system python && \
    adduser --no-create-home --shell /bin/false --disabled-password --uid 1001 --system --group python

USER python

# Expose port
EXPOSE 4536

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:4536/health || exit 1

# Start the application
CMD ["python", "app.py"]