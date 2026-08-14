# OpenScreenTime

App de código aberto para acompanhar quanto tempo você passa no computador e no celular, app por app — no estilo StayFree / RescueTime / Scolect. É preciso criar uma conta (e-mail/senha via Supabase) para usar o app; isso é o que permite sincronizar o tempo de tela entre o desktop e o Android na mesma conta. O rastreamento em si continua todo local — a conta só existe para sincronização.

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

Isso abre a janela do Electron pedindo login/criação de conta. Depois de entrar, o dashboard tem: "Dashboard" (visão geral do dia), "Relatório" (tendências por período), "Limites" (defina um tempo máximo por app e receba uma notificação ao estourar) e "Conta" (sincronizar com o Android, sair).

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
- [`@supabase/supabase-js`](https://supabase.com/docs/reference/javascript) para autenticação e sincronização

## Conta e sincronização

O app exige login (e-mail/senha) antes de mostrar o dashboard — é a mesma conta usada nos dois dispositivos. O rastreamento continua 100% local (dados em `usage.json`); a conta só é usada para autenticação e, quando você clica em "Sincronizar agora" na aba "Conta", para enviar/baixar os totais de uso (marcados como `desktop` ou `android`) de uma tabela no Supabase protegida por row level security — cada usuário só enxerga as próprias linhas.

## Android

Usa a API `UsageStatsManager` do Android (a mesma que o app nativo de "Bem-estar digital" usa) para mostrar o tempo de uso de cada app hoje. Não precisa de serviço de acessibilidade nem root — só a permissão "Acesso a dados de uso", concedida manualmente em Ajustes. Também exige login (mesma conta do desktop) e tem a aba "Conta" para sincronizar.

> **Nota:** o código do Android foi escrito mas **não foi compilado nem testado** — não há Android SDK/Gradle disponível na máquina onde este projeto foi desenvolvido. Ao abrir no Android Studio, revise principalmente `SyncRepository.kt` (API do supabase-kt) antes de confiar no build.

### Build

Abra a pasta `android/` no [Android Studio](https://developer.android.com/studio) (versão Ladybug ou mais recente) e rode o app num emulador ou dispositivo com Android 8.0 (API 26) ou superior. O Android Studio gera o `gradle-wrapper.jar` automaticamente na primeira sincronização.

### Stack

- Kotlin + Jetpack Compose + Material 3
- `UsageStatsManager` (sem dependências de terceiros para o rastreamento)
- [`supabase-kt`](https://github.com/supabase-community/supabase-kt) para autenticação e sincronização

## Roadmap

- [x] Limites diários de uso por app com notificação
- [x] Categorização de apps (produtividade, redes sociais, etc.)
- [x] Exportar dados (CSV/JSON)
- [x] Login obrigatório + sincronizar dados entre desktop e Android (via Supabase)
- [ ] Bloqueio automático de apps ao estourar o limite (hoje só notifica)

## Licença

MIT — veja [LICENSE](LICENSE). Contribuições são bem-vindas via pull request.
