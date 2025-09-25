# NeMo Agent Toolkit - UI

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![NeMo Agent Toolkit](https://img.shields.io/badge/NeMo%20Agent%20Toolkit-Frontend-green)](https://github.com/NVIDIA/NeMo-Agent-Toolkit)

This is the official frontend user interface component for [NeMo Agent Toolkit](https://github.com/NVIDIA/NeMo-Agent-Toolkit), an open-source library for building AI agents and workflows.

This project builds upon the work of:

- [chatbot-ui](https://github.com/mckaywrigley/chatbot-ui) by Mckay Wrigley
- [chatbot-ollama](https://github.com/ivanfioravanti/chatbot-ollama) by Ivan Fioravanti

## Features

- 🎨 Modern and responsive user interface
- 🔄 Real-time streaming responses
- 🤝 Human-in-the-loop workflow support
- 🌙 Light/Dark theme
- 🔌 WebSocket and HTTP API integration
- 🐳 Docker support

## Getting Started

### Prerequisites

- [NeMo Agent Toolkit](https://github.com/NVIDIA/NeMo-Agent-Toolkit) installed and configured
- Git
- Node.js (v18 or higher)
- npm or Docker

### Installation

Clone the repository:

```bash
git clone git@github.com:NVIDIA/NeMo-Agent-Toolkit-UI.git
cd NeMo-Agent-Toolkit-UI
```

Install dependencies:

```bash
npm ci
```

### Running the Application

#### Local Development

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

#### Docker Deployment

```bash
# Build the Docker image
docker build -t nemo-agent-toolkit-ui .

# Run the container with environment variables from .env
# Ensure the .env file is present before running this command.
# Skip --env-file .env if no overrides are needed.
docker run --env-file .env -p 3000:3000 nemo-agent-toolkit-ui
```

![NeMo Agent Toolkit Web User Interface](public/screenshots/ui_home_page.png)

## Configuration

### HTTP API Connection

Settings can be configured by selecting the `Settings` icon located on the bottom left corner of the home page.

![NeMo Agent Toolkit Web UI Settings](public/screenshots/ui_generate_example_settings.png)

### Settings Options

NOTE: Most of the time, you will want to select /chat/stream for intermediate results streaming.

- `Theme`: Light or Dark Theme
- `HTTP URL for Chat Completion`: REST API endpoint
  - /generate - Single response generation
  - /generate/stream - Streaming response generation
  - /chat - Single response chat completion
  - /chat/stream - Streaming chat completion
  - /chat/ca-rag - Single response chat completion with [Context-Aware RAG](https://github.com/NVIDIA/context-aware-rag) backend
- `WebSocket URL for Completion`: WebSocket URL to connect to running NeMo Agent Toolkit server
- `WebSocket Schema`: Workflow schema type over WebSocket connection

## Usage Examples

### Getting Started Example

#### Setup and Configuration

1. Set up [NeMo Agent Toolkit](https://docs.nvidia.com/nemo/agent-toolkit/latest/quick-start/installing.html) following the getting started guide
2. Start workflow by following the [Getting Started Examples](https://github.com/NVIDIA/NeMo-Agent-Toolkit/blob/develop/examples/getting_started/simple_calculator/README.md)

```bash
nat serve --config_file=examples/getting_started/simple_calculator/configs/config.yml
```

#### Testing the Calculator

Interact with the chat interface by prompting the agent with the message:

```
Is 4 + 4 greater than the current hour of the day?
```

![NeMo Agent Toolkit Web UI Workflow Result](public/screenshots/ui_generate_example.png)

### Human In The Loop (HITL) Example

#### Setup and Configuration

1. Set up [NeMo Agent Toolkit](https://docs.nvidia.com/nemo/agent-toolkit/latest/quick-start/installing.html) following the getting started guide
2. Start workflow by following the [HITL Example](https://github.com/NVIDIA/NeMo-Agent-Toolkit/blob/develop/examples/HITL/simple_calculator_hitl/README.md)

```bash
nat serve --config_file=examples/HITL/simple_calculator_hitl/configs/config-hitl.yml
```

#### Configuring HITL Settings

Enable WebSocket mode in the settings panel for bidirectional real-time communication between the client and server.

![NeMo Agent Toolkit Web UI HITL Settings](public/screenshots/hitl_settings.png)

#### Example Conversation

1. Send the following prompt:

```
Can you process my input and display the result for the given prompt: How are you today?
```

2. Enter your response when prompted:

![NeMo Agent Toolkit Web UI HITL Prompt](public/screenshots/hitl_prompt.png)

3. Monitor the result:

![NeMo Agent Toolkit Web UI HITL Result](public/screenshots/hitl_prompt.png)

### Server Communication

The UI supports both HTTP requests (OpenAI Chat compatible) and WebSocket connections for server communication. For detailed information about WebSocket messaging integration, please refer to the [WebSocket Documentation](https://docs.nvidia.com/nemo/agent-toolkit/latest/reference/websockets.html) in the NeMo Agent Toolkit documentation.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. The project includes code from [chatbot-ui](https://github.com/mckaywrigley/chatbot-ui) and [chatbot-ollama](https://github.com/ivanfioravanti/chatbot-ollama), which are also MIT licensed.
