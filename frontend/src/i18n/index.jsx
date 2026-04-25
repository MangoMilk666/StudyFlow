import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const LS_LANG_KEY = 'sf_lang_v1'

const translations = {
  en: {
    common: {
      ok: 'OK',
      cancel: 'Cancel',
      save: 'Save',
      loading: 'Loading...',
    },
    nav: {
      home: 'Home',
      stats: 'Stats',
      dashboard: 'Dashboard',
      tasks: 'Tasks',
      focus: 'Focus',
    },
    home: {
      welcome: 'Welcome to StudyFlow!',
      enterBoard: 'Go to Dashboard',
      auth: 'Login / Register',
    },
    auth: {
      login: 'Login',
      register: 'Register',
      username: 'Username',
      email: 'Email',
      password: 'Password',
      fillAll: 'Please complete all required fields.',
      loginRequired: 'Please login first.',
      loginSuccess: 'Login successful.',
      loginOkPopup: 'Login successful.',
      registerSuccess: 'Registration successful.',
      registerOkPopup: 'Registration successful!',
      backHome: 'Back to Home',
    },
    stats: {
      title: 'Stats',
      rangeDay: 'Day',
      rangeWeek: 'Week',
      rangeMonth: 'Month',
      panelCompletion: 'Done vs Undone',
      panelModuleTime: 'Time by Module',
      panelTopTasks: 'Top 5 Tasks by Time',
      panelTrend: 'Completion Trend',
      done: 'Done',
      undone: 'Undone',
      created: 'Created',
      pomodoros: 'Pomodoros',
      minutes: 'Minutes',
      uncategorized: 'Uncategorized',
    },
    dashboard: {
      todo: 'To Do',
      inProgress: 'In Progress',
      review: 'Review',
      done: 'Done',
      clickHint: 'Click to move to the next status (demo)',
      note:
        'Note: This is a skeleton + demo interaction. You can later switch task data from local mock to /api/tasks.',
      noTasks: 'No tasks',
      backendOk: (status) => `Backend: connected (${status || 'unknown'})`,
      backendErr: 'Backend: not connected (you can start backend with MOCK_MODE=true)',
    },
    focus: {
      currentTask: 'Current Task',
      nextTask: 'Next Task',
      cancel: 'Cancel',
      start: 'Start',
      stop: 'Stop',
      pause: 'Pause',
      resume: 'Resume',
      timeUp: 'Time is up!',
      selectTaskFirst: 'Please select a task first.',
      stopConfirm: 'Stop the timer? (This session will be saved as interrupted)',
      congrats: 'Congrats! You finished a pomodoro.',
      totalFocused: (minutes) => `This task has accumulated ${minutes || 0} minutes.`,
      markDone: 'Mark Done',
      stopBeforeDone: 'Please stop the timer before marking the task as Done.',
      skeletonNote: 'Skeleton stage: the timer will show an alert when time is up; later you can connect to /api/timer/*.',
      unselected: 'No Task',
    },
    settings: {
      account: 'Account',
      security: 'Security',
      privacy: 'Privacy',
      preferences: 'Preferences',
      changeEmail: 'Change Email',
      deviceManagement: 'Device Management',
      dataSharing: 'Data Sharing',
      option: 'Option',
      languages: 'Languages',
      enterNewEmail: 'Enter new email',
      emailUpdated: 'Email updated',
      comingSoon: 'Coming soon',
      logout: 'Log out',
    },
    tasks: {
      addNew: 'Add New Task',
      enterTitle: 'Enter task title',
      previewNote: 'Preview mode: please login to create or manage tasks.',
      newTitle: 'New Task',
      editTitle: 'Edit Task',
      titlePlaceholder: 'Task title',
      modulePlaceholder: 'Module name',
      title: 'Title',
      deadline: 'Deadline',
      module: 'Module',
      createdAt: 'Create Time',
      status: 'Status',
      operation: 'Operation',
      edit: 'Edit',
      delete: 'Delete',
      noTasks: 'No tasks',
      loading: 'Loading...',
      priority: 'Priority',
      priorityLegendApi: 'Priority: Low / Medium / High',
      priorityLegendDemo: 'Priority: H(igh), M(edium), L(ow)',
      statusTodo: 'To Do',
      statusInProgress: 'In Progress',
      statusReview: 'Review',
      statusDone: 'Done',
      priorityLow: 'Low',
      priorityMedium: 'Medium',
      priorityHigh: 'High',
      syncConfirm: 'Do you want to pull latest assignments info from Canvas?',
      syncSuccess: 'Canvas assignments synced.',
      syncFailed: 'Sync failed.',
      syncButton: 'Sync from Canvas',
    },

    canvas: {
      modalTitle: 'Canvas Import',
      modalHint: 'Select courses, preview assignments, then confirm to import into Tasks.',
      courseName: 'Course',
      courseId: 'Course ID',
      noCourses: 'No courses',
      previewAssignments: 'Preview',
      confirmImport: 'Confirm',
    },
  },
  zh: {
    common: {
      ok: '确定',
      cancel: '取消',
      save: '保存',
      loading: '加载中...',
    },
    nav: {
      home: '首页',
      stats: '统计',
      dashboard: '看板',
      tasks: '任务',
      focus: '专注',
    },
    home: {
      welcome: '欢迎使用 StudyFlow！',
      enterBoard: '进入看板',
      auth: '登录 / 注册',
    },
    auth: {
      login: '登录',
      register: '注册',
      username: '用户名',
      email: '邮箱',
      password: '密码',
      fillAll: '请填写完整信息。',
      loginRequired: '请先登录。',
      loginSuccess: '登录成功。',
      loginOkPopup: '登录成功!',
      registerSuccess: '注册成功。',
      registerOkPopup: '注册成功!',
      backHome: '回到首页',
    },
    stats: {
      title: '统计',
      rangeDay: '近一天',
      rangeWeek: '近一周',
      rangeMonth: '近一月',
      panelCompletion: '完成 vs 未完成',
      panelModuleTime: '按模块耗时',
      panelTopTasks: '耗时 Top 5 任务',
      panelTrend: '完成趋势',
      done: '已完成',
      undone: '未完成',
      created: '新增任务',
      pomodoros: '番茄钟',
      minutes: '分钟',
      uncategorized: '未分类',
    },
    dashboard: {
      todo: '待办',
      inProgress: '进行中',
      review: '复查',
      done: '已完成',
      clickHint: '点击切换到下一个状态（演示用）',
      note: '备注：这是“页面骨架 + 演示交互”。后续你可以把 task 列表从本地 mock 切到 `/api/tasks`。',
      noTasks: '暂无任务',
      backendOk: (status) => `后端：已连接（${status || 'unknown'}）`,
      backendErr: '后端：未连接（可先用 MOCK_MODE=true 启动后端）',
    },
    focus: {
      currentTask: '当前任务',
      nextTask: '下一个任务',
      cancel: '取消',
      start: '开始',
      stop: '停止',
      pause: '暂停',
      resume: '继续',
      timeUp: '时间到！',
      selectTaskFirst: '请先选择一个任务。',
      stopConfirm: '确定要停止本次计时吗？（将按中断记录）',
      congrats: '恭喜完成一个番茄钟！',
      totalFocused: (minutes) => `该任务已累计专注 ${minutes || 0} 分钟`,
      markDone: '标记为已完成',
      stopBeforeDone: '当前有进行中的计时，请先停止计时后再标记任务为已完成。',
      skeletonNote: '页面骨架阶段：计时结束会弹窗提示；后续可对接 `/api/timer/*` 写入记录。',
      unselected: '无任务',
    },
    settings: {
      account: '账号',
      security: '安全',
      privacy: '隐私',
      preferences: '偏好',
      changeEmail: '修改邮箱',
      deviceManagement: '设备管理',
      dataSharing: '数据共享',
      option: '选项',
      languages: '语言',
      enterNewEmail: '请输入新邮箱',
      emailUpdated: '邮箱已更新',
      comingSoon: '敬请期待',
      logout: '退出登录',
    },
    tasks: {
      addNew: '新增任务',
      enterTitle: '请输入任务标题',
      previewNote: '预览模式：请先登录后再创建或管理任务。',
      newTitle: '新增任务',
      editTitle: '编辑任务',
      titlePlaceholder: '任务标题',
      modulePlaceholder: '模块名称',
      title: '标题',
      deadline: '截止日期',
      module: '模块',
      createdAt: '创建时间',
      status: '状态',
      operation: '操作',
      edit: '编辑',
      delete: '删除',
      noTasks: '暂无任务',
      loading: '加载中...',
      priority: '优先级',
      priorityLegendApi: '优先级：低 / 中 / 高',
      priorityLegendDemo: '优先级：高/中/低（H/M/L）',
      statusTodo: '待办',
      statusInProgress: '进行中',
      statusReview: '复查',
      statusDone: '已完成',
      priorityLow: '低',
      priorityMedium: '中',
      priorityHigh: '高',
      syncConfirm: '您想要拉取最新的Canvas作业数据吗？',
      syncSuccess: 'Canvas 作业已同步。',
      syncFailed: '同步失败。',
      syncButton: '同步 Canvas 作业',
    },

    canvas: {
      modalTitle: 'Canvas 导入',
      modalHint: '请选择课程并预览作业，点击确认后才会导入到任务列表。',
      courseName: '课程',
      courseId: '课程ID',
      noCourses: '暂无课程',
      previewAssignments: '预览',
      confirmImport: '确认',
    },
  },
}

