# StudyFlow 更新记录（汇总）

本文件用于汇总 `external_files/` 中散落的“实现/修复/依赖调整/启动说明”等记录，作为历史变更备忘。

说明：部分历史文档为自动生成或阶段性产物，内容可能与当前仓库实际代码存在偏差；以根目录 `README.md` 与实际代码为准。

## 2026-04-09：仓库文档整合

- 将“当前前后端已实现功能清单 + 本地调试方法”整理进根目录 `README.md`
- 将 `external_files/` 内的历史记录合并为本文件，准备清理 `external_files/`

## 2026-03-31：后端/前端与 Docker 基础设施的阶段性实现记录

来源：`external_files/IMPLEMENTATION_SUMMARY.md`、`external_files/FILE_MANIFEST.md`

- 后端：新增 Express 服务骨架、MongoDB/Mongoose 模型（User/Task/Module/TimerLog）、Auth/Tasks/Modules/Timer 路由与控制器、Dockerfile、环境变量模板等
- 前端：新增 React 页面骨架（Home/Dashboard/Tasks/Settings 等）、样式与基础路由、API 客户端封装等
- Docker：新增/更新 `docker-compose.yml`，编排 MongoDB + 后端 + 前端，并加入健康检查、网络、数据卷等

备注：上述文档中提到的部分组件/依赖（例如 MUI、KanbanBoard、WeeklyStats 等）与当前仓库目录可能不一致，属于当时的计划或生成结果，后续可能已被替换/删减。

## 2026-03-31：构建/运行修复与依赖调整记录

来源：`external_files/FIXES_SUMMARY.md`、`external_files/DEPENDENCY_FIX.md`、`external_files/STARTUP_GUIDE.md`、`external_files/QUICKSTART.md`

- 修复前端运行/构建问题（记录包含）：
  - React 组件导入错误导致的运行时崩溃
  - CSS 语法错误导致 Vite/lightningcss 构建失败
  - `App.jsx` 文件污染（重复导出/残留片段）导致语法错误
  - Node 版本不匹配导致的构建失败（Dockerfile 调整）
  - 依赖冲突（拖拽库与 React 版本 peer deps 不兼容）导致 `npm` 安装失败
- Docker Compose 调整（记录包含）：
  - 移除弃用的 `version:` 字段
  - 端口冲突处理：后端端口从 5000 调整为 8000，并同步更新相关引用

备注：部分文档中的端口（例如 5000）与当前代码可能不一致；当前以 `docker-compose.yml` / `backend/server.js` 为准。
