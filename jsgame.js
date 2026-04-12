// 每一格的间距，即一个小方块的尺寸
const Spacing = 20;

// 玩家1（WASD控制）- 适配叠界之巅·方块挑战赛Canvas尺寸
const player1 = {
  x: 50, y: 300, width: 40, height: 40, speed: 5,
  up: false, down: false, left: false, right: false, color: '#ff0000'
};

// 玩家2（方向键控制）
const player2 = {
  x: 550, y: 300, width: 40, height: 40, speed: 5,
  up: false, down: false, left: false, right: false, color: '#0000ff'
};

// 键盘状态缓存（解决按键连按问题）
const keyState = {};

// 音频授权标记
let audioAuthorized = false;

// 播放音效函数
function playSound(audioId) {
    if (!audioAuthorized) return; // 未授权不播放
    const audio = document.getElementById(audioId);
    console.log('播放音效：', audioId, '元素是否存在：', !!audio);
    
    if (!audio) {
        console.error(`找不到音效文件：${audioId}`); // 仅控制台打印，不弹框
        return;
    }
    
    // 核心修复：先暂停再播放，避免play/pause时序冲突
    try {
        audio.pause(); // 先清空残留播放状态
        audio.currentTime = 0; // 重置播放进度
        audio.volume = 1;
        // 异步播放，捕获错误但不弹框
        audio.play().catch(err => {
            console.warn(`音效播放失败（非阻塞）：${audioId}，错误：${err.message}`);
            // 降级方案：尝试再次播放（兼容部分浏览器）
            setTimeout(() => {
                audio.play().catch(e => console.warn('重试播放仍失败：', e));
            }, 100);
        });
    } catch (err) {
        console.error(`播放音效异常：${err.message}`);
    }
}

// 音频授权函数
function authorizeAudio() {
    if (audioAuthorized) return;
    // 触发授权（播放后暂停）- 异步执行，避免并发冲突
    const authorizeSingleAudio = async (audio) => {
        try {
            await audio.play();
            audio.pause();
            audio.currentTime = 0;
        } catch (err) {
            console.log(`音频${audio.id}授权失败：`, err);
        }
    };

    const dropAudio = document.getElementById('dropSound');
    const clearAudio = document.getElementById('clearSound');
    const overAudio = document.getElementById('gameOverSound');
    
    // 逐个授权，避免同时播放/暂停导致冲突
    authorizeSingleAudio(dropAudio);
    setTimeout(() => authorizeSingleAudio(clearAudio), 100);
    setTimeout(() => authorizeSingleAudio(overAudio), 200);
    
    audioAuthorized = true;
}

// 各种形状的编号，0 代表没有形状
const NoShape = 0;
const ZShape = 1;
const SShape = 2;
const LineShape = 3;
const TShape = 4;
const SquareShape = 5;
const LShape = 6;
const MirroredLShape = 7;

// 各种形状的数据描述
const Shapes = [
    [[0, 0], [0, 0], [0, 0], [0, 0]],
    [[0, -1], [0, 0], [-1, 0], [-1, 1]],
    [[0, -1], [0, 0], [1, 0], [1, 1]],
    [[0, -1], [0, 0], [0, 1], [0, 2]],
    [[-1, 0], [0, 0], [1, 0], [0, 1]],
    [[0, 0], [1, 0], [0, 1], [1, 1]],
    [[-1, -1], [0, -1], [0, 0], [0, 1]],
    [[1, -1], [0, -1], [0, 0], [0, 1]]
];

// 各种形状的颜色
const Colors = ["black", "#e666cc", "#99e6e6", "#e66666", "#e6b366", "#66e6e6", "#99e699", "#ffff99"];

// 难度配置
const Difficulty = {
    easy: 1000,
    medium: 500,
    hard: 250
};

// 方块类
function Block() {
    this.data = [[], [], [], []];
}

// 方块初始化方法
Block.prototype.Block = function () {
    this.born();
};

// 方块生成方法
Block.prototype.born = function () {
    this.shape_id = Math.floor(Math.random() * 7) + 1;
    this.data = Shapes[this.shape_id];
    this.color = Colors[this.shape_id];
};

// 方块平移方法
Block.prototype.translate = function (row, col) {
    var copy = [];
    for (var i = 0; i < 4; i++) {
        var temp = {};
        temp.row = this.data[i][1] + row;
        temp.col = this.data[i][0] + col;
        copy.push(temp);
    }
    return copy;
};

//方块旋转方法
Block.prototype.rotate = function () {
    var copy = [[], [], [], []];
    for (var i = 0; i < 4; i++) {
        copy[i][0] = this.data[i][1];
        copy[i][1] = -this.data[i][0];
    }
    return copy;
};

// Map 类
function Map(w, h) {
    this.width = w;
    this.height = h;
    this.lines = [];
    for (var row = 0; row < h; row++) {
        this.lines[row] = this.newLine();
    }
}

// 创建新行方法
Map.prototype.newLine = function () {
    var shapes = [];
    for (var col = 0; col < this.width; col++) {
        shapes[col] = NoShape;
    }
   return shapes;
};

// 检查行是否被填满
Map.prototype.isFullLine = function (row) {
    var line = this.lines[row];
    for (var col = 0; col < this.width; col++) {
        if (line[col] === NoShape) return false;
    }
    return true;
};