function getNested(obj, keyPath) {
  const parts = keyPath.split('.')
  let cur = obj
  for (const p of parts) {
    if (!cur || typeof cur !== 'object') return undefined
    cur = cur[p]
  }
  return cur
}

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLang] = useState('en')

  useEffect(() => {
    const stored = localStorage.getItem(LS_LANG_KEY)
    if (stored === 'en' || stored === 'zh') setLang(stored)
  }, [])

  const setLanguage = useCallback((next) => {
    const normalized = next === 'zh' ? 'zh' : 'en'
    localStorage.setItem(LS_LANG_KEY, normalized)
    setLang(normalized)
  }, [])

  const toggleLanguage = useCallback(() => {
    setLanguage(lang === 'zh' ? 'en' : 'zh')
  }, [lang, setLanguage])

  const t = useCallback(
    (keyPath, ...args) => {
      const langEntry = translations[lang]
      const enEntry = translations.en

      const value = getNested(langEntry, keyPath) ?? getNested(enEntry, keyPath)
      if (typeof value === 'function') return value(...args)
      if (typeof value === 'string') return value
      return keyPath
    },
    [lang]
  )

  const value = useMemo(() => ({ lang, setLanguage, toggleLanguage, t }), [lang, setLanguage, toggleLanguage, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
