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

The application will be available at the proxy port configured in your `PORT` environment variable (default: `http://localhost:3000`)

> **Important:** Check terminal startup logs for the actual web application URL (e.g., `http://localhost:3000`). If the configured port conflicts, an alternate port will be assigned. Do not access the internal Next.js port directly (default: 3099) as API and WebSocket communication will fail.

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

### Environment Variables

The application uses a unified proxy architecture for improved security. All configuration is done via environment variables in a `.env` file.

**Backend Configuration (Required):**
- `NAT_BACKEND_URL` - **Required** - Full backend URL including protocol (e.g., `http://127.0.0.1:8000` or `https://api.example.com`)
  - This is server-only and never exposed to the browser
  - Used for both HTTP API and WebSocket connections
  - Replaces the old `NEXT_PUBLIC_NAT_BACKEND_ADDRESS` variable

**Application Configuration:**
- `NEXT_PUBLIC_NAT_WORKFLOW` - Application workflow name displayed in the UI
- `NEXT_PUBLIC_NAT_GREETING_TITLE` - Optional custom greeting title shown on empty chat
- `NEXT_PUBLIC_NAT_GREETING_SUBTITLE` - Optional custom greeting subtitle shown on empty chat
- `NEXT_PUBLIC_NAT_INPUT_PLACEHOLDER` - Optional custom placeholder text for the chat input field
- `NEXT_PUBLIC_NAT_WELCOME_MESSAGE_ON` - Enable welcome message (see [Welcome Message Customization](#welcome-message-customization))
- `NEXT_PUBLIC_NAT_DEFAULT_ENDPOINT` - Default endpoint selection

**Feature Toggles:**
- `NEXT_PUBLIC_NAT_WEB_SOCKET_DEFAULT_ON` - Enable WebSocket mode by default (true/false)
- `NEXT_PUBLIC_NAT_CHAT_HISTORY_DEFAULT_ON` - Enable chat history persistence by default (true/false)
- `NEXT_PUBLIC_NAT_RIGHT_MENU_OPEN` - Show right menu panel by default (true/false)
- `NEXT_PUBLIC_NAT_ENABLE_INTERMEDIATE_STEPS` - Show AI reasoning steps by default (true/false)
- `NEXT_PUBLIC_NAT_ADDITIONAL_VIZ_DEFAULT_ON` - View settings and toggles not part of the core functionality (true/false)
- `NEXT_PUBLIC_NAT_SHOW_DATA_STREAM_DEFAULT_ON` - Show data stream display by default (true/false)

**Proxy Configuration**
- `PORT` - Public gateway port that the browser connects to (default: 3000, auto-detects if busy)
- `NEXT_INTERNAL_URL` - Internal Next.js dev server URL (default: `http://localhost:3099`). Must match the port in `package.json`.
- `HTTP_PUBLIC_PATH` - Public HTTP path prefix for API requests (default: `/api`)
- `WS_PUBLIC_PATH` - Public WebSocket path (default: `/ws`)

**Optional Configuration:**
- `NAT_DEFAULT_MODEL` - Default AI model identifier for server-side rendering
- `NAT_MAX_FILE_SIZE_STRING` - Maximum file upload size for all operations (e.g., '5mb', '10mb', '1gb')
- `NEXT_TELEMETRY_DISABLED` - Disable Next.js telemetry data collection (1 to disable)
- `NEXT_PUBLIC_MCP_PATH` - MCP client API path (defaults to `/mcp/client/tool/list`)

### Welcome Message Customization

This application can optionally display a welcome message on the initial chat screen. Follow the instructions below to enable and customize the message:

1. Enable the welcome message by setting the environment variable:
   ```bash
   NEXT_PUBLIC_NAT_WELCOME_MESSAGE_ON=true
   ```

2. Copy the example file:
   ```bash
   cp public/content/welcome.md.example public/content/welcome.md
   ```

3. Edit `public/content/welcome.md` to customize the welcome message with your own content, features, and instructions. The message is rendered with Markdown support, allowing you to use headings, lists, bold/italic text, links, and other Markdown features.
   - If deploying with Docker, mount your custom welcome message:
     ```bash
     docker run -v /path/to/your/welcome.md:/app/public/content/welcome.md -p 3000:3000 nemo-agent-toolkit-ui
     ```



### API Connection

Settings can be configured by selecting the `Settings` icon located on the bottom left corner of the home page.

![NeMo Agent Toolkit Web UI Settings](public/screenshots/ui_chat_stream_settings_example.png)

### Communication Protocols

The UI supports two communication modes:

**HTTP/REST (Default)**
- Standard request-response pattern
- OpenAI Chat Completions compatible
- Supports both streaming and non-streaming responses
- Best for: Simple request-response workflows, stateless interactions

**WebSocket (Real-time)**
- Bidirectional persistent connections
- Required for Human-in-the-Loop (HITL) workflows
- Enables server-initiated messages and interruptions
- Best for: Interactive workflows, multi-turn conversations, HITL scenarios

For detailed WebSocket integration and message formats, refer to the [WebSocket Documentation](https://docs.nvidia.com/nemo/agent-toolkit/latest/reference/websockets.html) in the NeMo Agent Toolkit documentation.

### Settings Options

**Appearance:**
- `Theme`: Switch between Light and Dark mode

**API Configuration:**
- `HTTP Endpoint`: Select API endpoint type:
  - **Chat Completions — Streaming** - Real-time OpenAI Chat Completions compatible API endpoint with streaming responses
  - **Chat Completions — Non-Streaming** - Standard OpenAI Chat Completions compatible API endpoint
  - **Generate — Streaming** - Text generation with streaming
  - **Generate — Non-Streaming** - Standard text generation
  - **Context-Aware RAG — Non-Streaming (Experimental)** - Experimental integration with [Context-Aware RAG](https://github.com/NVIDIA/context-aware-rag) backend
- `Optional Generation Parameters`: OpenAI Chat Completions compatible JSON parameters that can be added to the request body (available for chat endpoints)

**WebSocket Configuration:** The WebSocket path defaults to `websocket`.
- `WebSocket Schema`: Select schema for real-time connections:
  - **Chat Completions — Streaming** - Streaming chat over WebSocket
  - **Chat Completions — Non-Streaming** - Non-streaming chat over WebSocket
  - **Generate — Streaming** - Streaming generation over WebSocket
  - **Generate — Non-Streaming** - Non-streaming generation over WebSocket

> [!IMPORTANT]
> WebSocket mode **must be enabled** for interactive workflows like Human-in-the-Loop (HITL). To enable:
> 1. Open the panel on the top right of the webpage
> 2. Toggle the **WebSocket** button to ON
> 3. You will see a notification that says "websocket connected" when successfully connected
> 4. Configure the **WebSocket Schema** in settings (use `Chat Completions — Streaming` for HITL)

**Note:** For intermediate results streaming, use **Chat Completions — Streaming** (`/chat/stream`) or **Generate — Streaming** (`/generate/stream`).

### Live Data Streaming

**Note:** This is an experimental feature

The live data streaming feature allows visualization of real-time text updates across multiple streams. This is useful for monitoring ongoing processes or displaying live transcription or streaming data.

For more detail, see the [README for live data streaming](DATA_STREAMING.md).

## Usage Examples

### Quick Start: Simple Calculator Example


This example demonstrates an agent workflow using HTTP streaming with intermediate step visualization.

#### 1. Backend Setup

First, install and configure [NeMo Agent Toolkit](https://docs.nvidia.com/nemo/agent-toolkit/latest/quick-start/installing.html), then start the simple calculator workflow:

```bash
# Start the NeMo Agent Toolkit backend with the calculator example
nat serve --config_file=examples/getting_started/simple_calculator/configs/config.yml
```

For detailed setup instructions, see the [Simple Calculator Example](https://github.com/NVIDIA/NeMo-Agent-Toolkit/blob/develop/examples/getting_started/simple_calculator/README.md) in the NeMo Agent Toolkit repository.

#### 2. Configure the UI

Open the settings panel (gear icon in bottom left) and configure:

- **HTTP Endpoint**: Select `Chat Completions — Streaming` (OpenAI compatible, default setting) to enable real-time streaming responses
- **Enable Intermediate Steps**: Toggle on to see the agent's reasoning process

#### 3. Test the Agent

Interact with the chat interface by prompting the agent with the message:

```
Is 4 + 4 greater than the current hour of the day?
```

The agent will:
1. Break down the problem into steps
2. Call the calculator tool to compute `4 + 4 = 8`
3. Get the current time
4. Compare the values and provide an answer

![Agent Workflow with Intermediate Steps](public/screenshots/ui_simple_calculator_example.png)

**Expected Result**: The UI displays both the intermediate reasoning steps and the final answer, showing how the agent solves the problem step-by-step.

---

### Advanced: Human-in-the-Loop (HITL) Workflows

This example demonstrates bidirectional real-time communication using WebSockets, allowing human intervention during agent execution.

#### 1. Backend Setup

Start the HITL-enabled calculator workflow:

```bash
# Start the NeMo Agent Toolkit backend with HITL support
nat serve --config_file=examples/HITL/simple_calculator_hitl/configs/config-hitl.yml
```

For complete setup instructions, see the [HITL Example](https://github.com/NVIDIA/NeMo-Agent-Toolkit/blob/develop/examples/HITL/simple_calculator_hitl/README.md) in the NeMo Agent Toolkit repository.

#### 2. Enable WebSocket Mode

> [!IMPORTANT]
> WebSocket mode is **required** for interactive workflows.

Enable WebSocket for bidirectional real-time communication:

1. Open the panel on the **top right** of the webpage
2. Toggle the **WebSocket** button to ON
3. You will see a notification that says "websocket connected" when successfully connected
4. In settings, ensure **WebSocket Schema** is set to `Chat Completions — Streaming`

#### 3. Interact with the Agent

**Step 1**: Interact with the chat by submitting the prompt below:

```
Is 4 + 4 greater than the current hour of the day?
```

**Step 2**: The agent will pause and request your input via an interactive modal:

![HITL Input Request](public/screenshots/hitl_prompt.png)

**Step 3**: Enter your response in the human-in-the-loop modal (e.g., "yes" or "no") and click Submit.



**Expected Result**: The agent receives your input and continues execution, displaying intermediate reasoning steps and the final answer. The result will be identical to what was demonstrated in the [Quick Start: Simple Calculator Example](#quick-start-simple-calculator-example) above.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. The project includes code from [chatbot-ui](https://github.com/mckaywrigley/chatbot-ui) and [chatbot-ollama](https://github.com/ivanfioravanti/chatbot-ollama), which are also MIT licensed.
