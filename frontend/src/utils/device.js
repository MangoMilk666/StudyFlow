const LS_DEVICE_ID_KEY = 'studyflow_device_id'
/**
 * 读取持久化设备 ID
 * 不存在时用 crypto.randomUUID() 生成并永久写入
 */
export function getPersistentDeviceId() {
  try {
    let id = localStorage.getItem(LS_DEVICE_ID_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(LS_DEVICE_ID_KEY, id)
    }
    return id
  } catch {
    return null
  }
}
