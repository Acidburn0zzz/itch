import {
  Dispatch,
  Action,
  SystemTasksState,
  ProxySource,
  CommonsState,
  ModalAction,
  ItchAppTabs,
  MenuTemplate,
  I18nResources,
  I18nKeys,
  ProgressInfo,
  IOpenTabPayload,
  GenerosityLevel,
  PreferencesState,
  IOpenAtLoginError,
  LocalizedString,
  IOpenContextMenuBase,
  ModalResponse,
  TabData,
  INavigatePayload,
  IEvolveTabPayload,
  INavigateTabPayload,
  TaskName,
  PackageState,
  SystemState,
  WindRole,
} from "common/types";

import {
  Game,
  Upload,
  CleanDownloadsEntry,
  GameUpdate,
  Profile,
  Download,
  DownloadProgress,
  Cave,
  GameUpdateChoice,
} from "common/butlerd/messages";
import { Endpoint } from "butlerd";
import { TypedModal, TypedModalUpdate } from "common/modals";
import { LogEntry } from "common/logger";
export interface ActionCreator<PayloadType> {
  payload: PayloadType;
  (payload: PayloadType): Action<PayloadType>;
}

function action<PayloadType>(): ActionCreator<PayloadType> {
  const ret = (type: string) => (payload: PayloadType): Action<PayloadType> => {
    return {
      type,
      payload,
    };
  };
  // bending typing rules a bit, forgive me
  return ret as any;
}

export function dispatcher<T, U>(
  dispatch: Dispatch,
  actionCreator: (payload: T) => Action<U>
) {
  return (payload: T) => {
    const action = actionCreator(payload);
    dispatch(action);
    return action;
  };
}

interface MirrorInput {
  [key: string]: ActionCreator<any>;
}

type MirrorOutput<T> = { [key in keyof T]: T[key] };

function wireActions<T extends MirrorInput>(input: T): MirrorOutput<T> {
  const res: MirrorOutput<T> = {} as any;
  for (const k of Object.keys(input)) {
    res[k] = input[k](k) as any;
  }
  return res;
}

