const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas to full screen dimensions
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();

// Update canvas size when window resizes
window.addEventListener('resize', resizeCanvas);

// Screen dimensions
let SCREEN_WIDTH = canvas.width;
let SCREEN_HEIGHT = canvas.height;

// Player settings
const playerSize = 50;
const playerRadius = playerSize / 2;
const playerPos = {
    x: SCREEN_WIDTH / 2,
    y: SCREEN_HEIGHT / 2
};

// Game variables
let gameStarted = false;

// Enemy settings
const enemySize = 50;
const enemyRadius = enemySize / 2;
let enemyList = [];
let enemySpeed = 2; // Target speed
let currentSpeed = enemySpeed; // Current speed

// Reward (squirrel) settings
const rewardSize = 30;
const rewardRadius = rewardSize / 2;
let rewardList = [];

// Game settings
const gameTime = 60; // seconds
let score = 0;
let gameOver = false;
let startTime = null;

// Movement angle (in radians)
let movementAngle = (225 * Math.PI) / 180; // Start towards upper left (225 degrees)
let targetAngle = movementAngle;

// Load audio files
const collectSound = new Audio('collect.wav'); // Squirrel collect sound
const waitingMusic = new Audio('waiting_music.mp3'); // Waiting screen music
const startSound = new Audio('start_sound.wav'); // Game start sound
const collisionSound = new Audio('collision_sound.wav'); // Collision sound
const successSound = new Audio('success_sound.wav'); // Game complete success sound
const retrySound = new Audio('start_sound.wav'); // Retry sound
const gameMusic = new Audio('game_music.mp3'); // Background music during game

// Loop background music
waitingMusic.loop = true;
gameMusic.loop = true;

// Load images
const playerImage = new Image();
playerImage.src = 'player.svg';

const enemyImage = new Image();
enemyImage.src = 'enemy.svg';

const rewardImage = new Image();
rewardImage.src = 'reward.svg';

// Flags to track if images are loaded
let playerImageLoaded = false;
let enemyImageLoaded = false;
let rewardImageLoaded = false;

playerImage.onload = () => {
    playerImageLoaded = true;
};
enemyImage.onload = () => {
    enemyImageLoaded = true;
};
rewardImage.onload = () => {
    rewardImageLoaded = true;
};

// Function to start waiting music
function playWaitingMusic() {
    waitingMusic.currentTime = 0;
    waitingMusic.play();
}

// Function to stop game music and start waiting music
function stopGameMusicAndPlayWaitingMusic() {
    gameMusic.pause();
    gameMusic.currentTime = 0;
    playWaitingMusic();
}

// User interaction required to play initial waiting music
document.addEventListener('click', () => {
    if (!gameStarted && !waitingMusicPlaying) {
        playWaitingMusic();
    }
}, { once: true });

// Track if waiting music is playing
let waitingMusicPlaying = false;

waitingMusic.onplay = () => {
    waitingMusicPlaying = true;
};

waitingMusic.onpause = () => {
    waitingMusicPlaying = false;
};

// **Control Function** (for both keyboard and touch controls)
function handleControlInput() {
    if (!gameStarted) {
        // Control input before game starts (start the game)
        waitingMusic.pause();
        waitingMusic.currentTime = 0;

        startSound.play();

        gameStarted = true;
        startTime = Date.now();
        gameOver = false;
        enemyList = [];
        rewardList = [];
        score = 0;
        movementAngle = targetAngle;
        currentSpeed = enemySpeed;

        // Start game music
        gameMusic.currentTime = 0;
        gameMusic.play();

        gameLoop();
    } else if (!gameOver) {
        // Change direction during the game
        if (targetAngle === (225 * Math.PI) / 180) {
            targetAngle = (315 * Math.PI) / 180; // Upper right (315 degrees)
        } else {
            targetAngle = (225 * Math.PI) / 180; // Upper left (225 degrees)
        }
        currentSpeed *= 0.7; // Slow down to 70% temporarily
    } else {
        // Control input to restart game after game over
        retrySound.play();

        waitingMusic.pause();
        waitingMusic.currentTime = 0;

        gameStarted = true;
        startTime = Date.now();
        gameOver = false;
        enemyList = [];
        rewardList = [];
        score = 0;
        movementAngle = targetAngle;
        currentSpeed = enemySpeed;

        gameMusic.currentTime = 0;
        gameMusic.play();

        gameLoop();
    }
}

// **Keyboard control**
document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        handleControlInput();
    }
});

// **Touch control**
canvas.addEventListener('touchstart', (event) => {
    event.preventDefault();
    handleControlInput();
});

// **Mouse click control (for desktop)**
canvas.addEventListener('mousedown', (event) => {
    handleControlInput();
});

function dropEnemies() {
    if (enemyList.length < 10 && Math.random() < 0.05) {
        const x = Math.random() * (SCREEN_WIDTH - enemySize);
        const y = SCREEN_HEIGHT - enemySize;
        enemyList.push({ x, y });
    }
}

function dropRewards() {
    if (Math.random() < 0.01) {
        const x = Math.random() * (SCREEN_WIDTH - rewardSize);
        const y = SCREEN_HEIGHT - rewardSize;
        rewardList.push({ x, y });
    }
}