// 检查碰撞方法
Map.prototype.isCollide = function (data) {
    for (var i = 0; i < 4; i++) {
        var row = data[i].row;
        var col = data[i].col;
        if (col < 0 || col >= this.width) return true;
        if (row === this.height) return true;
        if (row < 0) continue;
        if (this.lines[row][col] !== NoShape) return true;
    }
    return false;
};

// 追加形状并处理消除行方法
Map.prototype.appendShape = function (shape_id, data) {
    for (var i = 0; i < 4; i++) {
        var row = data[i].row;
        var col = data[i].col;
        this.lines[row][col] = shape_id;
    }
    var clearedRows = 0;
    for (var row = this.height - 1; row >= 0; row--) {
        if (this.isFullLine(row)) {
            this.lines.splice(row, 1);
            this.lines.unshift(this.newLine());
            clearedRows++;
            row++;
        }
    }
    return clearedRows;
};

// 游戏逻辑类
function GameModel(w, h, speed) {
    this.map = new Map(w, h);
    this.currentBlock = new Block();
    this.currentBlock.Block();
    this.row = 1;
    this.col = Math.floor(this.map.width / 2);
    this.nextBlock = new Block();
    this.nextBlock.Block();
    this.storedBlock = null;
    this.speed = speed;
    this.baseSpeed = speed; // 保存基础速度（不随加速变化）
    this.isCurrentBlockFast = false; // 仅当前方块加速标记
}

// 创建新方块方法
GameModel.prototype.CreateNewBlock = function () {
    this.currentBlock = this.nextBlock;
    this.row = 1;
    this.col = Math.floor(this.map.width / 2);
    this.nextBlock = new Block();
    this.nextBlock.Block();
    this.storedBlock = null;
    // 核心：切换方块后重置加速状态，恢复基础速度
    this.isCurrentBlockFast = false;
    this.speed = this.baseSpeed;
};

// 向左移动方法
GameModel.prototype.left = function () {
    this.col--;
    var temp = this.currentBlock.translate(this.row, this.col);
    if (this.map.isCollide(temp)) this.col++;
};

// 向右移动方法
GameModel.prototype.right = function () {
    this.col++;
    var temp = this.currentBlock.translate(this.row, this.col);
    if (this.map.isCollide(temp)) this.col--;
};

// 旋转方法
GameModel.prototype.rotate = function () {
    if (this.currentBlock.shape_id === SquareShape) return;

    var originalData = this.currentBlock.data;
    var originalRow = this.row;
    var originalCol = this.col;

    var rotatedData = this.currentBlock.rotate();
    this.currentBlock.data = rotatedData;
    var temp = this.currentBlock.translate(this.row, this.col);

    if (!this.map.isCollide(temp)) return;

    var corrections = [
        { col: -1, row: 0 }, { col: 1, row: 0 },
        { col: -2, row: 0 }, { col: 2, row: 0 },
        { col: 0, row: -1 }, { col: -1, row: -1 }, { col: 1, row: -1 },
        { col: 0, row: -2 }, { col: -1, row: -2 }, { col: 1, row: -2 }
    ];

    var found = false;
    for (var i = 0; i < corrections.length; i++) {
        var c = corrections[i];
        this.col = originalCol + c.col;
        this.row = originalRow + c.row;
        temp = this.currentBlock.translate(this.row, this.col);
        if (!this.map.isCollide(temp)) {
            found = true;
            break;
        }
    }

    if (!found) {
        this.currentBlock.data = originalData;
        this.row = originalRow;
        this.col = originalCol;
    }
};

// 设置当前方块加速方法（仅对当前方块生效）
GameModel.prototype.setCurrentBlockFast = function (isFast) {
    this.isCurrentBlockFast = isFast;
    // 加速时速度改为基础速度的1/5（可自定义，比如1/10）
    this.speed = isFast ? this.baseSpeed / 5 : this.baseSpeed;
};

// 下落方法（包含分数统计和音效播放）
GameModel.prototype.down = function () {
    var old = this.currentBlock.translate(this.row, this.col);
    this.row++;
    var temp = this.currentBlock.translate(this.row, this.col);
    if (this.map.isCollide(temp)) {
        this.row--;
        if (this.row === 1) return 'gameover';
        // 播放落方块音效
        playSound('dropSound');
        var clearedRows = this.map.appendShape(this.currentBlock.shape_id, old);
        this.CreateNewBlock();
        // 消行播放音效
        if (clearedRows > 0) {
            playSound('clearSound');
            // 新增：创建消除特效
            createEliminateEffect();
        }
        if (clearedRows === 1) return 10;
        if (clearedRows === 2) return 30;
        if (clearedRows === 3) return 60;
        if (clearedRows >= 4) return 100;
        return 0;
    }
    return 0;
};

