export type Locale = "ru" | "en";

export function normalizeLocale(value: string | null | undefined): Locale {
  return value === "en" ? "en" : "ru";
}

export const localeCookieName = "aura_locale";

export function cookieLocaleHeader(locale: Locale) {
  return `${localeCookieName}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export const copy = {
  ru: {
    nav: {
      dashboard: "Кабинет",
      image: "AI image",
      instructions: "Инструкции",
      settings: "Настройки",
      pricing: "Тарифы",
      apiDocs: "API docs",
      login: "Войти",
      register: "Регистрация",
      logout: "Выйти"
    },
    common: {
      copy: "Скопировать",
      copied: "Скопировано",
      loading: "Загрузка...",
      save: "Сохранить",
      cancel: "Отмена",
      close: "Закрыть",
      search: "Поиск",
      all: "Все",
      openCabinet: "Открыть кабинет",
      openPricing: "Наши цены",
      faq: "FAQ",
      support: "Поддержка",
      created: "Создано",
      updated: "Обновлено",
      noData: "Нет данных"
    },
    auth: {
      loginTitle: "Вход в AuraAI",
      loginSubtitle: "Используйте email и пароль для входа",
      registerTitle: "Создание аккаунта",
      registerSubtitle: "Создайте ваш аккаунт AuraAI",
      email: "Email",
      password: "Пароль",
      confirmPassword: "Подтверждение пароля",
      loginAction: "Войти",
      loginLoading: "Входим...",
      registerAction: "Создать аккаунт",
      registerLoading: "Создаём...",
      noAccount: "Нет аккаунта?",
      hasAccount: "Уже есть аккаунт?",
      registerLink: "Зарегистрироваться",
      loginLink: "Войти",
      passwordMismatch: "Пароли не совпадают"
    },
    landing: {
      badge: "Безлимитный Codex по API ключу",
      headline: "OpenAI-совместимый AI proxy для IDE и Codex",
      subtitle:
        "AuraAI даёт единый /v1 endpoint, токен-биллинг, логи запросов, личный кабинет и готовые интеграции для Codex, VS Code, Cursor, JetBrains, Zed и других клиентов.",
      ctaPrimary: "Открыть кабинет",
      ctaSecondary: "Инструкции",
      ideLabel: "Поддерживаемые клиенты",
      terminalTitle: "Быстрый старт",
      featuresTitle: "Возможности",
      privacyTitle: "Приватность",
      privacyText:
        "История и проекты остаются у вас. В платформе сохраняются только технические метрики запросов, нужные для биллинга, лимитов и диагностики.",
      howTitle: "Как это работает",
      faqTitle: "Что чаще всего хотят узнать",
      plansTitle: "Пополняете баланс. Чем выше сумма, тем больше бонус.",
      footer: ["Контакты", "Политика конфиденциальности", "Публичная оферта", "Политика возврата"],
      features: [
        {
          step: "ШАГ 1",
          title: "Получаете API ключ",
          text: "После регистрации создаётся персональный ключ вида aura_live_..."
        },
        {
          step: "ШАГ 2",
          title: "Подключаете IDE",
          text: "Codex, VS Code, Cursor, JetBrains и другие клиенты работают через OpenAI-compatible endpoint."
        },
        {
          step: "ШАГ 3",
          title: "Контролируете расход",
          text: "В кабинете доступны баланс, списания, логи, фильтры по моделям и transport."
        },
        {
          step: "ШАГ 4",
          title: "Работаете дешевле",
          text: "Гибкие тарифы и коэффициенты снижают стоимость 1M токенов."
        }
      ],
      faq: [
        {
          q: "Как это вообще работает?",
          a: "Вы используете base URL этого сайта и персональный API key. Запросы идут через AuraAI backend с учётом тарифов и токен-биллинга."
        },
        {
          q: "Нужно ли что-то поднимать на своём сервере?",
          a: "Нет. Достаточно зарегистрироваться, создать ключ и подключить клиент по инструкции."
        },
        {
          q: "Какие IDE поддерживаются?",
          a: "VS Code, Codex Desktop, Codex CLI, Cursor, JetBrains, Zed, OpenCode и OpenClaw."
        },
        {
          q: "Что будет, если баланс закончится?",
          a: "Новые запросы вернут 402 insufficient_balance. После пополнения можно продолжать сразу."
        }
      ]
    },
    dashboard: {
      title: "Личный кабинет",
      bonusBanner: "Для вас доступен бонус 5 млн",
      bonusAction: "Подтвердить Telegram",
      stats: {
        tokens: "Токенов",
        requests7d: "Запросы за 7 дней",
        tokens7d: "Токены за 7 дней",
        openaiSpend: "Потратили бы по API OpenAI"
      },
      topup: "Пополнить токены",
      keyTitle: "API key",
      keyPlaceholder: "Нет активного ключа",
      createKey: "Создать ключ",
      revealKey: "Показать",
      hideKey: "Скрыть",
      copyKey: "Скопировать",
      usageChart: "Потрачено токенов за 7 дней",
      billingRules: "Как списываются токены",
      billingHint: "Кэш учитывается полностью, за него 100% списание.",
      logs: "Полные логи запросов",
      logsSubtitle: "История запросов с фильтрами, transport и временем ответа",
      table: {
        time: "Время",
        model: "Модель",
        transport: "Транспорт",
        status: "Статус",
        tokens: "Токены",
        error: "Ошибка",
        endpoint: "Endpoint",
        latency: "Latency",
        cost: "Списание"
      },
      filters: {
        query: "Модель/endpoint",
        transport: "Транспорт",
        status: "Статус",
        pageSize: "Строк",
        reset: "Сбросить"
      },
      topupModal: {
        title: "Пополнение баланса",
        amount: "Сумма пополнения",
        provider: "Провайдер оплаты",
        total: "Итого",
        bonus: "Бонус",
        effective: "Эквивалент",
        next: "Перейти к оплате",
        adminMode: "Режим администратора",
        self: "Пополнить себе",
        other: "Пополнить другому",
        username: "Email пользователя",
        grantReason: "Причина",
        grantAction: "Начислить токены",
        grantAmount: "Сумма токенов",
        createError: "Не удалось создать платёж",
        grantError: "Не удалось начислить токены",
        grantSuccess: "Токены начислены"
      }
    },
    image: {
      title: "AI chat with image",
      subtitle: "История хранится 12 часов",
      newChat: "Новый чат",
      history: "История",
      empty: "Что создадим сегодня?",
      placeholder: "Опиши задачу или загрузи изображение...",
      imageMode: "Генерация изображений",
      chatMode: "Обычный чат",
      send: "Отправить",
      typing: "Модель отвечает...",
      upload: "Загрузить изображение",
      uploaded: "Изображение загружено для редактирования",
      tokens: "Списано токенов",
      modeHelpChat: "Режим чата использует /v1/responses",
      modeHelpImage: "Режим изображений использует gpt-image-2",
      role: {
        user: "Пользователь",
        assistant: "Ассистент",
        system: "Система"
      }
    },
    instructions: {
      title: "Инструкции",
      warn: "Не вставляйте API ключ напрямую в дефолтный OpenAI provider клиента.",
      subtitle: "Используйте endpoint этого сайта и готовые сценарии подключения.",
      choose: "Выбери provider / IDE",
      os: "Доступные ОС",
      shortScript: "Краткий скрипт",
      fullScript: "Полный скрипт",
      uninstall: "Отключиться от проекта",
      troubleshoot: "Troubleshooting",
      providerInfo: "Параметры провайдера",
      providerId: "ID провайдера",
      providerName: "Название",
      apiKey: "API key",
      baseUrl: "Base endpoint",
      modelsEndpoint: "Endpoint моделей",
      chatEndpoint: "Chat endpoint",
      responsesEndpoint: "Responses endpoint",
      codexEndpoint: "Codex endpoint",
      wsEndpoint: "WebSocket endpoint",
      modelsAllowed: "Разрешённые модели",
      manualTitle: "Ручные шаги",
      restoreTitle: "Restore / uninstall",
      restoreText:
        "Команда удаляет только наши provider/env/config записи. Чаты, проекты и локальная история не трогаются."
    },
    settings: {
      title: "Настройки",
      account: "Безопасность аккаунта",
      changePassword: "Смена пароля",
      apiKeyInfo: "API key",
      sessionInfo: "Текущая сессия",
      language: "Язык",
      theme: "Тема",
      telegram: "Telegram",
      currentPassword: "Текущий пароль",
      newPassword: "Новый пароль",
      repeatPassword: "Повторите пароль",
      updatePassword: "Сменить пароль",
      resetKey: "Сбросить API key",
      resetKeyHint: "Сброс отключит старые ключи и выдаст новый. Текущая браузерная сессия останется активной.",
      sessionEmail: "Email",
      sessionRole: "Роль",
      sessionBalance: "Баланс",
      saveProfile: "Сохранить профиль"
    }
  },
  en: {
    nav: {
      dashboard: "Dashboard",
      image: "AI image",
      instructions: "Instructions",
      settings: "Settings",
      pricing: "Pricing",
      apiDocs: "API docs",
      login: "Login",
      register: "Register",
      logout: "Logout"
    },
    common: {
      copy: "Copy",
      copied: "Copied",
      loading: "Loading...",
      save: "Save",
      cancel: "Cancel",
      close: "Close",
      search: "Search",
      all: "All",
      openCabinet: "Open dashboard",
      openPricing: "Pricing",
      faq: "FAQ",
      support: "Support",
      created: "Created",
      updated: "Updated",
      noData: "No data"
    },
    auth: {
      loginTitle: "Login to AuraAI",
      loginSubtitle: "Use email and password to continue",
      registerTitle: "Create account",
      registerSubtitle: "Create your AuraAI account",
      email: "Email",
      password: "Password",
      confirmPassword: "Confirm password",
      loginAction: "Login",
      loginLoading: "Logging in...",
      registerAction: "Create account",
      registerLoading: "Creating...",
      noAccount: "No account?",
      hasAccount: "Already have an account?",
      registerLink: "Register",
      loginLink: "Login",
      passwordMismatch: "Passwords do not match"
    },
    landing: {
      badge: "Unlimited Codex via API key",
      headline: "OpenAI-compatible AI proxy for IDEs and Codex",
      subtitle:
        "AuraAI gives you a single /v1 endpoint, token billing, request logs, private dashboard and ready integrations for Codex, VS Code, Cursor, JetBrains, Zed and more.",
      ctaPrimary: "Open dashboard",
      ctaSecondary: "Instructions",
      ideLabel: "Supported clients",
      terminalTitle: "Quick setup",
      featuresTitle: "Capabilities",
      privacyTitle: "Privacy",
      privacyText:
        "History and projects stay on your side. The platform stores only technical metrics required for billing, limits and diagnostics.",
      howTitle: "How it works",
      faqTitle: "Frequently asked questions",
      plansTitle: "Top up balance. The bigger amount, the bigger bonus.",
      footer: ["Contacts", "Privacy policy", "Public offer", "Refund policy"],
      features: [
        {
          step: "STEP 1",
          title: "Get API key",
          text: "After registration you receive a personal key in aura_live_... format."
        },
        {
          step: "STEP 2",
          title: "Connect your IDE",
          text: "Codex, VS Code, Cursor, JetBrains and other clients work through OpenAI-compatible endpoint."
        },
        {
          step: "STEP 3",
          title: "Control billing",
          text: "Dashboard provides balance, deductions, logs, model filters and transport metrics."
        },
        {
          step: "STEP 4",
          title: "Ship cheaper",
          text: "Flexible plans and multipliers reduce effective cost per 1M tokens."
        }
      ],
      faq: [
        {
          q: "How does this work?",
          a: "You use this site's base URL and your personal API key. Requests go through AuraAI backend with internal token billing."
        },
        {
          q: "Do I need my own server?",
          a: "No. Register, create API key and connect your client with ready instructions."
        },
        {
          q: "Which IDEs are supported?",
          a: "VS Code, Codex Desktop, Codex CLI, Cursor, JetBrains, Zed, OpenCode and OpenClaw."
        },
        {
          q: "What if balance is empty?",
          a: "New requests return 402 insufficient_balance. After top-up you can continue immediately."
        }
      ]
    },
    dashboard: {
      title: "Dashboard",
      bonusBanner: "You have 5M bonus available",
      bonusAction: "Verify Telegram",
      stats: {
        tokens: "Token balance",
        requests7d: "Requests (7d)",
        tokens7d: "Tokens (7d)",
        openaiSpend: "Estimated OpenAI spend"
      },
      topup: "Top up tokens",
      keyTitle: "API key",
      keyPlaceholder: "No active key",
      createKey: "Create key",
      revealKey: "Show",
      hideKey: "Hide",
      copyKey: "Copy",
      usageChart: "Token usage (7d)",
      billingRules: "Token billing rules",
      billingHint: "Cache is billed fully with 100% charge.",
      logs: "Request logs",
      logsSubtitle: "Request history with filters, transport and latency",
      table: {
        time: "Time",
        model: "Model",
        transport: "Transport",
        status: "Status",
        tokens: "Tokens",
        error: "Error",
        endpoint: "Endpoint",
        latency: "Latency",
        cost: "Charge"
      },
      filters: {
        query: "Model/endpoint",
        transport: "Transport",
        status: "Status",
        pageSize: "Rows",
        reset: "Reset"
      },
      topupModal: {
        title: "Top up balance",
        amount: "Top-up amount",
        provider: "Payment provider",
        total: "Total",
        bonus: "Bonus",
        effective: "Equivalent",
        next: "Proceed to payment",
        adminMode: "Admin mode",
        self: "Top up self",
        other: "Top up another user",
        username: "User email",
        grantReason: "Reason",
        grantAction: "Grant tokens",
        grantAmount: "Token amount",
        createError: "Failed to create payment",
        grantError: "Failed to grant tokens",
        grantSuccess: "Tokens granted"
      }
    },
    image: {
      title: "AI chat with image",
      subtitle: "History is stored for 12 hours",
      newChat: "New chat",
      history: "History",
      empty: "What should we create today?",
      placeholder: "Describe your task or upload an image...",
      imageMode: "Image generation",
      chatMode: "Regular chat",
      send: "Send",
      typing: "Model is typing...",
      upload: "Upload image",
      uploaded: "Image uploaded for edit",
      tokens: "Charged tokens",
      modeHelpChat: "Chat mode uses /v1/responses",
      modeHelpImage: "Image mode uses gpt-image-2",
      role: {
        user: "User",
        assistant: "Assistant",
        system: "System"
      }
    },
    instructions: {
      title: "Instructions",
      warn: "Do not paste API key directly into default OpenAI provider config.",
      subtitle: "Use this project's endpoint and ready setup scripts.",
      choose: "Choose provider / IDE",
      os: "Available OS",
      shortScript: "Short script",
      fullScript: "Full script",
      uninstall: "Disconnect project",
      troubleshoot: "Troubleshooting",
      providerInfo: "Provider details",
      providerId: "Provider ID",
      providerName: "Name",
      apiKey: "API key",
      baseUrl: "Base endpoint",
      modelsEndpoint: "Models endpoint",
      chatEndpoint: "Chat endpoint",
      responsesEndpoint: "Responses endpoint",
      codexEndpoint: "Codex endpoint",
      wsEndpoint: "WebSocket endpoint",
      modelsAllowed: "Allowed models",
      manualTitle: "Manual steps",
      restoreTitle: "Restore / uninstall",
      restoreText:
        "This command removes only our provider/env/config entries. Chats, projects and local history are not touched."
    },
    settings: {
      title: "Settings",
      account: "Account security",
      changePassword: "Change password",
      apiKeyInfo: "API key",
      sessionInfo: "Current session",
      language: "Language",
      theme: "Theme",
      telegram: "Telegram",
      currentPassword: "Current password",
      newPassword: "New password",
      repeatPassword: "Repeat password",
      updatePassword: "Update password",
      resetKey: "Reset API key",
      resetKeyHint: "Reset revokes old keys and creates a new one. Current browser session remains active.",
      sessionEmail: "Email",
      sessionRole: "Role",
      sessionBalance: "Balance",
      saveProfile: "Save profile"
    }
  }
} as const;

export function getCopy(locale: string | null | undefined) {
  return copy[normalizeLocale(locale)];
}

export type I18nCopy = ReturnType<typeof getCopy>;
