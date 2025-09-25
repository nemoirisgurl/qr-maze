// --- ตั้งค่าพื้นฐาน ---
const canvas = document.getElementById('maze');
const ctx = canvas.getContext('2d');
const winningMsg = document.getElementById('winningMsg');

let GRID_SIZE;
const PLAYER_SPEED = 2.4;
const MAZE_WIDTH = 39;   // เพิ่มขนาด maze
const MAZE_HEIGHT = 39;  // เพิ่มขนาด maze


// --- ฟังก์ชันสร้างแผนที่แบบสุ่ม ---
function generateQRCodeMaze(width, height) {
    width = width % 2 === 0 ? width + 1 : width;
    height = height % 2 === 0 ? height + 1 : height;

    // 1. สร้าง maze หลักด้วย recursive backtracking (1=wall, 0=path)
    const maze = Array.from({ length: height }, () => Array(width).fill(1));
    function carve(x, y) {
        maze[y][x] = 0;
        const directions = [[-2, 0], [2, 0], [0, -2], [0, 2]];
        directions.sort(() => Math.random() - 0.5);
        for (let [dx, dy] of directions) {
            const nx = x + dx, ny = y + dy;
            if (ny > 0 && ny < height - 1 && nx > 0 && nx < width - 1 && maze[ny][nx] === 1) {
                maze[y + dy / 2][x + dx / 2] = 0;
                carve(nx, ny);
            }
        }
    }
    carve(1, 1);

    // --- สร้างทางปลอม (dead end) ---
    const fakePathCount = Math.floor((width * height) / 18); // จำนวนทางปลอม
    for (let i = 0; i < fakePathCount; i++) {
        // สุ่มหาทางเดินใน maze
        let px, py, tries = 0;
        do {
            px = Math.floor(Math.random() * (width - 2)) + 1;
            py = Math.floor(Math.random() * (height - 2)) + 1;
            tries++;
        } while (
            (maze[py][px] !== 0 || (px === 1 && py === 1)) && tries < 100
        );
        if (maze[py][px] !== 0) continue;

        // หาทิศที่เป็นกำแพงติดกับทางเดิน
        const dirs = [
            [0, -1], [1, 0], [0, 1], [-1, 0]
        ].filter(([dx, dy]) => maze[py + dy][px + dx] === 1);

        if (dirs.length > 0) {
            const [dx, dy] = dirs[Math.floor(Math.random() * dirs.length)];
            // เจาะกำแพงเป็นทางเดิน (สร้างทางปลอม)
            maze[py + dy][px + dx] = 0;
        }
    }

    // 2. วาง Finder/Alignment Pattern ทับ (ทับได้เฉพาะกำแพง/ช่องว่าง ไม่ทับ S/E)
    const finderPatternSize = 9;
    function createFinderPattern(startX, startY) {
        for (let y = 0; y < finderPatternSize; y++) {
            for (let x = 0; x < finderPatternSize; x++) {
                if (x === 0 || x === finderPatternSize - 1 || y === 0 || y === finderPatternSize - 1) {
                    maze[startY + y][startX + x] = 'F';
                } else if (x > 1 && x < finderPatternSize - 2 && y > 1 && y < finderPatternSize - 2) {
                    maze[startY + y][startX + x] = 'F';
                } else {
                    maze[startY + y][startX + x] = 0;
                }
            }
        }
    }
    createFinderPattern(1, 1);
    createFinderPattern(width - finderPatternSize - 1, 1);
    createFinderPattern(1, height - finderPatternSize - 1);

    const alignmentPatternSize = 3;
    const apX = width - finderPatternSize - Math.floor(alignmentPatternSize / 2) - 1;
    const apY = height - finderPatternSize - Math.floor(alignmentPatternSize / 2) - 1;
    function createAlignmentPattern(startX, startY) {
        for (let y = 0; y < alignmentPatternSize; y++) {
            for (let x = 0; x < alignmentPatternSize; x++) {
                maze[startY + y][startX + x] = 'A';
            }
        }
    }
    createAlignmentPattern(apX, apY);

    // 3. กำหนดจุดเริ่มต้นและสิ้นสุดในตำแหน่งที่ปลอดภัย (บนเส้นทางแน่นอน)
    maze[finderPatternSize + 1][1] = 'S';
    maze[height - 2][width - 2] = 'E';

    // 4. (ไม่เพิ่มกับดักสุ่มหรือสุ่มกำแพงทับ maze หลัก)
    // ถ้าต้องการเพิ่มกับดัก ให้แน่ใจว่าไม่ทับเส้นทางจาก S ไป E

    return maze;
}

// เรียกใช้ฟังก์ชันเพื่อสร้างแผนที่