// 交换当前方块和下一个方块方法
GameModel.prototype.swapNextBlock = function() {
    var originalRow = this.row;
    var originalCol = this.col;

    var tempCurrent = this.currentBlock;
    var tempNext = this.nextBlock;

    if (this.storedBlock) {
        this.currentBlock = this.storedBlock;
        this.nextBlock = tempCurrent;
        this.storedBlock = null;
    } else {
        this.storedBlock = tempCurrent;
        this.currentBlock = tempNext;
        this.nextBlock = tempCurrent;
    }

    var temp = this.currentBlock.translate(this.row, this.col);
    if (this.map.isCollide(temp)) {
        if (this.storedBlock) {
            this.currentBlock = tempNext;
            this.nextBlock = tempCurrent;
            this.storedBlock = tempCurrent;
        } else {
            this.currentBlock = tempCurrent;
            this.nextBlock = tempNext;
            this.storedBlock = null;
        }
    }

    this.row = originalRow;
    this.col = originalCol;
};

// 全局变量
let currentMode = null;
let activeDualGame = 'left';
let currentDifficulty = 'medium';

// 单页面模式变量
let singleModel = null;
let singleTickInterval = null;
let singleWaiting = false;
let singleScore = 0;

// 双页面模式变量
let leftModel = null;
let rightModel = null;
let leftTick = null;
let rightTick = null;
let leftScore = 0;
let rightScore = 0;
let leftGameOver = false;
let rightGameOver = false;

// 双人对战模式变量
let twoPlayerLeftModel = null;
let twoPlayerRightModel = null;
let twoPlayerLeftTick = null;
let twoPlayerRightTick = null;
let twoPlayerLeftScore = 0;
let twoPlayerRightScore = 0;
let twoPlayerLeftGameOver = false;
let twoPlayerRightGameOver = false;

// 单页面模式入口函数
function startSingleMode() {
    currentDifficulty = document.getElementById('difficulty').value;
    document.getElementById('modeSelect').style.display = 'none';
    document.getElementById('singleMode').style.display = 'flex';
    currentMode = 'single';
}

// 单页面开始函数（包含音频授权）
function startSingle() {
    // 第一步：音频授权
    authorizeAudio();
    
    if (singleTickInterval) clearInterval(singleTickInterval);
    const main = document.getElementById('singleMain');
    const speed = Difficulty[currentDifficulty];
    singleModel = new GameModel(main.width / Spacing, main.height / Spacing, speed);
    singleScore = 0;
    singleWaiting = false;
    updateScores();
    document.getElementById('singlePauseBtn').textContent = '暂停';
    loopSingle();
}

// 单页面暂停函数
function pauseSingle() {
    singleWaiting = !singleWaiting;
    document.getElementById('singlePauseBtn').textContent = singleWaiting ? '继续' : '暂停';
}

// 单页面游戏循环函数
function loopSingle() {
    clearInterval(singleTickInterval);
    singleTickInterval = setInterval(() => {
        if (singleWaiting || !singleModel) return;
        const result = singleModel.down();
        // 先重绘画面（无论是否消除行）
        paintSingle();
        if (result === 'gameover') {
            clearInterval(singleTickInterval);
            // 游戏结束播放音效（优先播放）
            playSound('gameOverSound');
            // 注释/删除alert弹窗，避免遮挡音效播放
            console.log("单页面游戏结束");
            return;
        }
        if (typeof result === 'number' && result > 0) {
            singleScore += result;
            updateScores(); // 分数更新
            document.getElementById("snd")?.play(); // 保留原有音效
        }
    }, singleModel.speed);
}

// 双页面模式入口函数
function startDualMode() {
    // 1. 获取难度
    currentDifficulty = document.getElementById('difficulty').value || 'medium';
    // 2. 切换界面显示
    document.getElementById('modeSelect').style.display = 'none';
    document.getElementById('dualMode').style.display = 'flex';
    // 3. 设置当前模式（关键：必须赋值）
    currentMode = 'dual';
    // 4. 初始化变量（避免undefined）
    activeDualGame = 'left';
    leftScore = 0;
    rightScore = 0;
    // 5. 清空旧游戏实例（避免冲突）
    leftModel = null;
    rightModel = null;
    leftGameOver = false;
    rightGameOver = false;
    // 6. 更新分数显示
    updateScores();
    // 7. 初始化高光
    updateDualHighlight();
}

// 双人对战模式入口函数
function startTwoPlayerMode() {
    // 1. 获取难度
    currentDifficulty = document.getElementById('difficulty').value || 'medium';
    // 2. 切换界面显示
    document.getElementById('modeSelect').style.display = 'none';
    document.getElementById('twoPlayerMode').style.display = 'flex';
    // 3. 设置当前模式（区分原有双页面模式）
    currentMode = 'twoPlayer';
    // 4. 初始化变量
    twoPlayerLeftScore = 0;
    twoPlayerRightScore = 0;
    twoPlayerLeftGameOver = false;
    twoPlayerRightGameOver = false;
    // 5. 更新分数显示
    updateTwoPlayerScores();
}

