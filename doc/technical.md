# Skyline Gorillas 技术文档

## 1. 技术栈

- Vite 6，构建 `base: './'`
- Vanilla JavaScript
- HTML Canvas 2D
- SVG 风车
- AlterU vanilla Aigram bridge

## 2. 目录结构

- `index.html`：Canvas、原作场景 DOM、HUD、幽灵手指、结算和排行榜结构。
- `src/game.js`：固定自上游的城市生成、绘制、投掷物理、AI 和碰撞代码；追加 Pointer Events 与游戏事件。
- `src/main.js`：中英文、音效、幽灵手指、AlterU 用户名、计分、排行榜和通知。
- `src/style.css`：移动端安全区、标题、触控目标、结算和排行榜视觉。
- `public/aigram-bridge.js`：从共享 canonical vanilla bridge 同步的平台通信实现。
- `NOTICE.md`：原作者、CodePen、固定 GitHub 提交、许可入口与改造边界。

## 3. 核心模块

- `game.js` 的 `state` 维护 phase、当前玩家、回合、风速、建筑、爆破孔、香蕉和视口缩放。
- `animate()` 每帧拆 10 个物理子步，依次检测屏幕、建筑和猩猩；电脑回合用多次同步模拟选择最接近目标的速度。
- Pointer Events 从 `#bomb-grab-area` 开始，拖动距离直接映射到原作的 `bomb.velocity`，松手进入原作 RAF。
- `main.js` 读取平台资料接口的 `data.name`，只把 `data.user_name` 当旧响应兼容；平台外固定使用 `AlterU`。
- 排行榜使用永久 UUID 调用 rank save/list；冠军入口和全榜共用数据。全榜他人行显示 `head_url` 或首字母，并通过 `openAigramProfile` 打开资料。
- 新纪录提交后重拉榜单，只向 `(旧最好分, 新分数)` 区间内最高的一位其他用户发送 `score_beat`。

## 4. 扩展点

- 改物理、AI、建筑数量或爆破半径：修改 `src/game.js`。
- 改计分、音效、身份或排行榜：修改 `src/main.js`。
- 改布局、触控尺寸和排行榜视觉：修改 `src/style.css`。
- 改可见文案：修改 `src/main.js` 的 `copy`。
- 更新平台桥：从 `/Users/yin/code/games/shared/vanilla/aigram-bridge.js` 重新同步，不手写简化。