function updatePositions() {
    const angleDifference = targetAngle - movementAngle;
    movementAngle += angleDifference * 0.1;

    const cosAngle = Math.cos(movementAngle);
    const sinAngle = Math.sin(movementAngle);

    const speedDifference = enemySpeed - currentSpeed;
    currentSpeed += speedDifference * 0.05;

    // Update enemy positions
    enemyList = enemyList.filter(enemy => {
        enemy.x += currentSpeed * cosAngle;
        enemy.y += currentSpeed * sinAngle;

        const enemyCenter = {
            x: enemy.x + enemyRadius,
            y: enemy.y + enemyRadius
        };

        if (checkCircleCollision(playerPos, playerRadius, enemyCenter, enemyRadius)) {
            collisionSound.play();
            gameOver = true;
        }

        return enemy.x + enemySize > 0 && enemy.x < SCREEN_WIDTH && enemy.y + enemySize > 0 && enemy.y < SCREEN_HEIGHT;
    });

    // Update reward positions
    rewardList = rewardList.filter(reward => {
        reward.x += currentSpeed * cosAngle;
        reward.y += currentSpeed * sinAngle;

        const rewardCenter = {
            x: reward.x + rewardRadius,
            y: reward.y + rewardRadius
        };

        if (checkCircleCollision(playerPos, playerRadius, rewardCenter, rewardRadius)) {
            score += 1;
            collectSound.currentTime = 0;
            collectSound.play();
            return false;
        }

        return reward.x + rewardSize > 0 && reward.x < SCREEN_WIDTH && reward.y + rewardSize > 0 && reward.y < SCREEN_HEIGHT;
    });
}

// Circle collision detection function
function checkCircleCollision(pos1, radius1, pos2, radius2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const distance = Math.hypot(dx, dy);
    return distance < (radius1 + radius2);
}

function draw() {
    ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    ctx.save();
    ctx.translate(playerPos.x, playerPos.y);
    ctx.rotate(movementAngle + Math.PI);

    if (playerImageLoaded) {
        ctx.drawImage(playerImage, -playerSize / 2, -playerSize / 2, playerSize, playerSize);
    } else {
        ctx.fillStyle = 'black';
        ctx.fillRect(-playerSize / 2, -playerSize / 2, playerSize, playerSize);
    }

    ctx.restore();

    // Draw enemies
    enemyList.forEach(enemy => {
        if (enemyImageLoaded) {
            ctx.drawImage(enemyImage, enemy.x, enemy.y, enemySize, enemySize);
        } else {
            ctx.fillStyle = 'green';
            ctx.fillRect(enemy.x, enemy.y, enemySize, enemySize);
        }
    });

    // Draw rewards
    rewardList.forEach(reward => {
        if (rewardImageLoaded) {
            ctx.drawImage(rewardImage, reward.x, reward.y, rewardSize, rewardSize);
        } else {
            ctx.fillStyle = 'brown';
            ctx.fillRect(reward.x, reward.y, rewardSize, rewardSize);
        }
    });

    if (gameStarted && !gameOver) {
        ctx.fillStyle = 'black';
        ctx.font = '20px Arial';
        ctx.fillText('Collected squirrels: ' + score, 10, SCREEN_HEIGHT - 20);

        const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        const remainingTime = Math.max(gameTime - elapsedTime, 0);
        ctx.fillText('Time remaining: ' + remainingTime, 10, SCREEN_HEIGHT - 50);
    }

    if (!gameStarted || gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        ctx.fillStyle = 'white';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';

        if (!gameStarted) {
            ctx.fillText('Save the squirrels! Avalanche incoming!', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 60);
            ctx.fillText('Collect as many squirrels as you can without crashing in 60 seconds.', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 20);
            ctx.fillText('Tap screen or press SPACE to start.', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 20);
        } else if (gameOver) {
            ctx.fillText('Squirrels collected: ' + score, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 20);
            ctx.fillText('Tap screen or press SPACE to try again.', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 20);

            if (!waitingMusicPlaying) {
                playWaitingMusic();
            }
        }
    }
}

function gameLoop() {
    if (!gameStarted) {
        draw();
        requestAnimationFrame(gameLoop);
        return;
    }

    if (gameOver) {
        gameMusic.pause();
        gameMusic.currentTime = 0;

        const elapsedTime = (Date.now() - startTime) / 1000;
        if (elapsedTime >= gameTime) {
            successSound.play();
        }

        if (!waitingMusicPlaying) {
            playWaitingMusic();
        }

        draw();
        return;
    }

    const elapsedTime = (Date.now() - startTime) / 1000;
    if (elapsedTime > gameTime) {
        gameOver = true;
        gameMusic.pause();
        gameMusic.currentTime = 0;
        successSound.play();

        if (!waitingMusicPlaying) {
            playWaitingMusic();
        }

        draw();
        return;
    }

    enemySpeed = 8 + Math.floor(elapsedTime / 10);

    SCREEN_WIDTH = canvas.width;
    SCREEN_HEIGHT = canvas.height;

    playerPos.x = SCREEN_WIDTH / 2;
    playerPos.y = SCREEN_HEIGHT / 2;

    dropEnemies();
    dropRewards();
    updatePositions();
    draw();

    requestAnimationFrame(gameLoop);
}

draw();
