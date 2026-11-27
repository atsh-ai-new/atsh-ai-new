FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core libraqm0 && rm -rf /var/lib/apt/lists/* && pip install --no-cache-dir Pillow==12.2.0
WORKDIR /app
COPY render.py worker.py ./
RUN useradd --system --uid 10001 --no-create-home renderer
USER renderer
ENV PYTHONUNBUFFERED=1
CMD ["python","worker.py"]
