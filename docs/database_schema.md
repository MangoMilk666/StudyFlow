# Database Schema (Collections & Main Fields)

| Collection | Purpose | Main fields (non-exhaustive) |
|---|---|---|
| `users` | User accounts + profile/consent | `_id`, `username`, `email`, `password`, `avatarUrl`, `dataSharingAccepted`, `dataSharingAcceptedAt`, `dataSharingVersion`, `createdAt`, `updatedAt` |
| `sessions` | Device/session records (JWT `sid`) | `_id`, `userId`, `persistentId`, `deviceName`, `userAgent`, `ip`, `createdAt`, `lastSeenAt`, `revokedAt` |
| `modules` | User modules/categories | `_id`, `userId`, `name`, `colorCode`, `description`, `createdAt`, `updatedAt` |
| `tasks` | Tasks (manual/AI/Canvas) | `_id`, `userId`, `title`, `description`, `status`, `priority`, `deadline`, `unlockAt`, `module`, `moduleName`, `source{type,courseId,assignmentId}`, `timeSpent`, `subtasks`, `createdAt`, `updatedAt` |
| `timerlogs` | Pomodoro session logs | `_id`, `taskId`, `userId`, `duration`, `status`, `startTime`, `endTime`, `sessionDate`, `createdAt`, `updatedAt` |
| `user_ai_configs` | Per-user AI config (encrypted key) | `_id`, `userId`, `usePersonalKey`, `apiKeyEnc`, `model`, `createdAt`, `updatedAt` |
