# Adımsayar

Arkadaşlarla adım sayısı üzerinden rekabet edilen, Türkçe bir sosyal
fitness/adım sayar mobil uygulaması. Kullanıcılar telefon sensörüyle günlük
adımlarını otomatik takip eder, arkadaşlarıyla 1v1 veya grup "challenge"lar
başlatır, sıralama tablolarında yarışır, rozet/başarım kazanır ve XP biriktirir.

## Mimari

npm workspaces monorepo: `mobile/` ve `backend/`.

### `mobile/` — Expo (React Native) uygulaması
- **Dil/araçlar**: TypeScript, Expo SDK 52, React Native 0.76.9, expo-router
  (dosya tabanlı routing, `app/` klasörü)
- **State**: Zustand store'ları (`src/store/*`) — `authStore`, `stepsStore`,
  `challengeStore`, `friendStore`, `achievementStore`. Store'lar arası
  senkronizasyon dikkat gerektirir (bkz. adım sayacı monoton garantisi).
- **Sensör/adım takibi**: `src/hooks/usePedometer.ts` — `expo-sensors`
  `Pedometer.watchStepCount` (canlı akış, Android'de tek güvenilir kaynak) +
  `getStepCountAsync` (geçmişe dönük, iOS'a özel varsayılan ama bazı Android
  cihazlarda da çalışabiliyor). `stepsStore.setTodaySteps` tüm güncellemeleri
  `Math.max` ile clamp'ler — sayaç asla geriye gidemez; yeni kod bu deseni
  bozmamalı.
- **Arka plan senkronu**: `src/services/backgroundSteps.ts` —
  `expo-background-fetch` + `expo-task-manager`, ~15dk minimum interval,
  son bilinen adım sayısını `SecureStore`'a (`lastKnownSteps`) yazar (hem
  offline/hızlı-açılış cache'i hem arka plan senkronu için kullanılır).
  `expo-notifications` push token kaydı (`src/services/notificationService.ts`),
  `useLiveStepNotification` (canlı, sessiz Android bildirimi).
- **Tema**: `src/context/ThemeContext.tsx` — açık/koyu "neon" tema, tüm
  ekranlar `useTheme()` ile tema-duyarlı.
- **Backend iletişimi**: `src/api/*` (axios tabanlı `apiClient`), gerçek
  zamanlı güncellemeler için `src/services/socketService.ts` (socket.io
  client, challenge sıralaması / achievement bildirimleri).

### `backend/` — Node.js API
- **Dil/araçlar**: TypeScript, Express, PostgreSQL (`pg`, parametreli
  sorgular — asla string concatenation ile SQL kurma), Zod (request
  validasyonu), socket.io (gerçek zamanlı), JWT (auth).
- **Katmanlama**: `controllers/` → `services/` → `pool.query`. Route'lar
  `requireAuth` middleware'i ile korunur, hassas endpoint'lerde rate
  limiting var (`middleware/rateLimit.ts`).
- **Push bildirimleri**: `services/push.service.ts` — Expo push servisi
  üzerinden friend-request, friend-accepted, challenge-invite, challenge-
  started/completed, achievement-earned, penalty-reminder, daily-reminder
  bildirimleri. Mobil tarafta token kaydı için `expo-constants`'tan
  `projectId` geçmek zorunlu (aksi halde standalone/EAS build'lerde token
  alma sessizce başarısız olur).
- **Deploy**: backend Render'da (Neon Postgres ile), mobil EAS Build ile
  (Android preview profile).

## CI

`.github/workflows/ci.yml` — backend job (Postgres service container, tsc,
jest) + mobile job (tsc, expo export bundle check). PR açmadan önce her iki
tarafta da `npx tsc --noEmit` çalıştır.

## Developer/Reviewer döngüsü

Bu projede iki subagent tanımlı: `.claude/agents/developer.md` (kod yazar)
ve `.claude/agents/reviewer.md` (kod yazmaz, bağımsız inceler, bug + öneri
raporlar).

Bir görev için **developer → reviewer → developer döngüsü en fazla 3 tur**
sürer. Kritik bug'lar (crash, veri kaybı, sonsuz döngü, pil tüketimi
anomalisi) mutlaka bir sonraki turda düzeltilir. Reviewer'ın geliştirme
önerileri **sadece raporlanır**, kullanıcının onayı olmadan uygulanmaz.
3 tur sonunda hâlâ kritik bug varsa kullanıcıya özetle ve dur.