// --- Responsive Maze Size ---
function getGridSize() {
    // ขนาด maze
    const mazeCols = MAZE_WIDTH;
    const mazeRows = MAZE_HEIGHT;
    // ขนาดจอ (ลด margin เผื่อจอยสติ๊ก)
    const maxW = Math.min(window.innerWidth, 600);
    const maxH = (window.innerHeight - 180);
    // ขนาดช่องที่ใหญ่ที่สุดที่ยังไม่ล้นจอ
    return Math.floor(Math.min(maxW / mazeCols, maxH / mazeRows));
}
GRID_SIZE = getGridSize();
const PLAYER_SIZE = GRID_SIZE / 1.3;

// กำหนดขนาด Canvas ให้พอดีกับแผนที่

let savedGame = JSON.parse(localStorage.getItem("mazeSave"));
let mazeLayout, startTime, winTime;
if (savedGame && !savedGame.winTime) {
    mazeLayout = savedGame.mazeLayout;
    startTime = savedGame.startTime;
    winTime = savedGame.winTime;
} else {
    mazeLayout = generateQRCodeMaze(MAZE_WIDTH, MAZE_HEIGHT);
    startTime = Date.now();
    winTime = null;
    console.log("สร้าง maze ใหม่");
}

// --- ตัวละคร ---
let startPos = { x: 0, y: 0 };
mazeLayout.forEach((row, y) => {
    row.forEach((cell, x) => {
        if (cell === 'S') {
            startPos = { x: x * GRID_SIZE + (GRID_SIZE - PLAYER_SIZE) / 2, y: y * GRID_SIZE + (GRID_SIZE - PLAYER_SIZE) / 2 };
        }
    });
});
const player = { x: startPos.x, y: startPos.y, vx: 0, vy: 0 };

if (savedGame && !savedGame.winTime && savedGame.player) 
{
    player.x = savedGame.player.x;
    player.y = savedGame.player.y;
}



canvas.width = mazeLayout[0].length * GRID_SIZE;
canvas.height = mazeLayout.length * GRID_SIZE;
// --- ฟังก์ชันวาดภาพ ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    mazeLayout.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (cell === 1 || cell === 'F' || cell === 'A') {
                ctx.fillStyle = '#000';
                ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
            } else if (cell === 'E') {
                ctx.fillStyle = '#2ecc71';
                ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
            }
        });
    });

    // วาดตัวละคร
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);

    // ถ้าชนะ ให้โชว์เวลา
    if (winTime !== null) {
        ctx.save();
        ctx.font = `bold ${Math.floor(GRID_SIZE * 1.2)}px sans-serif`;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const seconds = ((winTime - startTime) / 1000).toFixed(2);
        winningMsg.textContent = `คุณชนะ! ใช้เวลา ${seconds} วินาที`;
        ctx.restore();
    }
}

// --- ฟังก์ชันเช็คการชนกำแพง ---
function isWall(x, y) {
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return true;
    const gridX = Math.floor(x / GRID_SIZE);
    const gridY = Math.floor(y / GRID_SIZE);
    const cell = mazeLayout[gridY][gridX];
    // ชนได้ทุกสัญลักษณ์ที่เป็นกำแพง
    return cell === 1 || cell === 'F' || cell === 'A';
}

// --- Game Loop และส่วนควบคุมจอยสติ๊ก (เหมือนเดิม) ---
function update() {
    if (winTime !== null) {
        draw();
        return; // หยุดเกมเมื่อชนะ
    }
    let nextX = player.x + player.vx;
    let nextY = player.y + player.vy;
    if (!isWall(nextX, nextY) && !isWall(nextX + PLAYER_SIZE, nextY) && !isWall(nextX, nextY + PLAYER_SIZE) && !isWall(nextX + PLAYER_SIZE, nextY + PLAYER_SIZE)) {
        player.x = nextX;
        player.y = nextY;
    }
    const gridX = Math.floor((player.x + PLAYER_SIZE / 2) / GRID_SIZE);
    const gridY = Math.floor((player.y + PLAYER_SIZE / 2) / GRID_SIZE);
    if (mazeLayout[gridY][gridX] === 'E') {
        winTime = Date.now();
    }
    draw();
    requestAnimationFrame(update);
}

function resetMaze() {
    mazeLayout = generateQRCodeMaze(MAZE_WIDTH, MAZE_HEIGHT);
    // หา Start จุดใหม่
    mazeLayout.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (cell === 'S') {
                player.x = x * GRID_SIZE + (GRID_SIZE - PLAYER_SIZE) / 2;
                player.y = y * GRID_SIZE + (GRID_SIZE - PLAYER_SIZE) / 2;
                player.vx = 0;
                player.vy = 0;
            }
        });
    });

    startTime = Date.now();
    winTime = null;
    winningMsg.textContent = '';
    localStorage.removeItem("mazeSave");
    draw();
}

