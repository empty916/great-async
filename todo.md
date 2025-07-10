
## API 设计改进建议

### 高优先级 - 新增实用方法（向后兼容）

#### useAsyncFunction 新增方法
- [ ] 添加 `refresh()` 方法 - 强制刷新数据（忽略缓存）
- [ ] 添加 `reset()` 方法 - 重置状态到初始值
- [ ] 添加 `mutate(data)` 方法 - 手动更新数据（支持乐观更新）
- [ ] 添加 `revalidate()` 方法 - 重新验证数据（SWR 模式）
- [ ] 添加 `retry()` 方法 - 重试上次失败的请求
- [ ] 添加 `clearError()` 方法 - 清除错误状态
- [ ] 添加 `prefetch(...args)` 方法 - 预取数据
- [ ] 添加 `invalidate()` 方法 - 标记缓存为无效

#### 状态查询属性
- [ ] 添加 `isStale` 属性 - 数据是否过期
- [ ] 添加 `isValidating` 属性 - 是否正在验证中
- [ ] 添加 `lastUpdated` 属性 - 最后更新时间戳

### 中优先级 - 参数优化（下个大版本）

#### 参数命名优化
- [ ] 考虑 `cacheCapacity` → `capacity` 或 `maxCacheSize`
- [ ] 考虑 `genKeyByParams` → `keyGenerator` 或 `cacheKey`
- [ ] 考虑 `retryStrategy` → `retry`
- [ ] 考虑 `singleDimension` → `singleScope`
- [ ] 考虑 `debounceDimension` → `takeLatestPromise`

#### 参数分组重构
- [ ] 缓存配置组 `cache: { ttl, capacity, keyGenerator, swr }`
- [ ] 防抖配置组 `debounce: { time, scope, takeLatestPromise }`
- [ ] 单例配置组 `single: { enabled, scope }`
- [ ] 重试配置组 `retry: (error: any, currentRetryCount: number) => boolean`
- [ ] 生命周期回调组 `hooks: { beforeRun, onBackgroundUpdateStart, onBackgroundUpdate }`

#### 类型安全增强
- [ ] 使用更严格的枚举类型替代字符串字面量
- [ ] 为 SWR 相关回调提供更精确的类型定义
- [ ] 支持新旧两种参数格式的类型重载

### 低优先级 - 长期规划

#### 性能优化
- [ ] 考虑更合理的默认值（如 `cacheCapacity: 100` 而不是 `-1`）
- [ ] 添加内存管理选项（最大缓存时间、清理间隔等）
- [ ] 性能监控和调试支持

#### 文档改进
- [ ] 按功能分组展示参数文档
- [ ] 提供典型使用场景的参数组合示例
- [ ] 添加最佳实践指南
- [ ] 提供参数重构的迁移指南

### 实施策略
1. **渐进式改进**：先添加新方法，保持旧参数兼容
2. **废弃警告**：对旧参数添加 `@deprecated` 标记
3. **完整测试**：为所有新功能添加测试用例
4. **文档更新**：同步更新 README 和 API 文档
