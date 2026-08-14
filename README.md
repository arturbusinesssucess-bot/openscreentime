# OpenScreenTime

App de código aberto para acompanhar quanto tempo você passa no computador e no celular, app por app — no estilo StayFree / RescueTime / Scolect. Local-first por padrão (os dados ficam só no seu dispositivo); sincronizar entre desktop e Android é opcional, via login.

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

Isso abre a janela do Electron com o dashboard: "Hoje", "Últimos 7 dias", "Limites" (defina um tempo máximo por app e receba uma notificação ao estourar) e "Conta" (login opcional para sincronizar com o Android).

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
- [`@supabase/supabase-js`](https://supabase.com/docs/reference/javascript) para o sync opcional (aba "Conta")

## Sincronização (opcional)

Por padrão o app só grava dados localmente. Ao entrar com uma conta na aba "Conta", cada dispositivo envia o próprio uso (marcado como `desktop` ou `android`) para uma tabela no Supabase protegida por row level security — cada usuário só enxerga as próprias linhas. Clicar em "Sincronizar agora" envia os dados locais e baixa o total combinado de todos os dispositivos logados na mesma conta.

## Android

Usa a API `UsageStatsManager` do Android (a mesma que o app nativo de "Bem-estar digital" usa) para mostrar o tempo de uso de cada app hoje. Não precisa de serviço de acessibilidade nem root — só a permissão "Acesso a dados de uso", concedida manualmente em Ajustes. Tem a mesma aba "Conta" do desktop para sincronizar com a mesma conta.

> **Nota:** o código do Android foi escrito mas **não foi compilado nem testado** — não há Android SDK/Gradle disponível na máquina onde este projeto foi desenvolvido. Ao abrir no Android Studio, revise principalmente `SyncRepository.kt` (API do supabase-kt) antes de confiar no build.

### Build

Abra a pasta `android/` no [Android Studio](https://developer.android.com/studio) (versão Ladybug ou mais recente) e rode o app num emulador ou dispositivo com Android 8.0 (API 26) ou superior. O Android Studio gera o `gradle-wrapper.jar` automaticamente na primeira sincronização.

### Stack

- Kotlin + Jetpack Compose + Material 3
- `UsageStatsManager` (sem dependências de terceiros para o rastreamento)
- [`supabase-kt`](https://github.com/supabase-community/supabase-kt) para o sync opcional (aba "Conta")

## Roadmap

- [x] Limites diários de uso por app com notificação
- [x] Categorização de apps (produtividade, redes sociais, etc.)
- [x] Exportar dados (CSV/JSON)
- [x] Sincronizar dados entre desktop e Android (via Supabase, opcional)
- [ ] Bloqueio automático de apps ao estourar o limite (hoje só notifica)

## Licença

MIT — veja [LICENSE](LICENSE). Contribuições são bem-vindas via pull request.
