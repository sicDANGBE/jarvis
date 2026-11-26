import type {
  ExtensionViewOpenFile,
  DesktopExtensionViewInfo,
  OpenExtensionViewInput,
  ExtensionViewConnection,
  ExtensionViewMessage,
  ExtensionViewCatalogChange,
} from "./extension-views";
import type { RuntimeSettingsSnapshot } from "@jarvis/session-driver/runtime-types";
import type { ExtensionActionEffect, ExtensionActionRequest } from "./extension-actions";
import type {
  NavigateSessionTreeOptions,
  NavigateSessionTreeResult,
  SessionTreeSnapshot,
} from "@jarvis/session-driver/types";
import type { ClipboardImageRead } from "./composer-attachments";
import type { DesktopEditorList } from "./editors";
import type { SessionRef } from "@jarvis/session-driver/types";
import type { NetworkActivityEvent, NetworkActivityListener } from "./network";
import type { DesktopUser } from "./user";
import type { SaveTaskWorkbenchTemplateInput, TaskWorkbenchTemplate } from "./workbench";
import type {
  TurnChangesInput,
  TurnChangesResult,
  GetReviewInput,
  ReviewResult,
  ReviewFileInput,
  ReviewFileResult,
  SetReviewFileReviewedInput,
  SetReviewFileReviewedResult,
  ChangeReviewFileStageInput,
  ChangeReviewFileStageResult,
} from "./review";
import type {
  AppView,
  ComposerAttachment,
  CreateSessionInput,
  CreateWorktreeInput,
  DesktopAppState,
  ForkThreadInput,
  ModelSettingsScopeMode,
  NotificationPreferences,
  RemoveWorktreeInput,
  SendChildThreadFollowUpInput,
  SetChildSupervisionLoopInput,
  SelectedTranscriptPatch,
  SelectedTranscriptRecord,
  SessionExtensionUiUpdate,
  StartThreadInput,
  ThemePresetId,
  ThreadGrouping,
  WorkspaceSessionTarget,
  CreateScheduledTaskInput,
  UpdateScheduledTaskInput,
} from "./desktop-state";

export type DesktopNotificationPermissionStatus =
  "granted" | "denied" | "default" | "unsupported" | "unknown";

export interface CustomProviderModelConfig {
  readonly id: string;
  readonly contextWindow?: number;
  readonly reasoning?: boolean;
}

export interface CustomProviderConfig {
  readonly api?: "openai-completions" | "openai-responses" | "anthropic-messages";
  readonly providerId: string;
  readonly baseUrl: string;
  readonly apiKey?: string;
  readonly models: readonly CustomProviderModelConfig[];
}

export interface CustomProviderProbeInput {
  readonly api?: CustomProviderConfig["api"];
  readonly baseUrl: string;
  readonly apiKey?: string;
}

export type CustomProviderProbeResult =
  | { readonly ok: true; readonly models: readonly string[] }
  | { readonly ok: false; readonly error: string };

export type McpServerScope = "global" | "project";

/** An `mcp.json` server as Settings shows it; `env`, `headers` and `oauth` never leave main. */
export interface McpServerRecord {
  readonly name: string;
  readonly scope: McpServerScope;
  readonly transport: "stdio" | "http";
  readonly command?: string;
  readonly args?: readonly string[];
  readonly url?: string;
  /** What the server offers, in a sentence; pi shows it to the model with the server. */
  readonly description?: string;
  readonly enabled: boolean;
  /** Environment variables, headers or sign-in config are set; their values never leave main. */
  readonly hasHiddenSettings: boolean;
}

export interface McpServersSnapshot {
  /** The global mcp.json new servers are saved to, with the home directory shown as `~`. */
  readonly globalConfigPath: string;
  readonly servers: readonly McpServerRecord[];
  /** mcp.json files that could not be read, and servers pi skips, with why. */
  readonly errors: readonly string[];
  /** Whether pi's global `defaultTools` switches code mode on. */
  readonly codemodeAlwaysOn: boolean;
}

export type NewMcpServerInput = { readonly name: string; readonly description?: string } & (
  { readonly command: string; readonly args: readonly string[] } | { readonly url: string }
);

