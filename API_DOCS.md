# API Documentation

## Overview

Bu proje iki ayrı API sistem kullanıyor:
1. **Wiro.ai API** — AI resim üretimi
2. **Session Server** — Real-time user tracking

---

## 1. Wiro.ai Image Generation API

### Base URL
```
https://api.wiro.ai/v1
```

### Authentication

HMAC-SHA256 tabanlı imzalama:

```
Header: x-api-key: {YOUR_API_KEY}
Header: x-nonce: {UNIX_TIMESTAMP}
Header: x-signature: HMAC-SHA256(secret + nonce, key=api_key)
```

**Imza Hesaplama (Node.js/Browser):**
```javascript
import crypto from 'crypto';

const apiKey = "0anhikrcgkvp6nq1ixogtv1qwvnlmtxe";
const secret = "1a070dc772df8cd70b7e61af4f4891555132f4922d1195985cb3afdc824e37c5";
const nonce = Math.floor(Date.now() / 1000).toString();

const signature = crypto
  .createHmac('sha256', apiKey)
  .update(secret + nonce)
  .digest('hex');
```

### Endpoints

#### 1. Image Generation Task Submit

**POST** `/Run/{model-provider}/{model-slug}`

**Supported Models:**

| Model | Endpoint | Model ID | Speed | Quality |
|-------|----------|----------|-------|---------|
| FLUX.2 [klein] 4B | `black-forest-labs/flux-2-klein-4b` | `1677` | ⚡⚡⚡ | Excellent |
| FLUX.2 [klein] 9B | `black-forest-labs/flux-2-klein-9b` | `1676` | ⚡⚡ | Very Good |
| FLUX.2 [dev] Turbo | `wiro/flux-2-dev-turbo` | `1667` | ⚡⚡ | Excellent |
| FLUX.2 [dev] | `wiro/flux-2-dev` | `1641` | ⚡ | Outstanding |
| Sana 1600M | `wiro/text-to-image-sana` | `748` | ⚡ | Very Good |
| ByteDance Seedream v5 | `bytedance/seedream-v5-lite` | `1722` | ⚡⚡ | Very Good |

**Request Body:**

```json
{
  "selectedModel": "1677",
  "prompt": "description of image",
  "negativePrompt": "unwanted elements",
  "steps": "4",
  "scale": "1",
  "samples": "1",
  "seed": "1849728585",
  "width": "1024",
  "height": "1024"
}
```

**Parameters:**
- `selectedModel` (string): Model ID
- `prompt` (string): Image description
- `negativePrompt` (string): What NOT to generate
- `steps` (string): Inference steps (FLUX: 4, Sana: 25)
- `scale` (string): Guidance scale (FLUX: 1, Sana: 3.5)
- `samples` (string): Number of images
- `seed` (string): Random seed for reproducibility
- `width` (string): Image width (512-2048)
- `height` (string): Image height (512-2048)

**Response:**

```json
{
  "result": true,
  "taskid": "1490465",
  "socketaccesstoken": "U0Y0FqNqy7QN3iPUzneJgz2Ka8Q8ZW",
  "errors": []
}
```

**Returns:**
- `taskid`: Task identifier
- `socketaccesstoken`: Token for polling task status

---

#### 2. Task Status Polling

**POST** `/Task/Detail`

**Request Body:**

```json
{
  "tasktoken": "{socketaccesstoken}"
}
```

**Response:**

```json
{
  "total": "1",
  "errors": [],
  "tasklist": [
    {
      "id": "1490465",
      "status": "task_postprocess_end",
      "elapsedseconds": "8.5",
      "totalcost": "0.045",
      "outputs": [
        {
          "id": "a8556fb0193753fb43497434dade5832",
          "url": "https://cdn1.wiro.ai/.../0.png",
          "contenttype": "image/png",
          "size": "1737302"
        }
      ]
    }
  ],
  "result": true
}
```

**Task Status Values:**
- `task_assign` — Processing, waiting for GPU
- `task_process_start` — Generation in progress
- `task_postprocess_end` — Complete, outputs available
- `task_cancel` — Cancelled/Failed

---

### Implementation Details

**File:** `src/lib/wiro.ts`

```typescript
// Submit image generation task
export async function submitImageTask(prompt: string): Promise<string>

// Poll task status and get image URL
export async function pollTask(token: string): Promise<string | null>
```

**Hook:** `src/hooks/useIPhoneAd.ts`

Automatically:
- Caches images per scenario (2 or 3)
- Polls until completion
- Handles errors gracefully
- Custom prompts per scenario

---

## 2. Session Server API

### Base URL
```
http://localhost:3001
```

### WebSocket Connection

**Namespace:** Default (`/`)

**Client Library:** `socket.io-client`

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  reconnection: true,
  reconnectionDelay: 1000,
});