// 双页面开始函数（包含音频授权）
function startDual() {
    // 第一步：音频授权
    authorizeAudio();
    
    // 1. 清除旧定时器
    if (leftTick) clearInterval(leftTick);
    if (rightTick) clearInterval(rightTick);
    
    // 2. 获取画布元素（确保ID正确）
    const leftMain = document.getElementById('dualLeftMain');
    const rightMain = document.getElementById('dualRightMain');
    if (!leftMain || !rightMain) {
        alert("双页面画布未找到！");
        return;
    }
    
    // 3. 计算画布行列数（和单页面完全一致：宽度/Spacing，高度/Spacing）
    const leftCols = Math.floor(leftMain.width / Spacing);
    const leftRows = Math.floor(leftMain.height / Spacing);
    const rightCols = Math.floor(rightMain.width / Spacing);
    const rightRows = Math.floor(rightMain.height / Spacing);
    
    // 4. 获取难度速度（和单页面逻辑一致）
    const speed = Difficulty[currentDifficulty] || 500;

    // 5. 初始化游戏模型（使用计算后的行列数）
    leftModel = new GameModel(leftCols, leftRows, speed);
    rightModel = new GameModel(rightCols, rightRows, speed);

    // 6. 重置状态
    leftScore = 0;
    rightScore = 0;
    leftGameOver = false;
    rightGameOver = false;
    activeDualGame = 'left';

    // 7. 更新分数和高光
    updateScores();
    updateDualHighlight();

    // 8. 启动下落循环（核心：必须调用）
    loopDualLeft();
    loopDualRight();
    
    // 9. 强制首次绘制
    paintDualLeft();
    paintDualRight();
}

// 双人对战启动函数（包含音频授权）
function startTwoPlayer() {
    // 第一步：音频授权
    authorizeAudio();
    
    // 1. 清除旧定时器
    if (twoPlayerLeftTick) clearInterval(twoPlayerLeftTick);
    if (twoPlayerRightTick) clearInterval(twoPlayerRightTick);
    
    // 2. 获取画布元素
    const leftMain = document.getElementById('twoPlayerLeftMain');
    const rightMain = document.getElementById('twoPlayerRightMain');
    if (!leftMain || !rightMain) {
        alert("双人对战画布未找到！");
        return;
    }
    
    // 3. 计算画布行列数
    const leftCols = Math.floor(leftMain.width / Spacing);
    const leftRows = Math.floor(leftMain.height / Spacing);
    const rightCols = Math.floor(rightMain.width / Spacing);
    const rightRows = Math.floor(rightMain.height / Spacing);
    
    // 4. 获取难度速度
    const speed = Difficulty[currentDifficulty] || 500;

    // 5. 初始化游戏模型
    twoPlayerLeftModel = new GameModel(leftCols, leftRows, speed);
    twoPlayerRightModel = new GameModel(rightCols, rightRows, speed);

    // 6. 重置状态
    twoPlayerLeftScore = 0;
    twoPlayerRightScore = 0;
    twoPlayerLeftGameOver = false;
    twoPlayerRightGameOver = false;

    // 7. 更新分数
    updateTwoPlayerScores();

    // 8. 启动下落循环
    loopTwoPlayerLeft();
    loopTwoPlayerRight();
    
    // 9. 强制首次绘制
    paintTwoPlayerLeft();
    paintTwoPlayerRight();
}

// 双页面左侧游戏循环函数
function loopDualLeft() {
    // 清除旧定时器（避免重复）
    if (leftTick) clearInterval(leftTick);
    // 重新启动定时器（核心：直接启动，不嵌套clearInterval）
    leftTick = setInterval(() => {
        // 游戏结束/模型未初始化则跳过
        if (leftGameOver || !leftModel) return;
        
        // 执行下落逻辑（和单页面完全一致）
        const result = leftModel.down();
        
        // 游戏结束判断 + 播放音效
        if (result === 'gameover') {
            clearInterval(leftTick);
            leftGameOver = true;
            playSound('gameOverSound');
            // 注释/删除alert弹窗
            console.log("左侧游戏结束");
            return;
        }
        
        // 消除行加分+音效
        if (typeof result === 'number' && result > 0) {
            leftScore += result;
            updateScores();
            document.getElementById("snd")?.play();
        }
        
        // 强制重绘（关键：确保画面更新）
        paintDualLeft();
    }, leftModel.speed); // 使用难度对应的速度
}

// 双人对战左侧下落循环函数
function loopTwoPlayerLeft() {
    if (twoPlayerLeftTick) clearInterval(twoPlayerLeftTick);
    twoPlayerLeftTick = setInterval(() => {
        if (twoPlayerLeftGameOver || !twoPlayerLeftModel) return;
        
        const result = twoPlayerLeftModel.down();
        paintTwoPlayerLeft();
        
        if (result === 'gameover') {
            clearInterval(twoPlayerLeftTick);
            twoPlayerLeftGameOver = true;
            playSound('gameOverSound');
            // 注释/删除alert弹窗
            console.log("左侧玩家游戏结束");
            return;
        }
        
        if (typeof result === 'number' && result > 0) {
            twoPlayerLeftScore += result;
            updateTwoPlayerScores();
            document.getElementById("snd")?.play();
        }
    }, twoPlayerLeftModel.speed);
}