export const desktopIpc = {
  networkActivity: "jarvis:network-activity",
  getCurrentUser: "jarvis:get-current-user",
  getNetworkActivity: "jarvis:get-network-activity",
  extensionViewOpenFile: "jarvis:extension-view-open-file",
  listExtensionViews: "jarvis:list-extension-views",
  openExtensionView: "jarvis:open-extension-view",
  sendExtensionViewMessage: "jarvis:send-extension-view-message",
  closeExtensionView: "jarvis:close-extension-view",
  runExtensionAction: "jarvis:run-extension-action",
  extensionViewMessage: "jarvis:extension-view-message",
  extensionViewCatalogChanged: "jarvis:extension-view-catalog-changed",
  stateRequest: "jarvis:state-request",
  stateChanged: "jarvis:state-changed",
  getTaskWorkbenchTemplate: "jarvis:get-task-workbench-template",
  saveTaskWorkbenchTemplate: "jarvis:save-task-workbench-template",
  selectedTranscriptRequest: "jarvis:selected-transcript-request",
  selectedTranscriptChanged: "jarvis:selected-transcript-changed",
  selectedTranscriptResend: "jarvis:selected-transcript-resend",
  extensionUiChanged: "jarvis:extension-ui-changed",
  appCommand: "jarvis:app-command",
  workspacePicked: "jarvis:workspace-picked",
  clipboardImagePasted: "jarvis:clipboard-image-pasted",
  addWorkspacePath: "jarvis:add-workspace-path",
  listSshHosts: "jarvis:list-ssh-hosts",
  browseSshDirectory: "jarvis:browse-ssh-directory",
  pickWorkspace: "jarvis:pick-workspace",
  selectWorkspace: "jarvis:select-workspace",
  renameWorkspace: "jarvis:rename-workspace",
  removeWorkspace: "jarvis:remove-workspace",
  reorderWorkspaces: "jarvis:reorder-workspaces",
  reorderPinnedSessions: "jarvis:reorder-pinned-sessions",
  openWorkspaceInFinder: "jarvis:open-workspace-in-finder",
  listEditors: "jarvis:list-editors",
  setPreferredEditor: "jarvis:set-preferred-editor",
  openWorkspaceInEditor: "jarvis:open-workspace-in-editor",
  createWorktree: "jarvis:create-worktree",
  removeWorktree: "jarvis:remove-worktree",
  openSkillInFinder: "jarvis:open-skill-in-finder",
  openExtensionInFinder: "jarvis:open-extension-in-finder",
  syncCurrentWorkspace: "jarvis:sync-current-workspace",
  selectSession: "jarvis:select-session",
  renameSession: "jarvis:rename-session",
  archiveSession: "jarvis:archive-session",
  unarchiveSession: "jarvis:unarchive-session",
  markSessionRead: "jarvis:mark-session-read",
  setSessionPinned: "jarvis:set-session-pinned",
  createSession: "jarvis:create-session",
  startThread: "jarvis:start-thread",
  forkThread: "jarvis:fork-thread",
  sendChildThreadFollowUp: "jarvis:send-child-thread-follow-up",
  setChildSupervisionLoop: "jarvis:set-child-supervision-loop",
  createScheduledTask: "jarvis:create-scheduled-task",
  updateScheduledTask: "jarvis:update-scheduled-task",
  deleteScheduledTask: "jarvis:delete-scheduled-task",
  beginScheduledTaskInterview: "jarvis:begin-scheduled-task-interview",
  cancelCurrentRun: "jarvis:cancel-current-run",
  setActiveView: "jarvis:set-active-view",
  setSidebarCollapsed: "jarvis:set-sidebar-collapsed",
  setThreadGrouping: "jarvis:set-thread-grouping",
  setWorkspaceCollapsed: "jarvis:set-workspace-collapsed",
  refreshRuntime: "jarvis:refresh-runtime",
  setModelSettingsScopeMode: "jarvis:set-model-settings-scope-mode",
  setDefaultModel: "jarvis:set-default-model",
  setDefaultThinkingLevel: "jarvis:set-default-thinking-level",
  setSessionModel: "jarvis:set-session-model",
  setSessionThinkingLevel: "jarvis:set-session-thinking-level",
  loginProvider: "jarvis:login-provider",
  logoutProvider: "jarvis:logout-provider",
  setProviderApiKey: "jarvis:set-provider-api-key",
  listCustomProviders: "jarvis:list-custom-providers",
  setCustomProvider: "jarvis:set-custom-provider",
  deleteCustomProvider: "jarvis:delete-custom-provider",
  probeCustomProviderModels: "jarvis:probe-custom-provider-models",
  setEnableSkillCommands: "jarvis:set-enable-skill-commands",
  setScopedModelPatterns: "jarvis:set-scoped-model-patterns",
  setSkillEnabled: "jarvis:set-skill-enabled",
  setExtensionEnabled: "jarvis:set-extension-enabled",
  listMcpServers: "jarvis:list-mcp-servers",
  addMcpServer: "jarvis:add-mcp-server",
  removeMcpServer: "jarvis:remove-mcp-server",
  setMcpServerEnabled: "jarvis:set-mcp-server-enabled",
  setCodemodeAlwaysOn: "jarvis:set-codemode-always-on",
  respondToHostUiRequest: "jarvis:respond-to-host-ui-request",
  setNotificationPreferences: "jarvis:set-notification-preferences",
  setIntegratedTerminalShell: "jarvis:set-integrated-terminal-shell",
  setEnableTransparency: "jarvis:set-enable-transparency",
  terminalEnsurePanel: "jarvis:terminal-ensure-panel",
  terminalCreateSession: "jarvis:terminal-create-session",
  terminalSetActiveSession: "jarvis:terminal-set-active-session",
  terminalWrite: "jarvis:terminal-write",
  terminalResize: "jarvis:terminal-resize",
  terminalRestartSession: "jarvis:terminal-restart-session",
  terminalCloseSession: "jarvis:terminal-close-session",
  terminalSetTitle: "jarvis:terminal-set-title",
  terminalSetFocused: "jarvis:terminal-set-focused",
  sidePanelSetFocused: "jarvis:side-panel-set-focused",
  terminalData: "jarvis:terminal-data",
  terminalExit: "jarvis:terminal-exit",
  terminalError: "jarvis:terminal-error",
  getNotificationPermissionStatus: "jarvis:get-notification-permission-status",
  requestNotificationPermission: "jarvis:request-notification-permission",
  openSystemNotificationSettings: "jarvis:open-system-notification-settings",
  notificationPermissionStatusChanged: "jarvis:notification-permission-status-changed",
  pickComposerAttachments: "jarvis:pick-composer-attachments",
  readClipboardImage: "jarvis:read-clipboard-image",
  addComposerAttachments: "jarvis:add-composer-attachments",
  removeComposerAttachment: "jarvis:remove-composer-attachment",
  editQueuedComposerMessage: "jarvis:edit-queued-composer-message",
  cancelQueuedComposerEdit: "jarvis:cancel-queued-composer-edit",
  removeQueuedComposerMessage: "jarvis:remove-queued-composer-message",
  steerQueuedComposerMessage: "jarvis:steer-queued-composer-message",
  persistComposerDraft: "jarvis:persist-composer-draft",
  updateComposerDraft: "jarvis:update-composer-draft",
  flushPendingComposerDraft: "jarvis:flush-pending-composer-draft",
  pendingComposerDraftFlushed: "jarvis:pending-composer-draft-flushed",
  submitComposer: "jarvis:submit-composer",
  getSessionTree: "jarvis:get-session-tree",
  navigateSessionTree: "jarvis:navigate-session-tree",
  toggleWindowMaximize: "jarvis:toggle-window-maximize",
  minimizeWindow: "jarvis:minimize-window",
  closeWindow: "jarvis:close-window",
  listWorkspaceFiles: "jarvis:list-workspace-files",
  readWorkspaceFile: "jarvis:read-workspace-file",
  revealWorkspaceFile: "jarvis:reveal-workspace-file",
  getChangedFiles: "jarvis:get-changed-files",
  getFileDiff: "jarvis:get-file-diff",
  stageFile: "jarvis:stage-file",
  getTurnChanges: "jarvis:get-turn-changes",
  getReview: "jarvis:get-review",
  getReviewFile: "jarvis:get-review-file",
  setReviewFileReviewed: "jarvis:set-review-file-reviewed",
  changeReviewFileStage: "jarvis:change-review-file-stage",
  getThemeMode: "jarvis:get-theme-mode",
  getResolvedTheme: "jarvis:get-resolved-theme",
  setThemeMode: "jarvis:set-theme-mode",
  setThemePresetId: "jarvis:set-theme-preset-id",
  themeChanged: "jarvis:theme-changed",
  windowFocused: "jarvis:window-focused",
  ping: "app:ping",
  openExternal: "app:open-external",
  relaunchApplication: "jarvis:relaunch-application",
} as const;

