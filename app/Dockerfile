FROM python:3.11-slim

WORKDIR /app

ENV LANGSMITH_TRACING=true 

ENV LANGSMITH_API_KEY="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" 

ENV LANGSMITH_ENDPOINT="https://api.smith.langchain.com"

ENV LANGSMITH_PROJECT="vac_proj"

ENV OPENAI_API_KEY="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" 

ENV PINECONE_API_KEY="pcsk_5y6fWV_4gHE25wiCo4bjAkDLCiouWf9DSRNoPzfcAqqMj4qapWwuPddaNhx4zUAxF4n7aT"

COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
