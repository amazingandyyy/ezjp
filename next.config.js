/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n: {
    locales: ['en', 'ja', 'es', 'fr', 'de', 'it', 'ko', 'zh-TW', 'vi'],
    defaultLocale: 'en',
    localeDetection: false
  },
  images: {
    domains: ['www3.nhk.or.jp', 'cdn-st1.fp.ps.ne.jp'],
  },
}

module.exports = nextConfig 