// 双人对战右侧下落循环函数
function loopTwoPlayerRight() {
    if (twoPlayerRightTick) clearInterval(twoPlayerRightTick);
    twoPlayerRightTick = setInterval(() => {
        if (twoPlayerRightGameOver || !twoPlayerRightModel) return;
        
        const result = twoPlayerRightModel.down();
        paintTwoPlayerRight();
        
        if (result === 'gameover') {
            clearInterval(twoPlayerRightTick);
            twoPlayerRightGameOver = true;
            playSound('gameOverSound');
            // 注释/删除alert弹窗
            console.log("右侧玩家游戏结束");
            return;
        }
        
        if (typeof result === 'number' && result > 0) {
            twoPlayerRightScore += result;
            updateTwoPlayerScores();
            document.getElementById("snd")?.play();
        }
    }, twoPlayerRightModel.speed);
}

// 双页面右侧游戏循环函数
function loopDualRight() {
    // 清除旧定时器
    if (rightTick) clearInterval(rightTick);
    // 重新启动定时器
    rightTick = setInterval(() => {
        if (rightGameOver || !rightModel) return;
        
        const result = rightModel.down();
        if (result === 'gameover') {
            clearInterval(rightTick);
            rightGameOver = true;
            playSound('gameOverSound');
            // 注释/删除alert弹窗
            console.log("右侧游戏结束");
            return;
        }
        
        if (typeof result === 'number' && result > 0) {
            rightScore += result;
            updateScores();
            document.getElementById("snd")?.play();
        }
        
        paintDualRight();
    }, rightModel.speed);
}

// 双页面高光更新函数
function updateDualHighlight() {
    // 1. 获取容器元素（关键：ID必须和HTML中的一致）
    const leftContainer = document.getElementById('dualLeftContainer');
    const rightContainer = document.getElementById('dualRightContainer');
    const divider = document.getElementById('divider');

    // 2. 容错：元素不存在时提示
    if (!leftContainer || !rightContainer || !divider) {
        console.warn("双页面高光元素未找到！");
        return;
    }

    // 3. 清除旧高光样式
    leftContainer.classList.remove('active');
    rightContainer.classList.remove('active');
    divider.className = '';

    // 4. 根据当前激活的游戏添加高光
    if (activeDualGame === 'left' && !leftGameOver) {
        leftContainer.classList.add('active');
        divider.className = 'left-highlight';
    } else if (activeDualGame === 'right' && !rightGameOver) {
        rightContainer.classList.add('active');
        divider.className = 'right-highlight';
    }
}

// 双页面游戏切换函数
function switchDualGame() {
    if (!leftModel || !rightModel) return;
    activeDualGame = activeDualGame === 'left' ? 'right' : 'left';
    updateDualHighlight();
    if (activeDualGame === 'left') {
        paintDualLeft();
    } else {
        paintDualRight();
    }
}

// 分数更新函数
function updateScores() {
    if (currentMode === 'single') {
        const singleScoreEl = document.getElementById('singleScore');
        if (singleScoreEl) {
            singleScoreEl.textContent = `分数: ${singleScore}`;
        }
    } else if (currentMode === 'dual') {
        const leftScoreEl = document.getElementById('leftScore');
        const rightScoreEl = document.getElementById('rightScore');
        const totalScoreEl = document.getElementById('totalScoreDual');
        if (leftScoreEl) leftScoreEl.textContent = leftScore;
        if (rightScoreEl) rightScoreEl.textContent = rightScore;
        if (totalScoreEl) totalScoreEl.textContent = leftScore + rightScore;
    }
}

// 双人对战分数更新函数
function updateTwoPlayerScores() {
    const leftScoreEl = document.getElementById('twoPlayerLeftScore');
    const rightScoreEl = document.getElementById('twoPlayerRightScore');
    const totalScoreEl = document.getElementById('twoPlayerTotalScore');
    if (leftScoreEl) leftScoreEl.textContent = twoPlayerLeftScore;
    if (rightScoreEl) rightScoreEl.textContent = twoPlayerRightScore;
    if (totalScoreEl) totalScoreEl.textContent = twoPlayerLeftScore + twoPlayerRightScore;
}

// 单页面绘制函数
function paintSingle() {
    if (!singleModel) return;
    const main = document.getElementById('singleMain');
    const next = document.getElementById('singleNext');
    const map = singleModel.map;
    const data = singleModel.currentBlock.translate(singleModel.row, singleModel.col);
    const nextdata = singleModel.nextBlock.translate(1, 2);

    const ctx = main.getContext('2d');
    ctx.clearRect(0, 0, main.width, main.height);
    const ctx2 = next.getContext('2d');
    ctx2.clearRect(0, 0, next.width, next.height);

    for (let row = 0; row < map.height; row++) {
        for (let col = 0; col < map.width; col++) {
            const shape_id = map.lines[row][col];
            if (shape_id !== NoShape) {
                const x = col * Spacing;
                const y = row * Spacing;
                const color = Colors[shape_id];
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                ctx.fillRect(x, y, Spacing, Spacing);
                ctx.fillStyle = color;
                ctx.fillRect(x+1, y+1, Spacing-2, Spacing-2);
            }
        }
    }

    for (let i = 0; i < 4; i++) {
        const x = data[i].col * Spacing;
        const y = data[i].row * Spacing;
        const color = singleModel.currentBlock.color;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(x, y, Spacing, Spacing);
        ctx.fillStyle = color;
        ctx.fillRect(x+1, y+1, Spacing-2, Spacing-2);
    }

    for (let i = 0; i < 4; i++) {
        const x = nextdata[i].col * Spacing;
        const y = nextdata[i].row * Spacing;
        const color = singleModel.nextBlock.color;
        ctx2.fillStyle = 'rgba(255,255,255,0.1)';
        ctx2.fillRect(x, y, Spacing, Spacing);
        ctx2.fillStyle = color;
        ctx2.fillRect(x+1, y+1, Spacing-2, Spacing-2);
    }
}

