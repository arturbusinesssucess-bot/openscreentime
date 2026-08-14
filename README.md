# OpenScreenTime

App de código aberto para acompanhar quanto tempo você passa no computador e no celular, app por app — no estilo StayFree / RescueTime / Scolect, mas open source e com seus dados guardados localmente (nada sai do seu dispositivo).

## Estrutura do repositório

```
openscreentime/
├── desktop/   # App Windows/macOS/Linux (Electron + React + TypeScript)
└── android/   # App Android (Kotlin + Jetpack Compose)
```

## Desktop

Rastreia a janela/aplicativo ativo em primeiro plano a cada 2 segundos (pausando quando você fica ocioso por mais de 60s) e guarda os totais por app e por dia localmente, em `%APPDATA%/openscreentime-desktop/usage.json`.

### Rodar em desenvolvimento

```bash
cd desktop
npm install
npm run dev
```

Isso abre a janela do Electron com o dashboard ("Hoje" e "Últimos 7 dias").

### Gerar instalador

```bash
cd desktop
npm run dist
```

> **Nota:** se a instalação do pacote `electron` falhar em extrair o binário (comum quando o antivírus intercepta a extração do zip), baixe manualmente o zip do Electron correspondente à versão em `package.json` e extraia o conteúdo para `desktop/node_modules/electron/dist/`, criando também um arquivo `desktop/node_modules/electron/path.txt` contendo `electron.exe`.

### Stack

- Electron + Vite + React + TypeScript
- [`active-win`](https://www.npmjs.com/package/active-win) para detectar a janela ativa
- Armazenamento local em JSON (sem dependências nativas compiladas)

## Android

Usa a API `UsageStatsManager` do Android (a mesma que o app nativo de "Bem-estar digital" usa) para mostrar o tempo de uso de cada app hoje. Não precisa de serviço de acessibilidade nem root — só a permissão "Acesso a dados de uso", concedida manualmente em Ajustes.

### Build

Abra a pasta `android/` no [Android Studio](https://developer.android.com/studio) (versão Ladybug ou mais recente) e rode o app num emulador ou dispositivo com Android 8.0 (API 26) ou superior. O Android Studio gera o `gradle-wrapper.jar` automaticamente na primeira sincronização.

### Stack

- Kotlin + Jetpack Compose + Material 3
- `UsageStatsManager` (nenhuma dependência de terceiros)

## Roadmap

- [ ] Sincronizar dados entre desktop e Android (hoje são independentes)
- [ ] Limites diários de uso por app com notificação/bloqueio
- [ ] Categorização de apps (produtividade, redes sociais, etc.)
- [ ] Exportar dados (CSV/JSON)

## Licença

MIT — veja [LICENSE](LICENSE). Contribuições são bem-vindas via pull request.
