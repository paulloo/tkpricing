// 本机偏好（如上次选择的店铺）。存储不可用时静默降级，不影响功能。

export function readPref(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writePref(key: string, value: string | null): void {
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // 隐私模式等情况下不可用，忽略
  }
}