// 双页面左侧绘制函数
function paintDualLeft() {
    if (!leftModel) return;
    const main = document.getElementById('dualLeftMain');
    const next = document.getElementById('dualLeftNext');
    const map = leftModel.map;
    const data = leftModel.currentBlock.translate(leftModel.row, leftModel.col);
    const nextdata = leftModel.nextBlock.translate(1, 2);
    const ctx = main.getContext('2d');
    ctx.clearRect(0, 0, main.width, main.height);
    const ctx2 = next.getContext('2d');
    ctx2.clearRect(0, 0, next.width, next.height);

    for (let row = 0; row < map.height; row++) {
        for (let col = 0; col < map.width; col++) {
            const shape_id = map.lines[row][col];
            if (shape_id !== NoShape) {
                const x = col * Spacing;
                const y = row * Spacing;
                const color = Colors[shape_id];
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                ctx.fillRect(x, y, Spacing, Spacing);
                ctx.fillStyle = color;
                ctx.fillRect(x+1, y+1, Spacing-2, Spacing-2);
            }
        }
    }
    for (let i = 0; i < 4; i++) {
        const x = data[i].col * Spacing;
        const y = data[i].row * Spacing;
        const color = leftModel.currentBlock.color;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(x, y, Spacing, Spacing);
        ctx.fillStyle = color;
        ctx.fillRect(x+1, y+1, Spacing-2, Spacing-2);
    }
    for (let i = 0; i < 4; i++) {
        const x = nextdata[i].col * Spacing;
        const y = nextdata[i].row * Spacing;
        const color = leftModel.nextBlock.color;
        ctx2.fillStyle = 'rgba(255,255,255,0.1)';
        ctx2.fillRect(x, y, Spacing, Spacing);
        ctx2.fillStyle = color;
        ctx2.fillRect(x+1, y+1, Spacing-2, Spacing-2);
    }
}

// 双页面右侧绘制函数
function paintDualRight() {
    if (!rightModel) return;
    const main = document.getElementById('dualRightMain');
    const next = document.getElementById('dualRightNext');
    const map = rightModel.map;
    const data = rightModel.currentBlock.translate(rightModel.row, rightModel.col);
    const nextdata = rightModel.nextBlock.translate(1, 2);
    const ctx = main.getContext('2d');
    ctx.clearRect(0, 0, main.width, main.height);
    const ctx2 = next.getContext('2d');
    ctx2.clearRect(0, 0, next.width, next.height);

    for (let row = 0; row < map.height; row++) {
        for (let col = 0; col < map.width; col++) {
            const shape_id = map.lines[row][col];
            if (shape_id !== NoShape) {
                const x = col * Spacing;
                const y = row * Spacing;
                const color = Colors[shape_id];
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                ctx.fillRect(x, y, Spacing, Spacing);
                ctx.fillStyle = color;
                ctx.fillRect(x+1, y+1, Spacing-2, Spacing-2);
            }
        }
    }
    for (let i = 0; i < 4; i++) {
        const x = data[i].col * Spacing;
        const y = data[i].row * Spacing;
        const color = rightModel.currentBlock.color;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(x, y, Spacing, Spacing);
        ctx.fillStyle = color;
        ctx.fillRect(x+1, y+1, Spacing-2, Spacing-2);
    }
    for (let i = 0; i < 4; i++) {
        const x = nextdata[i].col * Spacing;
        const y = nextdata[i].row * Spacing;
        const color = rightModel.nextBlock.color;
        ctx2.fillStyle = 'rgba(255,255,255,0.1)';
        ctx2.fillRect(x, y, Spacing, Spacing);
        ctx2.fillStyle = color;
        ctx2.fillRect(x+1, y+1, Spacing-2, Spacing-2);
    }
}

// 双人对战左侧绘制函数
function paintTwoPlayerLeft() {
    if (!twoPlayerLeftModel) return;
    const main = document.getElementById('twoPlayerLeftMain');
    const next = document.getElementById('twoPlayerLeftNext');
    const map = twoPlayerLeftModel.map;
    const data = twoPlayerLeftModel.currentBlock.translate(twoPlayerLeftModel.row, twoPlayerLeftModel.col);
    const nextdata = twoPlayerLeftModel.nextBlock.translate(1, 2);
    const ctx = main.getContext('2d');
    ctx.clearRect(0, 0, main.width, main.height);
    const ctx2 = next.getContext('2d');
    ctx2.clearRect(0, 0, next.width, next.height);

    for (let row = 0; row < map.height; row++) {
        for (let col = 0; col < map.width; col++) {
            const shape_id = map.lines[row][col];
            if (shape_id !== NoShape) {
                const x = col * Spacing;
                const y = row * Spacing;
                const color = Colors[shape_id];
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                ctx.fillRect(x, y, Spacing, Spacing);
                ctx.fillStyle = color;
                ctx.fillRect(x+1, y+1, Spacing-2, Spacing-2);
            }
        }
    }
    for (let i = 0; i < 4; i++) {
        const x = data[i].col * Spacing;
        const y = data[i].row * Spacing;
        const color = twoPlayerLeftModel.currentBlock.color;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(x, y, Spacing, Spacing);
        ctx.fillStyle = color;
        ctx.fillRect(x+1, y+1, Spacing-2, Spacing-2);
    }
    for (let i = 0; i < 4; i++) {
        const x = nextdata[i].col * Spacing;
        const y = nextdata[i].row * Spacing;
        const color = twoPlayerLeftModel.nextBlock.color;
        ctx2.fillStyle = 'rgba(255,255,255,0.1)';
        ctx2.fillRect(x, y, Spacing, Spacing);
        ctx2.fillStyle = color;
        ctx2.fillRect(x+1, y+1, Spacing-2, Spacing-2);
    }
}

