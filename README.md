# 🏃 Cah Kalcer Coach

Cah Kalcer Coach adalah web application sederhana yang membantu pelari, khususnya **beginner**, memahami riwayat lari mereka dan mendapatkan rekomendasi latihan yang lebih personal.

Project ini dibuat sebagai portfolio untuk mempelajari integrasi **AI, data processing, recommendation system, dan external API** dalam sebuah web application.

> 🚧 **Project Status:** In Development

---

## 🎯 Project Goal

Tujuan utama project ini adalah membuat aplikasi yang dapat:

- Mencatat aktivitas lari pengguna
- Menampilkan statistik lari sederhana
- Menganalisis pola latihan
- Menentukan rekomendasi latihan berikutnya
- Memberikan penjelasan rekomendasi menggunakan AI
- Pada tahap selanjutnya, mengambil data aktivitas secara otomatis dari **Strava API**

Project ini berfokus pada pengalaman yang sederhana sehingga dapat digunakan oleh pelari pemula tanpa membutuhkan pengetahuan mengenai training plan yang kompleks.

---

## ✨ Planned Features

### 1. Running Activity

Pengguna dapat memasukkan data aktivitas lari seperti:

- Date
- Distance
- Duration
- Pace
- Running frequency
- Current goal
- Experience level

---

### 2. Running Dashboard

Dashboard akan menampilkan ringkasan aktivitas pengguna, seperti:

- Total distance
- Number of runs
- Average pace
- Longest run
- Recent activities
- Weekly running volume

Contoh:

```text
Total Distance     12.4 KM
Total Runs         4
Average Pace       7:12 /KM
Longest Run        4.2 KM
```

---

### 3. AI Training Recommendation

Aplikasi akan memberikan rekomendasi latihan berdasarkan data lari pengguna.

Contoh:

> **Recommended Training**
>
> Easy Run — 3–3.5 KM
>
> Keep the intensity comfortable and focus on maintaining a consistent pace.

AI juga akan memberikan alasan sederhana mengenai rekomendasi tersebut.

---

### 4. Rule-Based Analysis

Sebelum rekomendasi diberikan oleh AI, aplikasi akan melakukan analisis dasar menggunakan rule/logic.

Contoh:

```text
Recent running history
        ↓
Weekly distance
        ↓
Average pace
        ↓
Training frequency
        ↓
Rule-based analysis
        ↓
Training context
        ↓
AI recommendation
```

Pendekatan ini digunakan agar AI tidak menjadi satu-satunya sumber keputusan.

---

### 5. Strava Integration

Pada tahap pengembangan berikutnya, aplikasi akan mendukung koneksi dengan **Strava**.

Target flow:

```text
Connect Strava
      ↓
OAuth Authentication
      ↓
Strava API
      ↓
Running Activities
      ↓
Data Processing
      ↓
Training Analysis
      ↓
AI Recommendation
```

Fitur ini direncanakan setelah versi manual input sudah stabil.

---

# 🧠 Recommendation Approach

Project ini menggunakan pendekatan hybrid:

```text
                Running Data
                     │
                     ▼
             Data Processing
                     │
                     ▼
              Rule / Analysis
                     │
                     ▼
             Training Context
                     │
                     ▼
                Gemini AI
                     │
                     ▼
          Personalized Recommendation
```

### Why Hybrid?

AI tidak langsung menentukan seluruh keputusan latihan.

Rule-based logic digunakan untuk mengolah kondisi dasar pengguna, kemudian AI digunakan untuk menghasilkan rekomendasi dan penjelasan yang lebih natural.

Pendekatan ini juga membantu membuat sistem lebih mudah dikontrol dan dikembangkan.

---

# 🛠️ Tech Stack

## Planned Stack

| Technology | Purpose |
|---|---|
| Next.js | Web application |
| React | User interface |
| Gemini API | AI recommendation |
| Supabase | Database |
| Strava API | Running activity integration |
| Vercel | Deployment |
| Git & GitHub | Version control |

> Tech stack dapat berubah selama proses pengembangan.

---

# 📌 Development Roadmap

## Phase 1 — MVP

- [ ] Setup Next.js project
- [ ] Create basic UI
- [ ] Running activity input
- [ ] Store running data
- [ ] Running history
- [ ] Basic statistics
- [ ] Simple rule-based recommendation

