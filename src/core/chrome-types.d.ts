// GENERATED from schema/chrome-schema.json — do not edit; npm run generate:types
// Schema version: 2

/**
 * Chrome (UI surface) configuration for an embedded Querri app, v2 vocabulary.
 *
 * Every key is optional; omitted keys keep the runtime default. The runtime
 * REPLACES the customer config layer on `updateConfig`, so send the whole
 * object, not a patch.
 */
export interface QuerriChromeConfig {
  rail?: {
    /** @default false */
    show?: boolean;
    /** @default true Depends on `rail.show`. */
    logo?: boolean;
    /** @default false Depends on `rail.show`. */
    orgSwitcher?: boolean;
    /** @default true Depends on `rail.show`. */
    workspaceSwitcher?: boolean;
    /** @default true Depends on `rail.show`. */
    scopeLine?: boolean;
    /** @default true Depends on `rail.show`. */
    account?: boolean;
    /** @default true Depends on `rail.account`. */
    signOut?: boolean;
    /** @default true Depends on `rail.show`. */
    collapsible?: boolean;
    /** @default "expanded" Depends on `!rail.collapsible`. */
    lockState?: 'expanded' | 'collapsed';
    /** @default true Depends on `rail.show`. */
    recents?: boolean;
    branding?: {
      /** @default "" Depends on `rail.show`. */
      iconUrl?: string;
      /** @default "" Depends on `rail.show`. */
      logoUrl?: string;
      /** @default "" Depends on `rail.show`. */
      backgroundColor?: string;
      /** @default false Depends on `rail.show`. */
      backgroundTransparent?: boolean;
    };
    items?: {
      /** @default true Depends on `rail.show`. */
      newChat?: boolean;
      /** @default true Depends on `rail.show`. */
      history?: boolean;
      /** @default false Depends on `rail.show`. */
      connect?: boolean;
      /** @default true Depends on `rail.show`. */
      search?: boolean;
      /** @default true Depends on `rail.show`. */
      library?: boolean;
      /** @default true Depends on `rail.show`. */
      projects?: boolean;
      /** @default true Depends on `rail.show`. */
      dashboards?: boolean;
      /** @default false Depends on `rail.show`. */
      inbox?: boolean;
      /** @default true Depends on `rail.show`. */
      uploads?: boolean;
      /** @default false */
      admin?: boolean;
    };
  };
  header?: {
    /** @default true */
    show?: boolean;
    /** @default true Depends on `header.show`. */
    title?: boolean;
    /** @default true Depends on `header.show`. */
    dataflow?: boolean;
    /** @default false Depends on `header.show`. */
    share?: boolean;
    /** @default false Depends on `header.show`. */
    print?: boolean;
    /** @default true Depends on `header.show`. */
    addProject?: boolean;
    /** @default true Depends on `header.show`. */
    newChat?: boolean;
    /** @default false Depends on `header.show`. */
    expand?: boolean;
    /** @default false Depends on `header.show`. */
    viewModeToggle?: boolean;
    /** @default false Depends on `header.show`. */
    automate?: boolean;
    /** @default false Depends on `header.show`. */
    settings?: boolean;
    /** @default false Depends on `header.show`. */
    menu?: boolean;
  };
  chat?: {
    dock?: {
      /** @default true */
      show?: boolean;
    };
    composer?: {
      /** @default true */
      scopeBar?: boolean;
      /** @default true Depends on `chat.composer.scopeBar`. */
      scopeSwitch?: boolean;
      /** @default "" */
      placeholder?: string;
      /** @default true */
      dictation?: boolean;
      /** @default true */
      voice?: boolean;
      /** @default true */
      thinkLonger?: boolean;
      /** @default false */
      uiDriving?: boolean;
      /** @default false Depends on `chat.composer.uiDriving`. */
      uiDrivingDefault?: boolean;
      /** @default true */
      promptQueue?: boolean;
    };
    /** @default false */
    history?: boolean;
    dataflow?: {
      /** @default true */
      show?: boolean;
      /** @default false Depends on `chat.dataflow.show`. */
      defaultOpen?: boolean;
    };
    /** @default false Depends on `chat.dock.show`. */
    focusMode?: boolean;
    /** @default false */
    fullWidth?: boolean;
    /** @default true */
    approvals?: boolean;
    /** @default "" */
    initialPrompt?: string;
    /** @default false Depends on `chat.initialPrompt`. */
    autoStart?: boolean;
    dockSizes?: {
      /** @default 0 Depends on `chat.dock.show`. */
      ask?: number;
      /** @default 0 Depends on `chat.dock.show`. */
      main?: number;
    };
    display?: {
      /** @default true */
      tables?: boolean;
      /** @default true */
      charts?: boolean;
      /** @default true */
      reports?: boolean;
      /** @default true */
      metrics?: boolean;
      /** @default true */
      suggestions?: boolean;
      /** @default true */
      clarifications?: boolean;
      /** @default true */
      choices?: boolean;
      /** @default true */
      plans?: boolean;
      /** @default true */
      reasoning?: boolean;
      /** @default true */
      displayMessages?: boolean;
      /** @default true */
      actionCards?: boolean;
      /** @default true */
      toolActivity?: boolean;
      /** @default true */
      copy?: boolean;
      /** @default true */
      share?: boolean;
      /** @default true */
      print?: boolean;
      /** @default true */
      rerun?: boolean;
      /** @default true */
      feedback?: boolean;
      /** @default true */
      regenerate?: boolean;
      /** @default true */
      edit?: boolean;
      /** @default true */
      tts?: boolean;
      /** @default true */
      citations?: boolean;
      /** @default true */
      followups?: boolean;
      /** @default true */
      emptyStateSuggestions?: boolean;
      /** @default true */
      downloads?: boolean;
      /** @default [] */
      hiddenTools?: string[];
      /** @default false */
      simpleMode?: boolean;
      /** @default "full" */
      stepResultsMode?: 'full' | 'minified' | 'hidden';
      /** @default false */
      responseAboveResults?: boolean;
    };
    reasoning?: {
      /** @default true */
      merged?: boolean;
      /** @default false */
      startExpanded?: boolean;
    };
    welcome?: {
      /** @default "" */
      title?: string;
      /** @default "" */
      subtitle?: string;
      /** @default [] */
      placeholders?: string[];
      /** @default [] */
      promptButtons?: Array<{ id?: string; label: string; prompt: string }>;
      /** @default true */
      libraryInfo?: boolean;
      /** @default true */
      greeting?: boolean;
      /** @default true Depends on `chat.welcome.libraryInfo`. */
      scopePill?: boolean;
      /** @default true */
      suggestions?: boolean;
    };
  };
  global?: {
    /** @default false */
    commandPalette?: boolean;
    /** @default true */
    toasts?: boolean;
    /** @default "bottom-right" Depends on `global.toasts`. */
    toastPosition?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
    /** @default true */
    uploads?: boolean;
    /** @default true */
    contextMenu?: boolean;
    /** @default true */
    connectorProgress?: boolean;
    /** @default true */
    mobileDrawer?: boolean;
    /** @default false */
    keyboardShortcuts?: boolean;
    /** @default "replace-only" */
    historyMode?: 'replace-only' | 'push';
    /** @default false */
    openInQuerri?: boolean;
    /** @default false */
    pwaPrompt?: boolean;
    /** @default false */
    debugPanel?: boolean;
    /** @default false */
    inviteLanding?: boolean;
    /** @default false */
    onboarding?: boolean;
  };
  library?: {
    sidebar?: {
      /** @default true */
      show?: boolean;
      sections?: {
        /** @default true Depends on `library.sidebar.show`. */
        quickAccess?: boolean;
        /** @default true Depends on `library.sidebar.show`. */
        knowledge?: boolean;
        /** @default true Depends on `library.sidebar.show`. */
        folders?: boolean;
        /** @default true Depends on `library.sidebar.show`. */
        collections?: boolean;
        /** @default true Depends on `library.sidebar.show`. */
        connectors?: boolean;
        /** @default true Depends on `library.sidebar.show`. */
        tags?: boolean;
        /** @default true Depends on `library.sidebar.show`. */
        taxonomies?: boolean;
        /** @default false Depends on `library.sidebar.show`. */
        members?: boolean;
      };
    };
    tabs?: {
      /** @default true */
      collections?: boolean;
      /** @default true */
      files?: boolean;
      /** @default true */
      views?: boolean;
      /** @default true */
      questions?: boolean;
      /** @default true */
      kpis?: boolean;
      /** @default true */
      facts?: boolean;
    };
    /** @default true */
    canvas?: boolean;
    /** @default true */
    search?: boolean;
    /** @default true Depends on `library.search`. */
    searchModes?: boolean;
    /** @default true */
    filterBar?: boolean;
    /** @default true */
    upload?: boolean;
    create?: {
      /** @default true */
      folder?: boolean;
      /** @default true */
      tag?: boolean;
      /** @default true */
      collection?: boolean;
    };
    /** @default false */
    share?: boolean;
    connectors?: {
      /** @default true */
      browse?: boolean;
      /** @default false Depends on `library.connectors.browse`. */
      add?: boolean;
    };
    assetActions?: {
      /** @default true */
      open?: boolean;
      /** @default true */
      openInNewTab?: boolean;
      /** @default false */
      openExternal?: boolean;
      /** @default true */
      download?: boolean;
      /** @default true */
      resync?: boolean;
      /** @default true */
      rename?: boolean;
      /** @default true */
      replace?: boolean;
      /** @default true */
      createProject?: boolean;
      /** @default true */
      cut?: boolean;
      /** @default true */
      favorite?: boolean;
      /** @default true */
      move?: boolean;
      /** @default true */
      collection?: boolean;
      /** @default true */
      tag?: boolean;
      /** @default true */
      reprocess?: boolean;
      /** @default true */
      trash?: boolean;
      /** @default true */
      restore?: boolean;
      /** @default true */
      purge?: boolean;
      /** @default false */
      share?: boolean;
    };
    /** @default true */
    bulkActions?: boolean;
  };
  projects?: {
    list?: {
      /** @default false */
      create?: boolean;
      /** @default false */
      import?: boolean;
      /** @default false */
      edit?: boolean;
      /** @default false */
      delete?: boolean;
      /** @default false */
      bulkSelect?: boolean;
      /** @default false */
      leave?: boolean;
    };
  };
  dashboard?: {
    /** @default true */
    header?: boolean;
    /** @default true */
    share?: boolean;
    /** @default true */
    automate?: boolean;
    /** @default true */
    editMode?: boolean;
    /** @default true Depends on `dashboard.editMode`. */
    undoRedo?: boolean;
    /** @default true */
    viewportToggle?: boolean;
    /** @default true Depends on `dashboard.header`. */
    menubar?: boolean;
    /** @default true Depends on `dashboard.editMode`. */
    palette?: boolean;
    /** @default true Depends on `dashboard.editMode`. */
    properties?: boolean;
    /** @default false */
    aiChat?: boolean;
    /** @default true Depends on `dashboard.share`. */
    embedLinks?: boolean;
    widget?: {
      /** @default false */
      download?: boolean;
      /** @default true */
      expand?: boolean;
      /** @default false */
      viewProject?: boolean;
    };
    list?: {
      /** @default true */
      create?: boolean;
      /** @default true */
      edit?: boolean;
      /** @default true */
      delete?: boolean;
      /** @default true */
      leave?: boolean;
      /** @default true */
      bulk?: boolean;
    };
  };
  xls?: {
    /** @default false */
    editing?: boolean;
    /** @default false Depends on `xls.editing`. */
    ribbon?: boolean;
    /** @default true */
    formulaBar?: boolean;
    /** @default true */
    sheetBar?: boolean;
  };
  print?: {
    /** @default false */
    autoTrigger?: boolean;
  };
  settings?: {
    /** @default false */
    show?: boolean;
    /** @default [] Depends on `settings.show`. */
    sections?: string[];
  };
}

