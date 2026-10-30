# Supabase Setup Guide for Smart Retail Assistant

Aapke project ke liye Supabase integration files successfully ready kar di gayi hain:

1. **Client SDK:** [`src/lib/supabase.ts`](file:///c:/Users/LENOVO/Videos/Alpha/src/lib/supabase.ts) (Frontend / public client)
2. **Admin SDK:** [`src/lib/supabaseAdmin.ts`](file:///c:/Users/LENOVO/Videos/Alpha/src/lib/supabaseAdmin.ts) (Backend / Service Role client)
3. **Full Database SQL Schema:** [`supabase/schema.sql`](file:///c:/Users/LENOVO/Videos/Alpha/supabase/schema.sql) (Supabase SQL Editor ke liye)
4. **PostgreSQL Prisma Schema:** [`prisma/schema.postgresql.prisma`](file:///c:/Users/LENOVO/Videos/Alpha/prisma/schema.postgresql.prisma) (Prisma se direct Supabase push ke liye)
5. **Environment Template:** [`.env.example`](file:///c:/Users/LENOVO/Videos/Alpha/.env.example)

---

## Step 1: Supabase Project Create Karein
1. [supabase.com](https://supabase.com) par login karke **New Project** create karein.
2. Apne database ka password yaad rakhein.

---

## Step 2: Keys Aur Connection Strings Copy Karein

Supabase dashboard mein **Project Settings -> Database / API** se ye values copy karein aur apne local `.env` file mein daalein:

```env
# 1. Supabase PostgreSQL Connection Strings
# Transaction Pooler (port 6543)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct Connection (port 5432)
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# 2. Supabase API Credentials
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
```

---

## Step 3: Database Tables Banane Ke Do Asaan Tareeqay

### Option A: Prisma Se Automatic Push (Recommended)
Kyunki aapka poora backend already Prisma use kar raha hai, aap bina kisi manual kaam ke directly push kar sakte hain:

```bash
npm run supabase:push
```
Ye command Supabase mein sabhi tables (`User`, `Shop`, `Product`, `InventoryBatch`, `Sale`, etc.) auto-create kar degi!

---

### Option B: Supabase Dashboard SQL Editor
Agar aap SQL script run karna chahte hain:
1. Supabase Dashboard mein **SQL Editor** open karein.
2. File [`supabase/schema.sql`](file:///c:/Users/LENOVO/Videos/Alpha/supabase/schema.sql) ka content copy karke wahan paste karein.
3. **Run** button par click karein.

---

## Step 4: Code Mein Supabase Client Kaise Use Karein

### Client-side (Components / Pages):
```tsx
import { supabase } from "@/lib/supabase";

// Example: Realtime subscription ya storage upload
const { data, error } = await supabase.from("Product").select("*");
```

### Server-side / API Routes (Bypass RLS):
```ts
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Admin level operations
const { data } = await supabaseAdmin.auth.admin.listUsers();
```
