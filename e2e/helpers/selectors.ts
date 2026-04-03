/**
 * 页面选择器常量
 * 集中管理所有 CSS 选择器，便于维护
 */

export const PopupSelectors = {
  // 通用
  app: ".app",
  header: ".app-brand",
  headerTitle: ".app-brand-title",
  headerSubtitle: ".app-brand-subtitle",
  loading: ".loading",
  error: ".app-error",
  warning: ".app-warning",

  // 表单
  form: ".form",
  formGroup: ".form-group",
  passwordInput: 'input[type="password"]',
  submitButton: 'button[type="submit"]',

  // 设置密码页面
  setPasswordInput: 'input[placeholder="8-32 位字符"]',
  confirmPasswordInput: 'input[placeholder="再次输入密码"]',
  setPasswordButton: 'button:has-text("设置密码")',

  // 解锁页面
  unlockPasswordInput: 'input[placeholder="输入密码"]',
  unlockButton: 'button:has-text("解锁")',

  // 已解锁页面
  unlockedContent: ".unlocked-content",
  lockButton: '.popup-titlebar-btn[aria-label="锁定"]',

  // 锁定页面
  lockedInfo: ".app-locked-info",
  lockedTimer: ".app-locked-timer",
  attemptsInfo: ".app-locked-attempts",

  // 提示
  tips: ".app-tips",

  // Popup 主界面
  popupContainer: ".popup-container",
  popupTitlebar: ".popup-titlebar",
  popupTitlebarBrand: ".popup-titlebar-brand",
  popupSearchbar: ".popup-searchbar",
  popupBody: ".popup-body",
  popupSidebar: ".popup-sidebar",
  popupFooter: ".popup-footer",
  bookmarkCount: ".bookmark-count",
  btnQuickAdd: ".btn-quick-add",
  settingsBtn: '.popup-titlebar-btn[aria-label="设置"]',
  lockBtn: '.popup-titlebar-btn[aria-label="锁定"]',

  // 侧边栏 Tab
  sidebarTabs: ".sidebar-tabs",
  sidebarTabFolders: '.sidebar-tab:has-text("文件夹")',
  sidebarTabTags: '.sidebar-tab:has-text("标签")',
  sidebarTabActive: ".sidebar-tab.active",

  // 文件夹管理
  folderList: ".folder-list",
  folderItem: ".folder-item",
  folderItemSelected: ".folder-item.selected",
  folderName: ".folder-name",
  folderCount: ".folder-count",
  folderCreateBtn: ".folder-create-btn",
  folderCreateRow: ".folder-create-row",

  // 标签管理
  tagList: ".tag-list",
  tagItem: ".tag-item",
  tagItemSelected: ".tag-item.selected",
  tagName: ".tag-item-name",
  tagUsageCount: ".tag-usage-badge",
  tagDeleteBtn: ".tag-delete-btn",
  tagListEmpty: ".tag-list-empty",

  // 行内编辑
  inlineEditInput: ".inline-edit-input",
  inlineEditConfirm: ".inline-edit-confirm",
  inlineEditCancel: ".inline-edit-cancel",

  // 确认弹窗
  confirmDialog: ".confirm-dialog",
  confirmDialogOverlay: ".confirm-dialog-overlay",
  confirmDialogTitle: ".confirm-dialog-title",
  confirmDialogMessage: ".confirm-dialog-message",
  confirmDialogConfirmBtn: ".confirm-dialog-btn-confirm",
  confirmDialogCancelBtn: ".confirm-dialog-btn-cancel",

  // 右键菜单
  contextMenu: ".context-menu",
  contextMenuItem: ".context-menu-item",
  contextMenuRename: '.context-menu-item:has-text("重命名")',
  contextMenuDelete: '.context-menu-item:has-text("删除")',
};

export const OptionsSelectors = {
  // 布局
  container: ".options-container",
  sidebar: ".settings-sidebar",
  content: ".options-content",

  // 侧边栏导航（实际使用 button.sidebar-item，无 data-tab）
  navItem: "button.sidebar-item",
  navItemActive: "button.sidebar-item.active",
  tabBasic: 'button.sidebar-item:has-text("基本设置")',
  tabSecurity: 'button.sidebar-item:has-text("安全设置")',
  tabStorage: 'button.sidebar-item:has-text("存储设置")',
  tabImportExport: 'button.sidebar-item:has-text("导入导出")',
  tabAbout: 'button.sidebar-item:has-text("关于")',

  // 消息提示
  globalMessage: ".global-message",
  messageSuccess: ".message-success",
  messageError: ".message-error",

  // 面板
  settingsPanel: ".settings-panel",
  panelTitle: ".panel-title",
  panelSection: ".panel-section",
};

export const CommonSelectors = {
  // 按钮
  btnPrimary: ".btn-primary",
  btnSecondary: ".btn-secondary",
  btnDanger: ".btn-danger",

  // 输入
  input: "input",
  textarea: "textarea",
  select: "select",

  // 状态
  disabled: "[disabled]",
  loading: ".loading",
};

/**
 * 获取带文本的选择器
 */
export function withText(selector: string, text: string): string {
  return `${selector}:has-text("${text}")`;
}

/**
 * 获取第 N 个元素的选择器
 */
export function nth(selector: string, index: number): string {
  return `${selector} >> nth=${index}`;
}

/**
 * 获取指定文件夹项的选择器
 */
export function folderByName(name: string): string {
  return `.folder-item:has-text("${name}")`;
}

/**
 * 获取指定标签项的选择器
 */
export function tagByName(name: string): string {
  return `.tag-item:has-text("${name}")`;
}