function saveGame() {
    localStorage.setItem("mazeSave", JSON.stringify({
        mazeLayout,
        startTime,
        winTime,
        player: { x: player.x, y: player.y }
    }));
}
window.addEventListener("beforeunload", saveGame);


window.resetMaze = resetMaze;
const joystick = nipplejs.create({
    zone: document.getElementById('joystickWrapper'),
    mode: 'static',
    position: { left: '50%', top: '50%' },
    color: 'white',
    size: 120
});

// ใช้ทิศหลัก 4 ทิศ แทนที่จะเป็นการไหลอิสระ
joystick.on('move', (evt, data) => {
    const angle = data.angle.degree;
    if (angle >= 45 && angle < 135) {        // ขึ้น
        player.vx = 0;
        player.vy = -PLAYER_SPEED;
    } else if (angle >= 135 && angle < 225) { // ซ้าย
        player.vx = -PLAYER_SPEED;
        player.vy = 0;
    } else if (angle >= 225 && angle < 315) { // ลง
        player.vx = 0;
        player.vy = PLAYER_SPEED;
    } else {                                 // ขวา
        player.vx = PLAYER_SPEED;
        player.vy = 0;
    }
});

// ปล่อยจอย → หยุดสนิท
joystick.on('end', () => {
    player.vx = 0;
    player.vy = 0;
});
update();

// --- Gyroscope Controls ---
let gyroEnabled = false;
let lastGamma = 0, lastBeta = 0;
const GYRO_SENSITIVITY = 0.045; // ปรับความไว

// ปุ่มเปิด/ปิด gyroscope
const gyroBtn = document.createElement('button');
gyroBtn.textContent = 'เปิด Gyroscope';
gyroBtn.style.position = 'fixed';
gyroBtn.style.top = '20px';
gyroBtn.style.right = '20px';
gyroBtn.style.zIndex = 10;
gyroBtn.style.fontSize = '1.1em';
gyroBtn.style.padding = '8px 16px';
gyroBtn.style.background = '#222';
gyroBtn.style.color = '#fff';
gyroBtn.style.border = '2px solid #fff';
gyroBtn.style.borderRadius = '8px';
gyroBtn.style.cursor = 'pointer';
document.body.appendChild(gyroBtn);

gyroBtn.onclick = async () => {
    if (!gyroEnabled) {
        // สำหรับ iOS ต้องขอ permission
        if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
            try {
                const response = await DeviceOrientationEvent.requestPermission();
                if (response !== "granted") return;
            } catch (e) { return; }
        }
        gyroEnabled = true;
        gyroBtn.textContent = 'ปิด Gyroscope';
    } else {
        gyroEnabled = false;
        player.vx = 0; player.vy = 0;
        gyroBtn.textContent = 'เปิด Gyroscope';
    }
};

window.addEventListener('deviceorientation', (event) => {
    if (!gyroEnabled) return;
    // gamma = ซ้าย/ขวา, beta = ก้ม/เงย
    let gamma = event.gamma || 0;
    let beta = event.beta || 0;
    // ป้องกัน jitter
    if (Math.abs(gamma - lastGamma) < 1 && Math.abs(beta - lastBeta) < 1) return;
    lastGamma = gamma; lastBeta = beta;
    // ปรับทิศทางให้เหมาะกับแนวนอน/แนวตั้ง
    player.vx = gamma * GYRO_SENSITIVITY;
    player.vy = beta * GYRO_SENSITIVITY;
});

window.addEventListener('touchend', () => {
    if (gyroEnabled) {
        player.vx = 0; player.vy = 0;
    }
});

// --- อัปเดตขนาดเมื่อเปลี่ยนขนาดจอ ---
window.addEventListener('resize', () => {
    GRID_SIZE = getGridSize();
    canvas.width = mazeLayout[0].length * GRID_SIZE;
    canvas.height = mazeLayout.length * GRID_SIZE;
    // คำนวณตำแหน่ง player ในหน่วยกริด (ใช้ค่ากลางของ player)
    const gridX = (player.x + PLAYER_SIZE / 2) / GRID_SIZE;
    const gridY = (player.y + PLAYER_SIZE / 2) / GRID_SIZE;
    // อัปเดต PLAYER_SIZE ตาม GRID_SIZE ใหม่
    PLAYER_SIZE = GRID_SIZE / 1.3;
    // แปลงกลับมาเป็นพิกัดพิกเซล โดยวางตรงกลางช่อง
    player.x = gridX * GRID_SIZE - PLAYER_SIZE / 2;
    player.y = gridY * GRID_SIZE - PLAYER_SIZE / 2;

    draw();
});


