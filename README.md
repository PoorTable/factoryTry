# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## AI service layer (local dev)

The AI features (garment tagging, coach chat, outfit suggestions, palette analysis) run through [Expo Router API routes](https://docs.expo.dev/router/reference/api-routes/) under `src/app/api/` (`web.output: "server"` in `app.json`), so the Anthropic key stays server-side. Screens never call `fetch` directly — they go through the typed client in `src/services/ai/client.ts` (zod-validated responses, 15s timeout, typed `network | rate-limit | parse | server` errors).

### Running the API routes

`npx expo start` serves the API routes alongside the app at `http://localhost:8081`:

```bash
npx expo start
curl http://localhost:8081/api/health            # → {"ok":true}
curl -X POST http://localhost:8081/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What should I wear tonight?"}'
```

### Environment variables (`.env`, gitignored — never commit it)

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Server-only Claude key, read inside API routes. Never exposed to the client bundle — do not prefix it with `EXPO_PUBLIC_`. |
| `EXPO_PUBLIC_API_URL` | Origin the app uses to reach the dev server from a physical device (e.g. `http://192.168.1.20:8081`). Simulators and web fall back to the Metro host automatically. |
| `EXPO_PUBLIC_AI_MOCK` | Set to `1` to enable mock mode: routes return canned design-handoff fixtures (garment tag set, the "Quiet luxury" outfit reply, the "Warm Autumn" palette) without a live key. |

Mock mode example:

```bash
EXPO_PUBLIC_AI_MOCK=1 npx expo start
```

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