// 双人对战右侧绘制函数
function paintTwoPlayerRight() {
    if (!twoPlayerRightModel) return;
    const main = document.getElementById('twoPlayerRightMain');
    const next = document.getElementById('twoPlayerRightNext');
    const map = twoPlayerRightModel.map;
    const data = twoPlayerRightModel.currentBlock.translate(twoPlayerRightModel.row, twoPlayerRightModel.col);
    const nextdata = twoPlayerRightModel.nextBlock.translate(1, 2);
    const ctx = main.getContext('2d');
    ctx.clearRect(0, 0, main.width, main.height);
    const ctx2 = next.getContext('2d');
    ctx2.clearRect(0, 0, next.width, next.height);

    for (let row = 0; row < map.height; row++) {
        for (let col = 0; col < map.width; col++) {
            const shape_id = map.lines[row][col];
            if (shape_id !== NoShape) {
                const x = col * Spacing;
                const y = row * Spacing;
                const color = Colors[shape_id];
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                ctx.fillRect(x, y, Spacing, Spacing);
                ctx.fillStyle = color;
                ctx.fillRect(x+1, y+1, Spacing-2, Spacing-2);
            }
        }
    }
    for (let i = 0; i < 4; i++) {
        const x = data[i].col * Spacing;
        const y = data[i].row * Spacing;
        const color = twoPlayerRightModel.currentBlock.color;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(x, y, Spacing, Spacing);
        ctx.fillStyle = color;
        ctx.fillRect(x+1, y+1, Spacing-2, Spacing-2);
    }
    for (let i = 0; i < 4; i++) {
        const x = nextdata[i].col * Spacing;
        const y = nextdata[i].row * Spacing;
        const color = twoPlayerRightModel.nextBlock.color;
        ctx2.fillStyle = 'rgba(255,255,255,0.1)';
        ctx2.fillRect(x, y, Spacing, Spacing);
        ctx2.fillStyle = color;
        ctx2.fillRect(x+1, y+1, Spacing-2, Spacing-2);
    }
}

// 键盘按下事件处理函数
document.onkeydown = function (evt) {
    evt.preventDefault();
    var key = evt.which;

    // 【优先处理Tab切换】双页面模式Tab键切换操控面板
    if (currentMode === 'dual' && leftModel && rightModel) {
        if (key === 9) { // Tab键
            switchDualGame();
            evt.preventDefault();
            return;
        }
    }

    // 单页面模式按键逻辑
    if (currentMode === 'single' && singleModel && !singleWaiting) {
        switch (key) {
            case 37: case 65: singleModel.left(); paintSingle(); break;
            case 39: case 68: singleModel.right(); paintSingle(); break;
            case 38: case 87: singleModel.rotate(); paintSingle(); break;
            case 40: case 83: 
                singleModel.down(); 
                paintSingle();
                // 按下↓/S时，设置当前方块加速
                singleModel.setCurrentBlockFast(true);
                // 重启定时器（应用加速速度）
                loopSingle();
                break;
            case 32: singleModel.swapNextBlock(); paintSingle(); break;
        }
    } 
    // 双页面模式按键逻辑（关键：增加leftModel/rightModel存在判断）
    else if (currentMode === 'dual' && leftModel && rightModel) {
        // 左侧面板操控
        if (activeDualGame === 'left' && !leftGameOver) {
            switch (key) {
                case 37: case 65: leftModel.left(); paintDualLeft(); break;
                case 39: case 68: leftModel.right(); paintDualLeft(); break;
                case 38: case 87: leftModel.rotate(); paintDualLeft(); break;
                case 40: case 83: 
                    leftModel.down(); 
                    paintDualLeft();
                    leftModel.setCurrentBlockFast(true);
                    loopDualLeft();
                    break;
                case 32: leftModel.swapNextBlock(); paintDualLeft(); break;
            }
        } 
        // 右侧面板操控
        else if (activeDualGame === 'right' && !rightGameOver) {
            switch (key) {
                case 37: case 65: rightModel.left(); paintDualRight(); break;
                case 39: case 68: rightModel.right(); paintDualRight(); break;
                case 38: case 87: rightModel.rotate(); paintDualRight(); break;
                case 40: case 83: 
                    rightModel.down(); 
                    paintDualRight();
                    rightModel.setCurrentBlockFast(true);
                    loopDualRight();
                    break;
                case 32: rightModel.swapNextBlock(); paintDualRight(); break;
            }
        }
    }
    // 双人对战模式按键逻辑
    else if (currentMode === 'twoPlayer' && twoPlayerLeftModel && twoPlayerRightModel) {
        // 左侧玩家：WASD 控制左面板
        if (!twoPlayerLeftGameOver) {
            switch (key) {
                case 65: // A键
                    twoPlayerLeftModel.left(); 
                    paintTwoPlayerLeft(); 
                    break;
                case 68: // D键
                    twoPlayerLeftModel.right(); 
                    paintTwoPlayerLeft(); 
                    break;
                case 87: // W键
                    twoPlayerLeftModel.rotate(); 
                    paintTwoPlayerLeft(); 
                    break;
                case 83: // S键
                    twoPlayerLeftModel.down(); 
                    paintTwoPlayerLeft();
                    twoPlayerLeftModel.setCurrentBlockFast(true);
                    loopTwoPlayerLeft();
                    break;
                case 32: // 空格键
                    twoPlayerLeftModel.swapNextBlock(); 
                    paintTwoPlayerLeft(); 
                    break;
            }
        }

        // 右侧玩家：方向键 控制右面板
        if (!twoPlayerRightGameOver) {
            switch (key) {
                case 37: // ←键
                    twoPlayerRightModel.left(); 
                    paintTwoPlayerRight(); 
                    break;
                case 39: // →键
                    twoPlayerRightModel.right(); 
                    paintTwoPlayerRight(); 
                    break;
                case 38: // ↑键
                    twoPlayerRightModel.rotate(); 
                    paintTwoPlayerRight(); 
                    break;
                case 40: // ↓键
                    twoPlayerRightModel.down(); 
                    paintTwoPlayerRight();
                    twoPlayerRightModel.setCurrentBlockFast(true);
                    loopTwoPlayerRight();
                    break;
                case 32: // 空格键
                    twoPlayerRightModel.swapNextBlock(); 
                    paintTwoPlayerRight(); 
                    break;
            }
        }
    }
};

