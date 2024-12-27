# EZJP News

EZJP is a Japanese news reader designed to help you improve your Japanese reading skills. It provides a clean, distraction-free reading experience with built-in learning tools.

## Features

- 🎯 **Daily Reading Goals**: Set and track your daily reading targets
- 📚 **Progress Tracking**: Monitor your reading history and improvements
- 🔍 **Built-in Dictionary**: Look up words while reading
- 🎮 **Duolingo Integration**: Connect with your Duolingo profile
- 🌙 **Dark Mode**: Comfortable reading day and night
- 📰 **Auto-Updated Content**: Fresh news from NHK Easy Japanese updated hourly

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Quick Start

1. Clone and install dependencies:
```bash
git clone https://github.com/amazingandyyy/ezjp.git
cd ezjp
npm install
```

2. Set up Git hooks:
```bash
git config core.hooksPath .githooks
```

3. Start development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Database Setup

```bash
npx supabase link --project-ref ybsqylqrtxgjeyyttkdy
npx supabase db reset --linked
```

### News Data

The app automatically fetches news from NHK Easy Japanese every hour using GitHub Actions. The fetched data is stored in `public/sources/`. You can manually trigger the fetch by running:

```bash
./scripts/fetch-nhk-news.sh
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
