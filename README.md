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

## AI runtime (on-device, offline)

The AI features (garment tagging, coach chat, outfit suggestions, palette analysis) run entirely **on-device** through [`react-native-executorch`](https://docs.swmansion.com/react-native-executorch/). There is no server, no API key, no per-request cost, and no network requirement once the models are cached. Screens consume the runtime through `useAi()` from `src/services/ai/client.ts` — a React provider exposing imperative `identify() / coach() / palette()` methods that return the same `AiResult<T>` discriminated union the previous fetch client used.

### Running on a device (EAS development build)

ExecuTorch ships native code that cannot load in **Expo Go**. You need an **EAS development build** (a "dev client") on a real device or a properly prebuilt simulator:

```bash
# One-time: build a dev client for your platform
npx eas build --profile development --platform ios
# (or)
npx eas build --profile development --platform android

# Day-to-day: start Metro and open the dev client on the device
npx expo start --dev-client
```

The first launch downloads the default models listed in `src/services/ai/models.ts` (**Llama 3.2 1B** for chat, **CLIP ViT-B/32** for vision) into the app sandbox via `expo-file-system`; subsequent launches are instant. Devices below the RAM floor declared in the registry fall back to mock mode automatically.

### Mock mode (`EXPO_PUBLIC_AI_MOCK=1`)

For web, the iOS simulator, CI, and the factory reviewer's screenshot pass, the provider returns the design-handoff fixtures from `src/services/ai/server/fixtures.ts` (garment tag set, "Quiet luxury" outfit reply, "Warm Autumn" palette) instead of loading the on-device models. Trigger it explicitly with:

```bash
EXPO_PUBLIC_AI_MOCK=1 npx expo start --dev-client
```

### Environment variables (`.env`, gitignored — never commit it)

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_AI_MOCK` | Set to `1` to force mock mode: the provider returns canned design-handoff fixtures (garment tag set, "Quiet luxury" outfit reply, "Warm Autumn" palette) without loading on-device models. Used for the iOS simulator, web, CI, and reviewer screenshots. |

> **Removed in APP-35:** `ANTHROPIC_API_KEY` and `EXPO_PUBLIC_API_URL` are no longer required — the Claude/server scaffold from APP-28 was decommissioned in favour of the on-device runtime. If your local `.env` still has them, you can delete them.

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