export const desktopCommands = {
  openSettings: "open-settings",
  openNewThread: "open-new-thread",
  toggleTerminal: "toggle-terminal",
  toggleSidePanel: "toggle-side-panel",
  toggleReview: "toggle-review",
  newSidePanelTab: "new-side-panel-tab",
  closeFocusedSurface: "close-focused-surface",
  toggleSidebar: "toggle-sidebar",
  openCommandPalette: "open-command-palette",
  openFilePalette: "open-file-palette",
  renameThread: "rename-thread",
  archiveThread: "archive-thread",
  selectRecentThread1: "select-recent-thread-1",
  selectRecentThread2: "select-recent-thread-2",
  selectRecentThread3: "select-recent-thread-3",
  selectRecentThread4: "select-recent-thread-4",
  selectRecentThread5: "select-recent-thread-5",
  selectRecentThread6: "select-recent-thread-6",
  selectRecentThread7: "select-recent-thread-7",
  selectRecentThread8: "select-recent-thread-8",
  selectRecentThread9: "select-recent-thread-9",
  selectSidePanelTab1: "select-side-panel-tab-1",
  selectSidePanelTab2: "select-side-panel-tab-2",
  selectSidePanelTab3: "select-side-panel-tab-3",
  selectSidePanelTab4: "select-side-panel-tab-4",
  selectSidePanelTab5: "select-side-panel-tab-5",
  selectSidePanelTab6: "select-side-panel-tab-6",
  selectSidePanelTab7: "select-side-panel-tab-7",
  selectSidePanelTab8: "select-side-panel-tab-8",
  selectSidePanelTab9: "select-side-panel-tab-9",
} as const;

const RECENT_THREAD_COMMANDS = [
  desktopCommands.selectRecentThread1,
  desktopCommands.selectRecentThread2,
  desktopCommands.selectRecentThread3,
  desktopCommands.selectRecentThread4,
  desktopCommands.selectRecentThread5,
  desktopCommands.selectRecentThread6,
  desktopCommands.selectRecentThread7,
  desktopCommands.selectRecentThread8,
  desktopCommands.selectRecentThread9,
] as const;

export const THREAD_SHORTCUT_SLOT_COUNT = RECENT_THREAD_COMMANDS.length;

export function isRecentThreadCommand(command: PiDesktopCommand | undefined): boolean {
  return (RECENT_THREAD_COMMANDS as readonly (PiDesktopCommand | undefined)[]).includes(command);
}

const SIDE_PANEL_TAB_COMMANDS = [
  desktopCommands.selectSidePanelTab1,
  desktopCommands.selectSidePanelTab2,
  desktopCommands.selectSidePanelTab3,
  desktopCommands.selectSidePanelTab4,
  desktopCommands.selectSidePanelTab5,
  desktopCommands.selectSidePanelTab6,
  desktopCommands.selectSidePanelTab7,
  desktopCommands.selectSidePanelTab8,
  desktopCommands.selectSidePanelTab9,
] as const;

export const SIDE_PANEL_TAB_SHORTCUT_SLOT_COUNT = SIDE_PANEL_TAB_COMMANDS.length;

