# Connectify

Connectify is a focused messaging experience for private, intentional conversations. It includes a responsive client, MongoDB data models, JWT authentication, protected REST APIs, and authenticated Socket.IO events.

## Run locally

## Frontend

From this folder:

```powershell
npm install
npm run dev
```

The app runs on `http://localhost:8080`.

## Backend

1. Copy `backend\.env.example` to a local, ignored file named `backend\.env`.
2. Replace only the placeholders in `MONGODB_URI` with your Atlas database user, password, and cluster host. URL-encode special characters in the password.
3. Replace `JWT_SECRET` with a long random value. Keep the other variables unchanged unless you need a different port or frontend origin.
4. Run:

```powershell
npm --prefix backend start
```

The API health check is available at `http://localhost:5000/health`.

## API surface

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `PUT /api/v1/auth/profile`
- `PUT /api/v1/auth/change-password`
- `GET /api/v1/users/search/:userId`
- `GET /api/v1/conversations`
- `POST /api/v1/conversations`
- `GET /api/v1/messages/:conversationId`
- `POST /api/v1/messages/:conversationId`
- `DELETE /api/v1/messages/:messageId`

Socket.IO uses authenticated `join_conversation`, `send_message`, `typing`, and `stop_typing` events. Conversation membership is checked on the server before room access or message creation.

The client retains local persistence as an offline-friendly fallback when no API URL is configured. Set `VITE_API_URL` and `VITE_SOCKET_URL` in the frontend environment when wiring it to the backend.