socket.on('userCount', (count: number) => {
  console.log(`Active sessions: ${count}`);
});
```

### Events

#### Incoming Events

**`userCount`** — Emitted whenever user count changes

```javascript
socket.on('userCount', (count: number) => {
  // count = 1, 2, 3, etc.
});
```

### Endpoints

#### GET `/api/user-count`

Returns current active session count.

**Response:**
```json
{
  "count": 5
}
```

---

### Implementation Details

**File:** `server.js`

- Express server on port 3001
- Socket.io for real-time updates
- Tracks connected users
- Broadcasts count changes

**Hook:** `src/hooks/useRealSessionCount.ts`

```typescript
export function useRealSessionCount() {
  const { count } = useRealSessionCount();
  // count auto-updates when users connect/disconnect
}
```

---

## 3. Scenario-Based Image Generation

### Scenarios

| Scenario | Trigger | Prompt Type | Model |
|----------|---------|------------|-------|
| Whisper | count ≤ 1 | No generation | — |
| Rival | 2 ≤ count ≤ 6 | Competitive luxury | FLUX.2 [klein] 4B |
| Dictator | count > 6 | Mass conformity | FLUX.2 [klein] 4B |

### Rival Scenario Prompt

```
"professional product photography of Apple iPhone 16 Pro,
single device floating in empty space, dramatic side lighting
with sharp metallic reflections, pure black background,
cinematic studio lighting, ultra detailed titanium edges,
luxury premium feel, high fashion editorial style, 8k quality"
```

### Dictator Scenario Prompt

```
"wide aerial shot of massive urban crowd all holding Apple iPhones,
city street filled with people, warm golden hour lighting,
cinematic composition, powerful sense of conformity and unity,
everyone scrolling simultaneously, photorealistic crowd scene,
billboard scale imagery, vibrant city atmosphere"
```

---

## 4. Proxy Configuration

### Development Proxy

**File:** `vite.config.ts`

Routes `/wiro-api/*` requests to actual Wiro API:

```typescript
proxy: {
  "/wiro-api": {
    target: "https://api.wiro.ai",
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/wiro-api/, ""),
  },
}
```

**Usage:**
```javascript
// Browser makes request to localhost
fetch("/wiro-api/v1/Run/black-forest-labs/flux-2-klein-4b", {...})

// Vite proxies to
// https://api.wiro.ai/v1/Run/black-forest-labs/flux-2-klein-4b
```

---

## 5. Error Handling

### Wiro API Errors

```json
{
  "result": false,
  "errors": [
    {
      "code": 0,
      "message": "Project authorization is not founded",
      "time": 1773486903
    }
  ]
}
```

**Common Errors:**
- `"Project authorization is not founded"` — Invalid API key/secret
- `"Request parameter [X] required"` — Missing required field
- Task not found — Task expired or invalid token

### Session Server Connection Errors

```javascript
socket.on('connect_error', (error) => {
  console.warn('Connection error:', error.message);
  // Fallback to REST API
  fetch('/api/user-count')
    .then(r => r.json())
    .then(d => setCount(d.count));
});
```

---

## 6. Performance Metrics

### Image Generation Times (FLUX.2 klein 4B)

| Task | Time | Cost |
|------|------|------|
| Image Gen | 3-5 sec | $0.002-0.005 |
| Polling | 2 sec/call | Free |
| Total | 5-10 sec | $0.002-0.005 |

### Session Server

| Metric | Value |
|--------|-------|
| Connection latency | <100ms |
| Count update broadcast | <50ms |
| Memory per session | ~1KB |

---

## 7. Environment Variables

**File:** `.env`

```bash
VITE_WIRO_API_KEY=0anhikrcgkvp6nq1ixogtv1qwvnlmtxe
VITE_WIRO_API_SECRET=1a070dc772df8cd70b7e61af4f4891555132f4922d1195985cb3afdc824e37c5
```

⚠️ **Security Note:** These keys should be in `.env.local` (not committed) in production.

---

## 8. Example: Complete Flow

### 1. User Opens Page
```
→ Browser connects to Session Server (WebSocket)
→ Session server broadcasts user count = 1
→ Component renders Whisper scenario
```

### 2. Second User Opens Page
```
→ New WebSocket connection to Session Server
→ Broadcast userCount = 2
→ Both clients update → Rival scenario triggers
→ useIPhoneAd hook calls submitImageTask()
→ Wiro API accepts task, returns token
→ Hook starts polling every 2 seconds
→ After 5-10 sec: Image ready, displays in UI
```

### 3. Seventh User Connects
```
→ userCount broadcast = 7
→ Dictator scenario replaces Rival
→ New image generation starts
→ Full-screen red overlay with background image
```

### 4. User Closes Tab
```
→ WebSocket disconnects
→ Session server updates count = 6
→ All remaining clients get broadcast
→ Scenario switches back to Rival
→ Cached image from before displays immediately
```

---

## 9. API Limits & Quotas

| Resource | Limit | Reset |
|----------|-------|-------|
| Wiro API calls | Project-dependent | N/A |
| Image requests | Per project quota | Hourly/Daily |
| Concurrent tasks | 5-10 | N/A |
| Session connections | Unlimited | N/A |

---

## 10. Troubleshooting

### Image not generating?

1. Check browser console (F12) for errors
2. Verify Vite proxy: `/wiro-api/...` requests
3. Confirm `.env` has valid API keys
4. Check Wiro API status: https://wiro.ai/status

### Session count not updating?

1. Verify Session Server running: `npm run server`
2. Check browser console for WebSocket errors
3. Fallback to REST API at `http://localhost:3001/api/user-count`
4. Restart both servers: `npm run dev:full`

### Images too small?

- Adjust `max-h-[90vh]` in `ScenarioRival.tsx`
- Check image resolution from Wiro (1024x1024)
- Verify CSS Tailwind classes applying correctly

---

## 11. Useful Commands

```bash
# Start both servers
npm run dev:full

# Start only frontend
npm run dev

# Start only session server
npm run server

# Build for production
npm run build

# Check API connection
curl -s http://localhost:3001/api/user-count | jq
```

---

## References

- **Wiro.ai**: https://wiro.ai/docs
- **Socket.io**: https://socket.io/docs
- **FLUX Models**: https://wiro.ai/models
- **Project Repo**: `/src/lib/wiro.ts`, `server.js`