/** The zero-based side panel tab a command selects, or undefined for other commands. */
export function sidePanelTabIndex(command: PiDesktopCommand | undefined): number | undefined {
  const index = (SIDE_PANEL_TAB_COMMANDS as readonly (PiDesktopCommand | undefined)[]).indexOf(
    command,
  );
  return index < 0 ? undefined : index;
}

/**
 * The side panel tab modifier: Control on macOS, where Command switches threads,
 * and Alt elsewhere, where Control does. It must be the only modifier held.
 */
export function sidePanelTabModifierHeld(
  platform: NodeJS.Platform,
  input: {
    readonly meta: boolean;
    readonly control: boolean;
    readonly alt: boolean;
    readonly shift: boolean;
  },
): boolean {
  if (input.shift || input.meta) return false;
  return platform === "darwin" ? input.control && !input.alt : input.alt && !input.control;
}

/**
 * Control+1-9 on macOS and Alt+1-9 elsewhere select side panel tab N. Keypad
 * digits are left alone so Windows Alt codes keep typing characters.
 */
export function getSidePanelTabCommand(
  platform: NodeJS.Platform,
  input: {
    readonly meta: boolean;
    readonly control: boolean;
    readonly alt: boolean;
    readonly shift: boolean;
    readonly key: string;
    readonly code?: string;
  },
): PiDesktopCommand | undefined {
  if (!sidePanelTabModifierHeld(platform, input) || input.code?.startsWith("Numpad")) {
    return undefined;
  }
  const digit = input.code?.match(/^Digit([1-9])$/)?.[1] ?? input.key.match(/^[1-9]$/)?.[0];
  return digit ? SIDE_PANEL_TAB_COMMANDS[Number(digit) - 1] : undefined;
}

export function getSidePanelTabShortcutLabel(platform: NodeJS.Platform, slot: number): string {
  return `${platform === "darwin" ? "⌃" : "Alt+"}${slot}`;
}

export function getDesktopShortcutLabel(platform: NodeJS.Platform, key: string): string {
  return `${platform === "darwin" ? "⌘" : "Ctrl+"}${key.toUpperCase()}`;
}

export function formatShortcut(
  platform: NodeJS.Platform,
  key: string,
  modifiers: { readonly shift?: boolean; readonly alt?: boolean } = {},
): string {
  if (platform === "darwin") {
    return `${modifiers.alt ? "⌥" : ""}${modifiers.shift ? "⇧" : ""}⌘${key.toUpperCase()}`;
  }
  return `Ctrl+${modifiers.alt ? "Alt+" : ""}${modifiers.shift ? "Shift+" : ""}${key.toUpperCase()}`;
}

export function getSidePanelToggleShortcutLabel(platform: NodeJS.Platform): string {
  return platform === "darwin" ? "⌘⌥B" : "Ctrl+Alt+B";
}

// A state push leaves out the model catalog (`runtimeByWorkspace`) when it is unchanged
// since the last push to that window; the window keeps the one it has.
export type PiDesktopStatePush = Omit<DesktopAppState, "runtimeByWorkspace"> & {
  readonly runtimeByWorkspace?: DesktopAppState["runtimeByWorkspace"];
};
export type PiDesktopStateListener = (state: PiDesktopStatePush) => void;
export type PiDesktopSelectedTranscriptListener = (
  payload: SelectedTranscriptRecord | SelectedTranscriptPatch | null,
) => void;
export type PiDesktopExtensionUiListener = (update: SessionExtensionUiUpdate) => void;
export type PiDesktopCommand = (typeof desktopCommands)[keyof typeof desktopCommands];

export type ChangedFileStatus =
  "added" | "copied" | "deleted" | "modified" | "renamed" | "untracked";

export interface ChangedFileEntry {
  readonly path: string;
  readonly previousPath?: string;
  readonly stagingSourcePath?: string;
  readonly status: ChangedFileStatus;
  readonly staged: boolean;
}

export type ChangedFilesErrorCode =
  "git-status-failed" | "git-status-invalid" | "workspace-unavailable";

export interface ChangedFilesError {
  readonly code: ChangedFilesErrorCode;
  readonly message: string;
}

export type ChangedFilesResult =
  | {
      readonly state: "available";
      readonly files: readonly ChangedFileEntry[];
    }
  | {
      readonly state: "unavailable";
      readonly error: ChangedFilesError;
    };

export interface WorkspaceFilePreview {
  readonly path: string;
  readonly content: string;
  readonly truncated: boolean;
  readonly binary: boolean;
  readonly sizeBytes: number;
}

export interface TerminalSize {
  readonly cols: number;
  readonly rows: number;
}

export type TerminalSessionStatus = "running" | "exited" | "error";

export interface TerminalSessionSnapshot {
  readonly id: string;
  readonly workspaceId: string;
  readonly cwd: string;
  readonly shell: string;
  readonly title: string;
  readonly status: TerminalSessionStatus;
  readonly replay: string;
  readonly truncated: boolean;
  readonly exitCode?: number;
  readonly signal?: number;
}

export interface TerminalPanelSnapshot {
  readonly workspaceId: string;
  readonly rootKey: string;
  readonly activeSessionId: string;
  readonly sessions: readonly TerminalSessionSnapshot[];
}

export interface TerminalDataEvent {
  readonly terminalId: string;
  readonly data: string;
}

export interface TerminalExitEvent {
  readonly terminalId: string;
  readonly exitCode?: number;
  readonly signal?: number;
}

export interface TerminalErrorEvent {
  readonly terminalId: string;
  readonly message: string;
}