---

## Phase 2 — AI Integration

- [ ] Integrate Gemini API
- [ ] Create recommendation prompt
- [ ] Generate personalized training recommendation
- [ ] Add recommendation explanation
- [ ] Improve prompt reliability
- [ ] Add basic error handling

---

## Phase 3 — Database

- [ ] Setup Supabase
- [ ] User data structure
- [ ] Running activity table
- [ ] Store recommendation history
- [ ] Retrieve historical activities

---

## Phase 4 — Strava Integration

- [ ] Create Strava application
- [ ] Implement OAuth
- [ ] Connect Strava account
- [ ] Retrieve running activities
- [ ] Process Strava activity data
- [ ] Display imported activities
- [ ] Generate recommendations from Strava data

---

## Phase 5 — Improvement

- [ ] Improve dashboard
- [ ] Add running charts
- [ ] Improve recommendation logic
- [ ] Add training goals
- [ ] Improve mobile responsiveness
- [ ] Add loading and error states
- [ ] Deploy production version

---

# 📊 Example User Flow

```text
1. User opens the application
              ↓
2. User enters running profile
              ↓
3. User records running activity
              ↓
4. Application calculates statistics
              ↓
5. System analyzes recent activities
              ↓
6. AI generates training recommendation
              ↓
7. User receives recommended workout
```

Future version:

```text
User
 ↓
Connect Strava
 ↓
Import Activities
 ↓
Analyze Running History
 ↓
AI Running Coach
 ↓
Training Recommendation
```

---

# 🎯 Target Users

Primary target:

- Beginner runners
- People starting a running routine
- Casual runners
- People preparing for their first 5K

Example goals:

- Start running consistently
- Complete a 5K
- Improve running consistency
- Understand running progress
- Receive simple training suggestions

---

# ⚠️ Disclaimer

This project is intended for **educational and portfolio purposes**.

The recommendations generated by this application are general suggestions and should not be considered professional medical advice or a substitute for guidance from a qualified running coach or healthcare professional.

Users should adjust their training based on their own physical condition and stop exercising if they experience significant pain or other concerning symptoms.

---

# 🚀 Getting Started

> Installation instructions will be added as the project implementation progresses.

Planned setup:

```bash
git clone <repository-url>

cd ai-running-coach

npm install

npm run dev
```

Then open:

```text
http://localhost:3000
```

---

# 🔐 Environment Variables

The application will require environment variables for external services.

Example:

```env
GEMINI_API_KEY=your_gemini_api_key

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
```

> Never commit API keys, client secrets, or other sensitive credentials to GitHub.

---

# 📁 Planned Project Structure

```text
ai-running-coach/
│
├── app/
│   ├── dashboard/
│   ├── activities/
│   ├── recommendation/
│   └── api/
│
├── components/
│   ├── dashboard/
│   ├── activities/
│   └── recommendation/
│
├── lib/
│   ├── ai/
│   ├── strava/
│   ├── database/
│   └── analysis/
│
├── public/
│
├── README.md
├── package.json
└── .env.local
```

Structure ini dapat berubah mengikuti kebutuhan implementasi.

---

# 📈 Future Improvements

Beberapa fitur yang dapat dikembangkan setelah MVP:

- Training plan generator
- 5K training program
- Weekly training summary
- Pace progression
- Distance progression
- Training consistency score
- Recovery recommendation
- Running charts
- Personal running goals
- Strava activity synchronization
- AI-generated weekly training plan

---

# 📚 Learning Objectives

Melalui project ini, saya ingin mempelajari dan mempraktikkan:

- Building AI-powered web applications
- REST API integration
- OAuth 2.0
- External API authentication
- Data processing
- Recommendation systems
- Prompt engineering
- Database design
- Next.js development
- Gemini API integration
- Supabase
- Vercel deployment
- Git & GitHub workflow

---

# 📌 Project Status

**Current Stage:** 🟡 Planning / Initial Development

### Current Focus

> Build a simple running tracker first, then gradually introduce AI and external API integration.

The project will be developed incrementally rather than implementing all planned features at once.

---

## 👨‍💻 Author

**Gar**

Game Technology Graduate / AI & Web Development Learner

---

## 📄 License

This project is created for educational and portfolio purposes.