export const actions = wireActions({
  // system

  preboot: action<{}>(),
  boot: action<{}>(),
  tick: action<{}>(),
  log: action<{
    entry: LogEntry;
  }>(),
  scheduleSystemTask: action<Partial<SystemTasksState>>(),
  systemAssessed: action<{
    system: SystemState;
  }>(),
  languageChanged: action<{
    lang: string;
  }>(),
  processUrlArguments: action<{
    /** these are command-line arguments */
    args: string[];
  }>(),
  handleItchioURI: action<{
    /** example: itchio:///games/3 */
    uri: string;
  }>(),
  pushItchioURI: action<{
    uri: string;
  }>(),
  clearItchioURIs: action<{}>(),

  proxySettingsDetected: action<{
    /** a valid HTTP(S) proxy string (that could be in $HTTP_PROXY) */
    proxy: string;
    source: ProxySource;
  }>(),
  commonsUpdated: action<Partial<CommonsState>>(),

  // modals

  openModal: action<TypedModal<any, any>>(),
  updateModalWidgetParams: action<TypedModalUpdate<any>>(),
  closeModal: action<{
    wind: string;

    /** id of the modal to close - if unspecified, close frontmost */
    id?: string;

    /** action that should be dispatched once the modal's been closed */
    action?: ModalAction;
  }>(),
  modalClosed: action<{
    wind: string;

    /** id of the modal that was just closed */
    id: string;

    /** if there was a response, it's here */
    response: ModalResponse | null;
  }>(),
  modalResponse: action<any>(),

  openWind: action<{
    initialURL: string;
    role: WindRole;
  }>(),
  windClosed: action<{
    wind: string;
  }>(),
  windOpened: action<{
    wind: string;
    nativeId: number;
    initialURL: string;
    role: WindRole;
  }>(),

  // setup

  packagesListed: action<{
    packageNames: string[];
  }>(),
  packageGotVersionPrefix: action<{
    name: string;
    version: string;
    versionPrefix: string;
  }>(),
  packageStage: action<{
    name: string;
    stage: PackageState["stage"];
  }>(),
  packageNeedRestart: action<{
    name: string;
    availableVersion: string;
  }>(),
  packageProgress: action<{
    name: string;
    progressInfo: ProgressInfo;
  }>(),

  relaunchRequest: action<{}>(),
  relaunch: action<{}>(),

  spinningUpButlerd: action<{
    startedAt: number;
  }>(),
  gotButlerdEndpoint: action<{
    endpoint: Endpoint;
  }>(),

  setupStatus: action<{
    icon: string;
    message: LocalizedString;
    stack?: string;
  }>(),
  setupOperationProgress: action<{
    progress: ProgressInfo;
  }>(),
  setupDone: action<{}>(),
  retrySetup: action<{}>(),

  // login

  attemptLogin: action<{}>(),
  loginWithPassword: action<{
    /** the username or e-mail for the itch.io account to log in as */
    username: string;

    /** the password for the itch.io account to log in as */
    password: string;

    /** the 2FA totp code entered by user */
    totpCode?: string;
  }>(),
  useSavedLogin: action<{
    profile: Profile;
  }>(),
  loginFailed: action<{
    /** the username we couldn't log in as (useful to prefill login form for retry) */
    username: string;

    /** an error that occured while logging in */
    error: Error;
  }>(),
  loginCancelled: action<{}>(),
  loginSucceeded: action<{
    /** Profile we just logged in as */
    profile: Profile;
  }>(),

  forgetProfileRequest: action<{
    /** Profile to forget */
    profile: Profile;
  }>(),
  forgetProfile: action<{
    /** Profile to forget */
    profile: Profile;
  }>(),
  profilesUpdated: action<{}>(),

  changeUser: action<{}>(),
  requestLogout: action<{}>(),
  logout: action<{}>(),

  // onboarding

  startOnboarding: action<{}>(),
  exitOnboarding: action<{}>(),

  // window events

  windDestroyed: action<{
    wind: string;
  }>(),
  windFocusChanged: action<{
    wind: string;

    /** current state of focusedness */
    focused: boolean;
  }>(),
  windFullscreenChanged: action<{
    wind: string;

    /** current state of fullscreenedness */
    fullscreen: boolean;
  }>(),
  windMaximizedChanged: action<{
    wind: string;

    /** current state of fullscreenedness */
    maximized: boolean;
  }>(),
  windBoundsChanged: action<{
    wind: string;

    bounds: {
      /** left border, in pixels */
      x: number;
      /** top border, in pixels */
      y: number;
      /** in pixels */
      width: number;
      /** in pixels */
      height: number;
    };
  }>(),
  focusWind: action<{
    wind: string;

    /** if set to true, toggle focus instead of always focusing */
    toggle?: boolean;
  }>(),
  hideWind: action<{
    wind: string;
  }>(),
  minimizeWind: action<{
    wind: string;
  }>(),
  toggleMaximizeWind: action<{
    wind: string;
  }>(),

  // navigation
  openTab: action<IOpenTabPayload>(),
  newTab: action<{
    wind: string;
  }>(),
  navigate: action<INavigatePayload>(),
  focusTab: action<{
    wind: string;

    /** the id of the new tab */
    tab: string;
  }>(),
  focusNthTab: action<{
    wind: string;

    /** the index of the constant tab to focus (0-based) */
    index: number;
  }>(),
  moveTab: action<{
    wind: string;

    /** old tab index */
    before: number;
    /** new tab index */
    after: number;
  }>(),
  showNextTab: action<{
    wind: string;
  }>(),
  showPreviousTab: action<{
    wind: string;
  }>(),

  closeTab: action<{
    wind: string;

    /** id of tab to close */
    tab: string;
  }>(),
  closeCurrentTab: action<{
    wind: string;
  }>(),
  closeTabOrAuxWindow: action<{
    wind: string;
  }>(),
  closeAllTabs: action<{
    wind: string;
  }>(),
  closeOtherTabs: action<{
    wind: string;

    /** the only transient tab that'll be left */
    tab: string;
  }>(),
  closeTabsBelow: action<{
    wind: string;

    /** the tab after which all tabs will be closed */
    tab: string;
  }>(),

  navigateTab: action<INavigateTabPayload>(),
  evolveTab: action<IEvolveTabPayload>(),
  tabReloaded: action<{
    wind: string;

    /** the tab that just reloaded */
    tab: string;
  }>(),
  tabChanged: action<{
    wind: string;

    /** the newly active tab */
    tab: string;
  }>(),
  tabsChanged: action<{
    wind: string;
  }>(),
  tabsRestored: action<{
    wind: string;
    snapshot: ItchAppTabs;
  }>(),
  tabDataFetched: action<{
    wind: string;

    /** tab for which we fetched data */
    tab: string;

    /** the data we fetched */
    data: TabData;

    /** if true, shallow merge with previous state instead of deep merging */
    shallow?: boolean;
  }>(),
  analyzePage: action<{
    wind: string;

    /** Which tab we're analyzing the page for */
    tab: string;

    /** The url we're supposed to analyze */
    url: string;
  }>(),
  tabLoading: action<{
    /** id of tab whose loading status just chagned */
    tab: string;

    /** current loading state */
    loading: boolean;
  }>(),
  tabGotWebContents: action<{
    wind: string;

    /** id of tab who just got a webcontents */
    tab: string;
    /** electron id of webcontents */
    webContentsId: number;
  }>(),
  tabLostWebContents: action<{
    wind: string;

    /** id of tab who just lost a webcontents */
    tab: string;
  }>(),
  tabGotFrame: action<{
    wind: string;

    /** id of tab who just got a frame */
    tab: string;

    routingId: number;
  }>(),
  tabLostFrame: action<{
    wind: string;

    /** id of tab who just lost a frame */
    tab: string;
  }>(),
  openGameContextMenu: action<
    IOpenContextMenuBase & {
      /** game to open the context menu of */
      game: Game;
    }
  >(),
  openUserMenu: action<IOpenContextMenuBase>(),

  viewCreatorProfile: action<{}>(),
  viewCommunityProfile: action<{}>(),

  // menu

  menuChanged: action<{
    /** new menu template */
    template: MenuTemplate;
  }>(),

  // context menus

  popupContextMenu: action<
    IOpenContextMenuBase & {
      /** contents of the context menu */
      template: MenuTemplate;
    }
  >(),
  closeContextMenu: action<{}>(),

  checkForComponentUpdates: action<{}>(),

  quit: action<{}>(),
  quitWhenMain: action<{}>(),

  // locales
  localesConfigLoaded: action<{
    /** initial set of i18n strings */
    strings: I18nResources;
  }>(),
  queueLocaleDownload: action<{
    /** language to download */
    lang: string;

    /** true if not triggered manually */
    implicit?: boolean;
  }>(),
  localeDownloadStarted: action<{
    /** which language just started downloading */
    lang: string;
  }>(),
  localeDownloadEnded: action<{
    /** which language just finished downloading */
    lang: string;

    /** i18n strings */
    resources: I18nKeys;
  }>(),
  reloadLocales: action<{}>(),

  // install locations

  browseInstallLocation: action<{
    /** id of install location to browse */
    id: string;
  }>(),
  addInstallLocation: action<{
    wind: string;
  }>(),
  removeInstallLocation: action<{
    /** id of the install location to remove */
    id: string;
  }>(),
  makeInstallLocationDefault: action<{
    /** id of install location to make the default */
    id: string;
  }>(),
  scanInstallLocations: action<{}>(),
  newItemsImported: action<{}>(),
  installLocationsChanged: action<{}>(),

  // tasks

  taskStarted: action<{
    /** name of task that just started */
    name: TaskName;

    /** identifier of the task that just started */
    id: string;

    /** timestamp for the task's start */
    startedAt: number;

    /** identifier of the game the task is tied to */
    gameId: number;
  }>(),
  taskProgress: action<
    ProgressInfo & {
      /** the task this progress info is for */
      id: string;
    }
  >(),
  taskEnded: action<{
    /** the task that just ended */
    id: string;

    /** an error, if any */
    err: string;
  }>(),
  abortTask: action<{
    /** id of the task to abort */
    id: string;
  }>(),

  // downloads

  downloadQueued: action<{}>(),
  downloadsListed: action<{
    downloads: Download[];
  }>(),
  refreshDownloads: action<{}>(),
  downloadProgress: action<{
    download: Download;
    progress: DownloadProgress;
    speedHistory: number[];
  }>(),
  downloadEnded: action<{
    download: Download;
  }>(),
  clearFinishedDownloads: action<{}>(),
  prioritizeDownload: action<{
    /** the download for which we want to show an error dialog */
    id: string;
  }>(),
  showDownloadError: action<{
    /** the download for which we want to show an error dialog */
    id: string;
  }>(),
  discardDownload: action<{
    /** id of download to discard */
    id: string;
  }>(),
  downloadDiscarded: action<{
    /** id of download that was just discarded */
    id: string;
  }>(),
  setDownloadsPaused: action<{
    paused: boolean;
  }>(),
  retryDownload: action<{
    /** id of download to retry */
    id: string;
  }>(),
  clearGameDownloads: action<{
    /** id of game for which to clear downloads */
    gameId: number;
  }>(),

  downloadsRestored: action<{}>(),
  cleanDownloadsSearch: action<{}>(),
  cleanDownloadsFoundEntries: action<{
    /** download subfolders we could remove */
    entries: CleanDownloadsEntry[];
  }>(),
  cleanDownloadsApply: action<{
    /** download subfolders we will remove */
    entries: CleanDownloadsEntry[];
  }>(),

  // game management

  queueGame: action<{
    /** the game we want to download */
    game: Game;

    /** which cave to launch */
    caveId?: string;
  }>(),
  queueGameInstall: action<{
    /** the game we want to install */
    game: Game;

    /** the upload we picked */
    upload: Upload;
  }>(),
  queueLaunch: action<{ cave: Cave }>(),
  launchEnded: action<{}>(),
  manageGame: action<{
    /** which game to manage */
    game: Game;
  }>(),
  manageCave: action<{
    /** which cave to manage */
    caveId: string;
  }>(),
  requestCaveUninstall: action<{
    /** id of the cave to uninstall */
    caveId: string;
  }>(),
  queueCaveUninstall: action<{
    /** id of the cave to uninstall */
    caveId: string;
  }>(),
  queueCaveReinstall: action<{
    /** id of the cave to reinstall */
    caveId: string;
  }>(),
  uninstallEnded: action<{}>(),
  exploreCave: action<{
    /** id of the cave to explore */
    caveId: string;
  }>(),
  recordGameInteraction: action<{}>(),
  forceCloseLastGame: action<{}>(),
  forceCloseGameRequest: action<{
    /** the game we want to force-quit */
    game: Game;
  }>(),
  forceCloseGame: action<{
    /** the id of the game we want to force-quit */
    gameId: number;
  }>(),
  checkForGameUpdates: action<{}>(),
  checkForGameUpdate: action<{
    /** which cave to check for an update */
    caveId: string;

    /** display a notification if the game is up-to-date. otherwise, stay silent */
    noisy: boolean;
  }>(),
  gameUpdateCheckStatus: action<{
    /** whether we're currently checking */
    checking: boolean;

    /** how far along we are */
    progress: number;
  }>(),
  gameUpdateAvailable: action<{
    /** the actual update info */
    update: GameUpdate;
  }>(),
  showGameUpdate: action<{
    /** the actual update info */
    update: GameUpdate;
  }>(),
  queueGameUpdate: action<{
    /** the actual update info */
    update: GameUpdate;
    /** the choice we made */
    choice: GameUpdateChoice;
  }>(),
  queueAllGameUpdates: action<{}>(),
  snoozeCave: action<{
    caveId: string;
  }>(),

  switchVersionCaveRequest: action<{
    /** the cave to revert to a different build */
    cave: Cave;
  }>(),
  viewCaveDetails: action<{
    /** the cave to view details of */
    caveId: string;
  }>(),

  // purchase

  initiatePurchase: action<{
    /** the game that might be purchased */
    game: Game;
  }>(),
  purchaseCompleted: action<{
    /** the game that was just purchased */
    game: Game;
  }>(),
  encourageGenerosity: action<{
    /** for which game should we encourage generosity? */
    gameId: number;

    /** how hard should we encourage generosity? */
    level: GenerosityLevel;
  }>(),

  // search

  focusInPageSearch: action<{
    wind: string;
  }>(),

  searchFetched: action<{}>(),
  focusSearch: action<{}>(),
  closeSearch: action<{}>(),

  // preferences

  updatePreferences: action<Partial<PreferencesState>>(),
  preferencesLoaded: action<PreferencesState>(),
  clearBrowsingDataRequest: action<{
    wind: string;
  }>(),
  clearBrowsingData: action<{
    /** Whether to wipe cached images & files */
    cache: boolean;

    /** Whether to wipe cookies (will log out user) */
    cookies: boolean;
  }>(),
  openAtLoginError: action<IOpenAtLoginError>(),

  // internal

  setReduxLoggingEnabled: action<{
    /** true if should show in the chrome console */
    enabled: boolean;
  }>(),

  // misc.

  gcDatabase: action<{}>(),
  /** macOS-only, bounce dock */
  bounce: action<{}>(),
  /** cross-platform, notification bubble */
  notify: action<{
    /** title of the notification, defaults to `itch` */
    title?: string;

    /** main text of the notification */
    body: string;

    /** path to the icon (on fs, can be relative to `app/`), defaults to itch icon */
    icon?: string;

    /** action to dispatch if notification is clicked */
    onClick?: Action<any>;
  }>(),
  statusMessage: action<{
    /** the message we want to show in the status bar */
    message: LocalizedString;
  }>(),
  dismissStatusMessage: action<{}>(),
  commandMain: action<{
    wind: string;
  }>(),
  commandOk: action<{
    wind: string;
  }>(),
  commandBack: action<{
    wind: string;
  }>(),
  commandGoBack: action<{
    wind: string;
  }>(),
  commandGoForward: action<{
    wind: string;
  }>(),
  commandLocation: action<{
    wind: string;
  }>(),
  commandReload: action<{
    wind: string;
  }>(),
  commandStop: action<{
    wind: string;
  }>(),
  commandFocusLocation: action<{
    wind: string;
  }>(),
  tabGoBack: action<{
    wind: string;
    tab: string;
  }>(),
  tabGoForward: action<{
    wind: string;
    tab: string;
  }>(),
  tabStop: action<{
    wind: string;
    tab: string;
  }>(),

  openInExternalBrowser: action<{
    /** the URL to open in an external web browser */
    url: string;
  }>(),
  openAppLog: action<{}>(),
  openDevTools: action<{
    /** if true, should open dev tools for app, not the current tab */
    forApp: boolean;

    wind?: string;
  }>(),
  sendFeedback: action<{
    /** error log that should be included in the issue report */
    log?: string;
  }>(),
  viewChangelog: action<{}>(),
  copyToClipboard: action<{
    /** text to copy to clipboard */
    text: string;
  }>(),
});
