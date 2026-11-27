FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg libgomp1 && rm -rf /var/lib/apt/lists/* && pip install --no-cache-dir piper-tts==1.3.0
WORKDIR /app
COPY service.py .
USER 10001:10001
ENV OMP_NUM_THREADS=2
CMD ["python","-u","service.py"]