export interface DesktopShortcutInput {
  readonly modifier: boolean;
  readonly alt?: boolean;
  readonly shift: boolean;
  readonly key: string;
  readonly code?: string;
}

/** Command on macOS, Control on Windows and Linux. */
export function platformShortcutModifier(
  platform: NodeJS.Platform,
  input: { readonly meta: boolean; readonly control: boolean },
): boolean {
  return platform === "darwin" ? input.meta : input.control;
}

const MAX_QUEUED_DESKTOP_COMMANDS = 16;

/**
 * Delivers main-process shortcuts to the renderer.
 * A chord can arrive before React subscribes, or in the gap while a listener
 * is swapped. Those commands are kept until the next subscriber.
 */
export function createDesktopCommandSubscription() {
  let listener: ((command: PiDesktopCommand) => void) | null = null;
  const queued: PiDesktopCommand[] = [];
  return {
    subscribe(next: (command: PiDesktopCommand) => void): () => void {
      listener = next;
      const pending = queued.splice(0, queued.length);
      for (const command of pending) next(command);
      return () => {
        if (listener === next) listener = null;
      };
    },
    deliver(command: PiDesktopCommand): void {
      if (listener) {
        listener(command);
        return;
      }
      queued.push(command);
      if (queued.length > MAX_QUEUED_DESKTOP_COMMANDS) queued.shift();
    },
  };
}

/** Collapses a repeated keydown from one physical chord so a toggle stays open. */
export const SEARCH_CHORD_TOGGLE_MS = 200;
export const REVIEW_TOGGLE_DEDUPE_MS = 8;

export type ChordSource = "main" | "renderer";

/**
 * Collapses one chord that reaches the renderer twice, once forwarded by the main
 * process and once as a keydown. Repeats from the same source are separate presses.
 */
export function createChordPairGate(windowMs = REVIEW_TOGGLE_DEDUPE_MS) {
  let last: { readonly source: ChordSource; readonly at: number } | undefined;
  return (source: ChordSource, now: number): boolean => {
    if (last && last.source !== source && now - last.at < windowMs) {
      last = undefined;
      return false;
    }
    last = { source, at: now };
    return true;
  };
}

export function createChordToggleGate(windowMs = SEARCH_CHORD_TOGGLE_MS) {
  let last = Number.NEGATIVE_INFINITY;
  return (now: number): boolean => {
    if (now - last < windowMs) return false;
    last = now;
    return true;
  };
}

export interface EarlyModifierChord {
  readonly key: string;
  readonly code: string;
}

function isBufferedModifierChord(key: string, code?: string): boolean {
  const lower = key.toLowerCase();
  if (lower === "f" || code === "KeyF") return true;
  if (lower === "," || code === "Comma") return true;
  if (lower === "r" || code === "KeyR") return true;
  return /^[1-9]$/.test(key) || /^Digit[1-9]$/.test(code ?? "");
}

/**
 * Keeps Command/Ctrl chords that arrive before the React shortcut listener
 * exists. Search, settings, Review, and thread digits are replayed.
 */
export function createEarlyModifierChordBuffer() {
  const pending: EarlyModifierChord[] = [];
  let ready = false;
  return {
    note(
      input: EarlyModifierChord & { readonly modifier: boolean; readonly shift: boolean },
    ): void {
      if (ready || !input.modifier || input.shift) return;
      if (!isBufferedModifierChord(input.key, input.code)) return;
      pending.push({ key: input.key, code: input.code });
      if (pending.length > 8) pending.shift();
    },
    arm(): readonly EarlyModifierChord[] {
      ready = true;
      return pending.splice(0, pending.length);
    },
  };
}

export const earlyModifierChords = createEarlyModifierChordBuffer();

export function getDesktopCommandFromShortcut(
  input: DesktopShortcutInput,
): PiDesktopCommand | undefined {
  if (!input.modifier) {
    return undefined;
  }

  const lowerKey = input.key.toLowerCase();
  const isComma = input.key === "," || input.code === "Comma";
  const isB = lowerKey === "b" || input.code === "KeyB";
  const isJ = lowerKey === "j" || input.code === "KeyJ";
  const isR = lowerKey === "r" || input.code === "KeyR";
  const isK = lowerKey === "k" || input.code === "KeyK";
  const isP = lowerKey === "p" || input.code === "KeyP";
  const isN = lowerKey === "n" || input.code === "KeyN";
  const isT = lowerKey === "t" || input.code === "KeyT";
  const isShiftO = input.shift && (lowerKey === "o" || input.code === "KeyO");
  const isShiftR = input.shift && isR;
  const isShiftA = input.shift && (lowerKey === "a" || input.code === "KeyA");

  if (input.alt) {
    if (!input.shift && isB) {
      return desktopCommands.toggleSidePanel;
    }
    return undefined;
  }

  if (!input.shift && isComma) {
    return desktopCommands.openSettings;
  }

  if (!input.shift && isJ) {
    return desktopCommands.toggleTerminal;
  }

  if (!input.shift && isR) {
    return desktopCommands.toggleReview;
  }

  if (!input.shift && isB) {
    return desktopCommands.toggleSidebar;
  }

  if (!input.shift && isK) {
    return desktopCommands.openCommandPalette;
  }

  if (!input.shift && isP) {
    return desktopCommands.openFilePalette;
  }

  if (!input.shift && isT) {
    return desktopCommands.newSidePanelTab;
  }

  if ((!input.shift && isN) || isShiftO) {
    return desktopCommands.openNewThread;
  }

  if (isShiftR) {
    return desktopCommands.renameThread;
  }

  if (isShiftA) {
    return desktopCommands.archiveThread;
  }

  if (!input.shift) {
    const digitFromKey = /^[1-9]$/.test(input.key) ? input.key : undefined;
    const digitFromCode = input.code?.match(/^Digit([1-9])$/)?.[1];
    const digit = digitFromKey ?? digitFromCode;
    if (digit) {
      return RECENT_THREAD_COMMANDS[Number(digit) - 1];
    }
  }

  return undefined;
}

