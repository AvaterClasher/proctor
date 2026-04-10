# Proctor Agent -- Cuemath AI Tutor Screener

A Python LiveKit voice agent that conducts AI-powered screening interviews
with tutor candidates and generates structured assessments.

## Prerequisites

- Python 3.10+
- A LiveKit Cloud project (or self-hosted LiveKit server)
- An OpenAI API key

## Setup

```bash
cp .env.example .env
# Fill in your keys in .env

pip install -r requirements.txt
```

## Development

```bash
python agent.py dev
```

The agent will connect to your LiveKit project and automatically join rooms
whose names start with `interview-`.

## Production

### Run directly

```bash
python agent.py start
```

### Docker

```bash
docker build -t proctor-agent .
docker run --env-file .env proctor-agent
```

## Architecture

| File               | Purpose                                        |
| ------------------ | ---------------------------------------------- |
| `agent.py`         | Main entry point and LiveKit session setup      |
| `interview_flow.py`| Interview phase management and question logic   |
| `assessment.py`    | Post-interview rubric evaluation via OpenAI     |
| `prompts.py`       | System prompts, question bank, rubric           |
| `api_client.py`    | HTTP client for the Proctor backend API         |
