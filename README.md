# Customer Support Frontend

This frontend implements real-time agent handoff and live chat for support staff using Socket.io.

## Requirements

- Node.js 18+ recommended
- Backend running with Socket.io enabled

## Install

```bash
npm install
```

## Environment

Ensure your frontend has the correct API base URL and auth token handling. If you use a local env file, set it to match your backend host and port.

## Real-Time Agent Takeover

### 1) Dependencies

Install Socket.io client:

```bash
npm install socket.io-client
```

### 2) Socket Client Helper

Create a singleton client in lib/socket.ts that attaches the JWT token to the Socket.io connection metadata.

Recommended behavior:
- Send the token in auth.token.
- Reconnect automatically when the token changes.
- Expose connect() and disconnect() helpers.

Example:

```ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = (token: string) => {
	if (!socket) {
		socket = io(process.env.NEXT_PUBLIC_API_URL as string, {
			auth: { token },
			transports: ["websocket"],
		});
	}

	return socket;
};
```

### 3) Conversation Services

Add HTTP actions in services/conversation.service.ts:
- takeoverConversation(id) -> PUT /conversations/:id/takeover
- sendAgentMessage(id, content) -> POST /conversations/:id/messages

### 4) Conversations Page

In app/dashboard/conversations/page.tsx:
- Connect to the socket once the user is authenticated.
- Listen to message:new and conversation:updated events.
- If a message event targets the selected conversation, append it directly to the stream.
- Replace the old takeover action with the new API call.
- When conversation.aiEnabled === false, show the agent message input.

### 5) Tickets Page

In app/dashboard/tickets/page.tsx:
- Add a split-pane layout with ticket details on the right.
- Fetch and display conversation history linked by conversationId.
- Add a Take Over Chat button that calls the takeover API.
- Show the live chat input when the conversation is taken over.
- Listen for message:new and conversation:updated to update the UI in real time.

## Run Dev Server

```bash
npm run dev
```

## Manual Verification

1. Open the Admin Dashboard -> Tickets page.
2. Select a ticket and verify the history and metadata load.
3. Click Take Over Chat and confirm the chat switches to agent mode.
4. Send a message and verify it appears immediately in the timeline.
5. Simulate an incoming customer message and verify it streams in live.
