# AI Cost Estimator

A full-stack web application that shows how prompts convert to tokens and what they cost, across both embedding and generation models — and quantifies what each optimisation would save.

## Features

- 📝 Real-time prompt input and analysis
- 🔢 Exact token counting for OpenAI models, approximated for other providers
- 💰 Cost calculation for embedding (input only) and generation (input + output) models
- 📊 Support for OpenAI, Azure OpenAI, Anthropic, Google, Cohere and Voyage AI
- 🎯 Interactive UI with instant feedback

## Tech Stack

**Frontend:**
- React 18+
- Tailwind CSS
- Axios for API calls

**Backend:**
- Node.js
- Express.js
- js-tiktoken for token counting
- CORS support

## Project Structure

```
Estimator/
├── backend/
│   ├── server.js
│   ├── config/
│   │   └── models.js
│   ├── routes/
│   │   └── embeddings.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── App.jsx
│   │   └── index.jsx
│   └── package.json
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

1. **Backend Setup**
```bash
cd backend
npm install
npm run dev
```

2. **Frontend Setup** (in another terminal)
```bash
cd frontend
npm install
npm start
```

The application will be available at `http://localhost:3000`

## API Endpoints

- `POST /api/analyze` - Analyze prompt and calculate tokens/cost
- `GET /api/models` - Get list of available embedding models
- `GET /api/pricing` - Get current pricing information

## Usage

1. Enter your prompt/text in the input field
2. Select an embedding model from the dropdown
3. View real-time token count and cost estimation
4. Compare costs across different providers

## Configuration

Edit `backend/config/models.js` to customize:
- Supported embedding models
- Token pricing per 1K tokens
- Model specifications