// 键盘松开事件处理函数（↓/S键松开时恢复当前方块基础速度）
document.onkeyup = function (evt) {
    evt.preventDefault();
    var key = evt.which;

    // 仅处理↓（40）和S（83）键
    if (key !== 40 && key !== 83) return;

    // 单页面模式：恢复基础速度
    if (currentMode === 'single' && singleModel && !singleWaiting) {
        singleModel.setCurrentBlockFast(false);
        // 重启定时器（应用新速度）
        loopSingle();
    } 
    // 双页面模式：恢复当前激活面板的基础速度
    else if (currentMode === 'dual' && leftModel && rightModel) {
        if (activeDualGame === 'left' && !leftGameOver) {
            leftModel.setCurrentBlockFast(false);
            loopDualLeft();
        } else if (activeDualGame === 'right' && !rightGameOver) {
            rightModel.setCurrentBlockFast(false);
            loopDualRight();
        }
    }
    // 双人对战模式：恢复对应玩家的基础速度
    else if (currentMode === 'twoPlayer' && twoPlayerLeftModel && twoPlayerRightModel) {
        // 左侧玩家（S键）
        if (key === 83 && !twoPlayerLeftGameOver) {
            twoPlayerLeftModel.setCurrentBlockFast(false);
            loopTwoPlayerLeft();
        }
        // 右侧玩家（↓键）
        if (key === 40 && !twoPlayerRightGameOver) {
            twoPlayerRightModel.setCurrentBlockFast(false);
            loopTwoPlayerRight();
        }
    }
};

// 消除特效创建函数（全局作用域）
function createEliminateEffect() {
    // 根据当前模式获取游戏画布
    let gameCanvas;
    if (currentMode === 'single') {
        gameCanvas = document.getElementById('singleMain');
    } else if (currentMode === 'dual') {
        gameCanvas = activeDualGame === 'left' 
            ? document.getElementById('dualLeftMain') 
            : document.getElementById('dualRightMain');
    } else if (currentMode === 'twoPlayer') {
        // 双人模式下根据当前操作的玩家选择画布
        gameCanvas = document.getElementById('twoPlayerLeftMain');
    }
    if (!gameCanvas) return;

    const container = gameCanvas.parentElement;

    // 创建左侧特效
    const leftEffect = document.createElement('div');
    leftEffect.className = 'eliminate-effect';
    leftEffect.style.position = 'absolute';
    leftEffect.style.left = '0';
    leftEffect.style.top = '50%';
    leftEffect.style.transform = 'translate(-50%, -50%)';
    container.appendChild(leftEffect);

    // 创建右侧特效
    const rightEffect = document.createElement('div');
    rightEffect.className = 'eliminate-effect';
    rightEffect.style.position = 'absolute';
    rightEffect.style.right = '0';
    rightEffect.style.top = '50%';
    rightEffect.style.transform = 'translate(50%, -50%)';
    container.appendChild(rightEffect);

    // 动画结束后移除元素（避免DOM堆积）
    setTimeout(() => {
        leftEffect.remove();
        rightEffect.remove();
    }, 800);
}