/**
 * Callers accept palette commands only from the platform modifier, so macOS
 * Control+K and Control+P stay with text fields, and only from a first press.
 */
export function isPaletteCommand(command: PiDesktopCommand | undefined): boolean {
  return (
    command === desktopCommands.openCommandPalette || command === desktopCommands.openFilePalette
  );
}

/**
 * Commands that act once per press and only from the platform modifier. macOS
 * Control chords stay with text fields, and off macOS the terminal keeps Control
 * chords. Holding Archive would otherwise archive each next thread in turn, and
 * holding Review would flicker the panel. New Tab is the exception in the terminal,
 * where the shell keeps it to open another terminal.
 */
export function isSinglePressCommand(command: PiDesktopCommand | undefined): boolean {
  return (
    isPaletteCommand(command) ||
    command === desktopCommands.toggleReview ||
    command === desktopCommands.newSidePanelTab ||
    command === desktopCommands.renameThread ||
    command === desktopCommands.archiveThread
  );
}

export function isCloseFocusedSurfaceShortcut(input: {
  readonly meta: boolean;
  readonly control: boolean;
  readonly alt: boolean;
  readonly shift: boolean;
  readonly key: string;
  readonly code?: string;
  readonly platform: NodeJS.Platform;
}): boolean {
  if (input.alt || input.shift) {
    return false;
  }
  const platformModifier = input.platform === "darwin" ? input.meta : input.control;
  const otherModifier = input.platform === "darwin" ? input.control : input.meta;
  if (!platformModifier || otherModifier) {
    return false;
  }
  return input.key.toLowerCase() === "w" || input.code === "KeyW";
}

/**
 * Main passes this to the renderer when the window is frameless and the app
 * must draw its own title bar with minimize, maximize and close (Linux).
 */
export const drawWindowControlsArgument = "--pi-draw-window-controls";

