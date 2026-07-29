# NotMoodle AI RAG Backend

This is the background worker that extracts text from course PDFs and PowerPoints, generates vector embeddings using Google Gemini, and saves them back to Supabase.

## Deployment on Render.com

1. Go to your Render Dashboard and create a new **Web Service**.
2. Connect your GitHub repository and set the Root Directory to `render-backend` (or deploy just this folder).
3. **Language/Environment:** Python 3
4. **Build Command:** `pip install -r requirements.txt`
5. **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. **Environment Variables:**
   - `SUPABASE_URL`: Your Supabase Project URL
   - `SUPABASE_SERVICE_KEY`: Your Supabase **Service Role** Key (needed to bypass RLS and download files)
   - `GEMINI_API_KEY`: Your Google Gemini API Key

## Setting up the Supabase Webhook

Once your Render app is live (e.g., `https://notmoodle-backend.onrender.com`), you need to tell Supabase to send it a message every time a file is uploaded.

1. Go to your Supabase Dashboard -> **Database** -> **Webhooks**.
2. Create a new Webhook.
3. **Name:** Trigger File Indexing
4. **Table:** Select `storage.objects`
5. **Events:** Check **Insert** only.
6. **Method:** POST
7. **URL:** Your Render URL + `/webhook/supabase` (e.g., `https://notmoodle-backend.onrender.com/webhook/supabase`)
8. Hit **Save**.

Now, whenever a student views a file for the first time, it uploads to Supabase, which triggers this webhook, which tells Render to index it!