/** Theme overrides applied to the embedded application. */
export interface QuerriThemeConfig {
  /** @default "" */
  name?: '' | 'querri' | 'querri-dark' | 'night';
  /** @default {} */
  colors?: Record<string, string>;
  /** @default "" */
  radius?: string;
  /** @default "" */
  fontFamily?: string;
}

/** Privacy controls for analytics/telemetry inside the embed. */
export interface QuerriPrivacyConfig {
  /** @default false */
  sessionReplay?: boolean;
  /** @default false */
  identify?: boolean;
  /** @default true */
  errorReporting?: boolean;
}

/**
 * What the runtime actually applied on init/updateConfig, and what it changed
 * on the way. Each list carries one entry per affected key (typically with a
 * `path` and a reason); lists are omitted when empty.
 */
export interface QuerriConfigChanges {
  upgraded?: Array<Record<string, unknown>>;
  dropped?: Array<Record<string, unknown>>;
  inherited?: Array<Record<string, unknown>>;
  coupled?: Array<Record<string, unknown>>;
  capped?: Array<Record<string, unknown>>;
  pinned?: Array<Record<string, unknown>>;
  truncated?: Array<Record<string, unknown>>;
}

/** Payload of the `'config'` event (runtime message `config-applied`). */
export interface QuerriConfigAppliedEvent {
  type?: 'config-applied';
  schemaVersion: number;
  changes: QuerriConfigChanges;
}
