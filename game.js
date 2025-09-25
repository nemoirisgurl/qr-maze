// --- ตั้งค่าพื้นฐาน ---
const canvas = document.getElementById('maze');
const ctx = canvas.getContext('2d');

const GRID_SIZE = 18; // ปรับขนาดช่องให้เล็กลงเพื่อให้ดูหนาแน่นขึ้น
const PLAYER_SIZE = GRID_SIZE / 1.2;
const PLAYER_SPEED = 1.8;
const MAZE_WIDTH = 25;
const MAZE_HEIGHT = 25;

// --- ฟังก์ชันสร้างแผนที่แบบสุ่ม ---
function generateQRCodeMaze(width, height) {
    width = width % 2 === 0 ? width + 1 : width;
    height = height % 2 === 0 ? height + 1 : height;

    // 1. สร้างตารางที่เต็มไปด้วยกำแพง
    const maze = Array.from({ length: height }, () => Array(width).fill(1));

    // 2. ฟังก์ชันแกะสลักทางเดินหลัก (Recursive Backtracker)
    // ส่วนนี้รับประกันว่าจะมีทางไปถึงเส้นชัยเสมอ
    function carve(x, y) {
        maze[y][x] = 0;
        const directions = [[-2, 0], [2, 0], [0, -2], [0, 2]];
        directions.sort(() => Math.random() - 0.5);
        for (let [dx, dy] of directions) {
            const newX = x + dx;
            const newY = y + dy;
            if (newY > 0 && newY < height - 1 && newX > 0 && newX < width - 1 && maze[newY][newX] === 1) {
                maze[y + dy / 2][x + dx / 2] = 0;
                carve(newX, newY);
            }
        }
    }
    carve(1, 1);

    // 3. ทำให้กำแพงกระจายตัวเหมือน Data Modules
    // สุ่มเปลี่ยนกำแพงบางส่วนให้เป็นทางเดิน
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            if (maze[y][x] === 1) {
                if (Math.random() > 0.55) { // ปรับค่านี้เพื่อเปลี่ยนความหนาแน่น (ยิ่งน้อยยิ่งโล่ง)
                    maze[y][x] = 0;
                }
            }
        }
    }

    // 4. สร้างสัญลักษณ์ QR Code ทับลงไป
    // 'F' หมายถึง Finder Pattern (สัญลักษณ์มุมใหญ่)
    const finderPatternSize = 6;
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

    // 'A' หมายถึง Alignment Pattern (สัญลักษณ์มุมเล็ก)
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

    // 5. กำหนดจุดเริ่มต้นและสิ้นสุดในตำแหน่งที่ปลอดภัย
    maze[finderPatternSize + 1][1] = 'S';
    maze[height - 2][width - 2] = 'E';

    return maze;
}

// เรียกใช้ฟังก์ชันเพื่อสร้างแผนที่
const mazeLayout = generateQRCodeMaze(MAZE_WIDTH, MAZE_HEIGHT);

// กำหนดขนาด Canvas ให้พอดีกับแผนที่
canvas.width = mazeLayout[0].length * GRID_SIZE;
canvas.height = mazeLayout.length * GRID_SIZE;

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

// --- ฟังก์ชันวาดภาพ ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    mazeLayout.forEach((row, y) => {
        row.forEach((cell, x) => {
            // กำแพงและสัญลักษณ์ทั้งหมดเป็นสีดำ
            if (cell === 1 || cell === 'F' || cell === 'A') {
                ctx.fillStyle = '#000';
                ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
            } else if (cell === 'E') {
                ctx.fillStyle = '#2ecc71'; // สีเส้นชัย
                ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
            }
        });
    });

    // วาดตัวละคร
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);
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
    let nextX = player.x + player.vx;
    let nextY = player.y + player.vy;
    if (!isWall(nextX, nextY) && !isWall(nextX + PLAYER_SIZE, nextY) && !isWall(nextX, nextY + PLAYER_SIZE) && !isWall(nextX + PLAYER_SIZE, nextY + PLAYER_SIZE)) {
        player.x = nextX;
        player.y = nextY;
    }
    const gridX = Math.floor((player.x + PLAYER_SIZE / 2) / GRID_SIZE);
    const gridY = Math.floor((player.y + PLAYER_SIZE / 2) / GRID_SIZE);
    if (mazeLayout[gridY][gridX] === 'E') {
        location.reload();
    }
    draw();
    requestAnimationFrame(update);
}
const joystick = nipplejs.create({ zone: document.getElementById('joystickWrapper'), mode: 'static', position: { left: '50%', top: '50%' }, color: 'white', size: 120 });
joystick.on('move', (evt, data) => {
    player.vx = Math.cos(data.angle.radian) * PLAYER_SPEED;
    player.vy = -Math.sin(data.angle.radian) * PLAYER_SPEED;
});
joystick.on('end', () => { player.vx = 0; player.vy = 0; });
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

