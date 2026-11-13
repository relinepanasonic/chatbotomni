# Chat Inbox

The sales chat dashboard of Professor Online: an omnichannel-style inbox (conversations, chat, customer info) for the sales WhatsApp number, in light blue.
It is a separate app. It has no database of its own and no WhatsApp token: it signs people in with the **same ERP login** and reads and sends chats through the ERP's chat API (`/api/v1/chat/*` in the ERP repo), using each person's own access token.

## How it is connected
- **Sign-in:** the ERP's session cookie is shared across `*.profesoronline.id` (`COOKIE_DOMAIN`). Signed in to the ERP means signed in here. Not signed in: the page sends you to the ERP login.
- **Who may use it:** the ERP decides (roles founder, superadmin, admin, sales). A person without access sees "Please sign in" and nothing else.
- **Chats and replies:** this app's `/api/*` routes forward to the ERP with the person's token. A reply is sent by the ERP from the sales number (Fonnte), kept in the chat history with the sender's name, and pauses the bot for that chat.
- **The bot's script and settings** stay in the ERP (WA Control > Sales).

## Run it locally (design preview, no ERP needed)
```bash
npm install
```
Create `.env.local` with `DEMO=1` (and any value for the two Supabase variables), then:
```bash
npm run dev -- -p 3100
```
Open http://localhost:3100. Made-up chats; nothing is sent anywhere. `DEMO` is ignored in production builds.

## Deploy (Vercel)
1. Import this repository as a new Vercel project.
2. Environment variables (Production), copied from the ERP project: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `COOKIE_DOMAIN` (same value as the ERP), plus `ERP_BASE_URL=https://erp.profesoronline.id` and `ERP_LOGIN_URL=https://erp.profesoronline.id/login`. Do NOT set `DEMO`.
3. Add the domain `chat.profesoronline.id` to the project and its DNS record.
4. The ERP must have the chat API deployed (`/api/v1/chat/conversations`).