export interface PiDesktopApi {
  platform: NodeJS.Platform;
  /** True when the window has no native title bar and the app draws its own. */
  drawsWindowControls: boolean;
  versions: NodeJS.ProcessVersions;
  ping(): Promise<string>;
  getState(): Promise<DesktopAppState>;
  getTaskWorkbenchTemplate(target: SessionRef): Promise<TaskWorkbenchTemplate | null>;
  saveTaskWorkbenchTemplate(input: SaveTaskWorkbenchTemplateInput): Promise<void>;
  onStateChanged(listener: PiDesktopStateListener): () => void;
  /** Recent network access attempts seen by the network gateway (newest last). */
  getNetworkActivity(): Promise<readonly NetworkActivityEvent[]>;
  /** The current user; undefined until authentication exists outside development builds. */
  getCurrentUser(): Promise<DesktopUser | undefined>;
  onNetworkActivity(listener: NetworkActivityListener): () => void;
  getSelectedTranscript(): Promise<SelectedTranscriptRecord | null>;
  onSelectedTranscriptChanged(listener: PiDesktopSelectedTranscriptListener): () => void;
  resendSelectedTranscript(): void;
  onExtensionUiChanged(listener: PiDesktopExtensionUiListener): () => void;
  onCommand(listener: (command: PiDesktopCommand) => void): () => void;
  onWorkspacePicked(listener: (workspaceId: string) => void): () => void;
  onClipboardImagePasted(listener: (result: ClipboardImageRead) => void): () => void;
  getPathForFile(file: File): string;
  addWorkspacePath(path: string): Promise<DesktopAppState>;
  listSshHosts(): Promise<string[]>;
  browseSshDirectory(host: string, path: string): Promise<import("./ssh").SshDirectoryListing>;
  pickWorkspace(): Promise<DesktopAppState>;
  selectWorkspace(workspaceId: string): Promise<DesktopAppState>;
  renameWorkspace(workspaceId: string, displayName: string): Promise<DesktopAppState>;
  removeWorkspace(workspaceId: string): Promise<DesktopAppState>;
  reorderWorkspaces(workspaceOrder: readonly string[]): Promise<DesktopAppState>;
  reorderPinnedSessions(pinnedSessionOrder: readonly string[]): Promise<DesktopAppState>;
  openWorkspaceInFinder(workspaceId: string): Promise<void>;
  listEditors(): Promise<DesktopEditorList>;
  setPreferredEditor(editorId: string): Promise<DesktopEditorList>;
  openWorkspaceInEditor(workspaceId: string, editorId: string): Promise<DesktopEditorList>;
  createWorktree(input: CreateWorktreeInput): Promise<DesktopAppState>;
  removeWorktree(input: RemoveWorktreeInput): Promise<DesktopAppState>;
  openSkillInFinder(workspaceId: string, filePath: string): Promise<void>;
  openExtensionInFinder(workspaceId: string, filePath: string): Promise<void>;
  syncCurrentWorkspace(): Promise<DesktopAppState>;
  selectSession(target: WorkspaceSessionTarget): Promise<DesktopAppState>;
  renameSession(target: WorkspaceSessionTarget, title: string): Promise<DesktopAppState>;
  archiveSession(target: WorkspaceSessionTarget): Promise<DesktopAppState>;
  unarchiveSession(target: WorkspaceSessionTarget): Promise<DesktopAppState>;
  markSessionRead(target: WorkspaceSessionTarget): Promise<DesktopAppState>;
  setSessionPinned(target: WorkspaceSessionTarget, pinned: boolean): Promise<DesktopAppState>;
  createSession(input: CreateSessionInput): Promise<DesktopAppState>;
  startThread(input: StartThreadInput): Promise<DesktopAppState>;
  forkThread(input: ForkThreadInput): Promise<DesktopAppState>;
  sendChildThreadFollowUp(input: SendChildThreadFollowUpInput): Promise<DesktopAppState>;
  setChildSupervisionLoop(input: SetChildSupervisionLoopInput): Promise<DesktopAppState>;
  createScheduledTask(input: CreateScheduledTaskInput): Promise<DesktopAppState>;
  updateScheduledTask(id: string, patch: UpdateScheduledTaskInput): Promise<DesktopAppState>;
  deleteScheduledTask(id: string): Promise<DesktopAppState>;
  beginScheduledTaskInterview(): Promise<DesktopAppState>;
  cancelCurrentRun(): Promise<DesktopAppState>;
  setActiveView(view: AppView): Promise<DesktopAppState>;
  setSidebarCollapsed(collapsed: boolean): Promise<DesktopAppState>;
  setThreadGrouping(grouping: ThreadGrouping): Promise<DesktopAppState>;
  setWorkspaceCollapsed(workspaceId: string, collapsed: boolean): Promise<DesktopAppState>;
  refreshRuntime(workspaceId?: string): Promise<DesktopAppState>;
  setModelSettingsScopeMode(mode: ModelSettingsScopeMode): Promise<DesktopAppState>;
  setDefaultModel(workspaceId: string, provider: string, modelId: string): Promise<DesktopAppState>;
  setDefaultThinkingLevel(
    workspaceId: string,
    thinkingLevel: RuntimeSettingsSnapshot["defaultThinkingLevel"],
  ): Promise<DesktopAppState>;
  setSessionModel(
    workspaceId: string,
    sessionId: string,
    provider: string,
    modelId: string,
  ): Promise<DesktopAppState>;
  setSessionThinkingLevel(
    workspaceId: string,
    sessionId: string,
    thinkingLevel: NonNullable<RuntimeSettingsSnapshot["defaultThinkingLevel"]>,
  ): Promise<DesktopAppState>;
  loginProvider(workspaceId: string, providerId: string): Promise<DesktopAppState>;
  logoutProvider(workspaceId: string, providerId: string): Promise<DesktopAppState>;
  setProviderApiKey(
    workspaceId: string,
    providerId: string,
    apiKey: string,
  ): Promise<DesktopAppState>;
  listCustomProviders(): Promise<readonly CustomProviderConfig[]>;
  setCustomProvider(workspaceId: string, config: CustomProviderConfig): Promise<DesktopAppState>;
  deleteCustomProvider(workspaceId: string, providerId: string): Promise<DesktopAppState>;
  probeCustomProviderModels(input: CustomProviderProbeInput): Promise<CustomProviderProbeResult>;
  setEnableSkillCommands(workspaceId: string, enabled: boolean): Promise<DesktopAppState>;
  setScopedModelPatterns(
    workspaceId: string,
    patterns: readonly string[],
  ): Promise<DesktopAppState>;
  setSkillEnabled(
    workspaceId: string,
    filePath: string,
    enabled: boolean,
  ): Promise<DesktopAppState>;
  setExtensionEnabled(
    workspaceId: string,
    filePath: string,
    enabled: boolean,
  ): Promise<DesktopAppState>;
  listMcpServers(workspaceId: string): Promise<McpServersSnapshot>;
  addMcpServer(workspaceId: string, server: NewMcpServerInput): Promise<DesktopAppState>;
  removeMcpServer(workspaceId: string, name: string): Promise<DesktopAppState>;
  setMcpServerEnabled(
    workspaceId: string,
    scope: McpServerScope,
    name: string,
    enabled: boolean,
  ): Promise<DesktopAppState>;
  setCodemodeAlwaysOn(workspaceId: string, alwaysOn: boolean): Promise<DesktopAppState>;
  respondToHostUiRequest(
    workspaceId: string,
    sessionId: string,
    response:
      | { readonly requestId: string; readonly value: string }
      | { readonly requestId: string; readonly confirmed: boolean }
      | { readonly requestId: string; readonly cancelled: true },
  ): Promise<DesktopAppState>;
  setNotificationPreferences(
    preferences: Partial<NotificationPreferences>,
  ): Promise<DesktopAppState>;
  setIntegratedTerminalShell(shell: string): Promise<DesktopAppState>;
  setEnableTransparency(enabled: boolean): Promise<DesktopAppState>;
  setThemePresetId(presetId: ThemePresetId): Promise<DesktopAppState>;
  ensureTerminalPanel(
    workspaceId: string,
    terminalScopeId: string,
    size?: Partial<TerminalSize>,
  ): Promise<TerminalPanelSnapshot>;
  createTerminalSession(
    workspaceId: string,
    terminalScopeId: string,
    size?: Partial<TerminalSize>,
  ): Promise<TerminalPanelSnapshot>;
  setActiveTerminalSession(
    workspaceId: string,
    terminalScopeId: string,
    terminalId: string,
  ): Promise<TerminalPanelSnapshot>;
  writeTerminal(terminalId: string, data: string): Promise<void>;
  resizeTerminal(terminalId: string, size: TerminalSize): Promise<void>;
  restartTerminalSession(
    terminalId: string,
    size?: Partial<TerminalSize>,
  ): Promise<TerminalPanelSnapshot>;
  closeTerminalSession(terminalId: string): Promise<TerminalPanelSnapshot | null>;
  setTerminalTitle(terminalId: string, title: string): Promise<void>;
  setTerminalFocused(focused: boolean): Promise<void>;
  setSidePanelFocused(focused: boolean): Promise<void>;
  onTerminalData(listener: (event: TerminalDataEvent) => void): () => void;
  onTerminalExit(listener: (event: TerminalExitEvent) => void): () => void;
  onTerminalError(listener: (event: TerminalErrorEvent) => void): () => void;
  getNotificationPermissionStatus(): Promise<DesktopNotificationPermissionStatus>;
  requestNotificationPermission(): Promise<DesktopNotificationPermissionStatus>;
  openSystemNotificationSettings(): Promise<void>;
  onNotificationPermissionStatusChanged(
    callback: (status: DesktopNotificationPermissionStatus) => void,
  ): () => void;
  pickComposerAttachments(): Promise<DesktopAppState>;
  readClipboardImage(): ClipboardImageRead;
  addComposerAttachments(attachments: readonly ComposerAttachment[]): Promise<DesktopAppState>;
  removeComposerAttachment(attachmentId: string): Promise<DesktopAppState>;
  editQueuedComposerMessage(messageId: string, currentDraft?: string): Promise<DesktopAppState>;
  cancelQueuedComposerEdit(): Promise<DesktopAppState>;
  removeQueuedComposerMessage(messageId: string): Promise<DesktopAppState>;
  steerQueuedComposerMessage(messageId: string): Promise<DesktopAppState>;
  persistComposerDraft(input: {
    readonly target: SessionRef;
    readonly draft: string;
  }): Promise<void>;
  /** Saves the draft typed in `target`, even if another task is selected by the time it lands. */
  updateComposerDraft(composerDraft: string, target: SessionRef): Promise<DesktopAppState>;
  /**
   * Runs `handler` when the window is about to close or the app to quit; it should resolve
   * once the debounced draft has been saved. Main waits a bounded time for it.
   */
  onPendingComposerDraftFlush(handler: () => Promise<void>): () => void;
  submitComposer(
    text: string,
    options?: { readonly deliverAs?: "steer" | "followUp" },
  ): Promise<DesktopAppState>;
  getSessionTree(target: WorkspaceSessionTarget): Promise<SessionTreeSnapshot>;
  navigateSessionTree(
    target: WorkspaceSessionTarget,
    targetId: string,
    options?: NavigateSessionTreeOptions,
  ): Promise<{ readonly state: DesktopAppState; readonly result: NavigateSessionTreeResult }>;
  listWorkspaceFiles(
    workspaceId: string,
    options?: { readonly force?: boolean },
  ): Promise<string[]>;
  readWorkspaceFile(workspaceId: string, filePath: string): Promise<WorkspaceFilePreview>;
  revealWorkspaceFile(workspaceId: string, filePath: string): Promise<void>;
  getChangedFiles(workspaceId: string): Promise<ChangedFilesResult>;
  getFileDiff(workspaceId: string, filePath: string): Promise<string>;
  stageFile(workspaceId: string, filePath: string, stagingSourcePath?: string): Promise<void>;
  onExtensionViewOpenFile(listener: (event: ExtensionViewOpenFile) => void): () => void;
  /** Runs a card button's action for its thread, which must be the window's selected one. */
  runExtensionAction(request: ExtensionActionRequest): Promise<ExtensionActionEffect | null>;
  listExtensionViews(target: SessionRef): Promise<readonly DesktopExtensionViewInfo[]>;
  openExtensionView(input: OpenExtensionViewInput): Promise<ExtensionViewConnection>;
  sendExtensionViewMessage(input: ExtensionViewMessage): Promise<void>;
  closeExtensionView(connectionId: string): Promise<void>;
  onExtensionViewMessage(listener: (event: ExtensionViewMessage) => void): () => void;
  onExtensionViewCatalogChanged(listener: (event: ExtensionViewCatalogChange) => void): () => void;
  getTurnChanges(input: TurnChangesInput): Promise<TurnChangesResult>;
  getReview(input: GetReviewInput): Promise<ReviewResult>;
  getReviewFile(input: ReviewFileInput): Promise<ReviewFileResult>;
  setReviewFileReviewed(input: SetReviewFileReviewedInput): Promise<SetReviewFileReviewedResult>;
  changeReviewFileStage(input: ChangeReviewFileStageInput): Promise<ChangeReviewFileStageResult>;
  toggleWindowMaximize(): Promise<void>;
  minimizeWindow(): void;
  closeWindow(): void;
  openExternal(url: string): Promise<void>;
  getThemeMode(): Promise<"system" | "light" | "dark">;
  getResolvedTheme(): Promise<"light" | "dark">;
  setThemeMode(mode: "system" | "light" | "dark"): Promise<DesktopAppState>;
  onThemeChanged(callback: (theme: "light" | "dark") => void): () => void;
  /** The window came back to the foreground, so outside changes (edits, git) may need rereading. */
  onWindowFocused(listener: () => void): () => void;
  relaunchApplication(): Promise<void>;
}
