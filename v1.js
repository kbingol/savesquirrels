const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Ekran boyutları
let SCREEN_WIDTH = canvas.width;
let SCREEN_HEIGHT = canvas.height;

// Boyutları dinamik hale getirmek için değişkenler
let playerSize;
let playerRadius;
let enemySize;
let enemyRadius;
let rewardSize;
let rewardRadius;

// Oyuncu pozisyonu
const playerPos = {
    x: SCREEN_WIDTH / 2,
    y: SCREEN_HEIGHT / 2
};

// Oyun değişkenleri
let gameStarted = false;
let enemyList = [];
let enemySpeed = 2; // Hedef hız
let currentSpeed = enemySpeed; // Anlık hız
let rewardList = [];
let gameTime = 60; // saniye
let score = 0;
let gameOver = false;
let startTime = null;
let movementAngle = (225 * Math.PI) / 180; // Başlangıçta sol üste (225 derece)
let targetAngle = movementAngle;

// Ses dosyalarını yükle
const collectSound = new Audio('collect.wav');
const waitingMusic = new Audio('waiting_music.mp3');
const startSound = new Audio('start_sound.wav');
const collisionSound = new Audio('collision_sound.wav');
const successSound = new Audio('success_sound.wav');
const retrySound = new Audio('start_sound.wav');
const gameMusic = new Audio('game_music.mp3');

// Müziklerin döngü ayarları
waitingMusic.loop = true;
gameMusic.loop = true;

// Resimleri yükle
const playerImage = new Image();
playerImage.src = 'player.svg';

const enemyImage = new Image();
enemyImage.src = 'enemy.svg';

const rewardImage = new Image();
rewardImage.src = 'reward.svg';

// Resimlerin yüklenip yüklenmediğini kontrol etmek için bayraklar
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

// Bekleme müziği kontrolü için bayrak
let waitingMusicPlaying = false;

waitingMusic.onplay = () => {
    waitingMusicPlaying = true;
};

waitingMusic.onpause = () => {
    waitingMusicPlaying = false;
};

// Canvas boyutlandırma ve boyutları güncelleme fonksiyonu
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    SCREEN_WIDTH = canvas.width;
    SCREEN_HEIGHT = canvas.height;

    updateSizes();
}

// Boyutları ekran boyutuna göre güncelleyen fonksiyon
function updateSizes() {
    let baseUnit = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) / 30; // Ölçeklendirme için taban birim

    playerSize = baseUnit * 2;
    enemySize = baseUnit * 2;
    rewardSize = baseUnit * 1;

    playerRadius = playerSize / 2;
    enemyRadius = enemySize / 2;
    rewardRadius = rewardSize / 2;

    // Oyuncu pozisyonunu güncelle
    playerPos.x = SCREEN_WIDTH / 2;
    playerPos.y = SCREEN_HEIGHT / 2;
}

// İlk boyutlandırmayı yap
resizeCanvas();

// Pencere boyutlandığında canvas boyutunu güncelle
window.addEventListener('resize', resizeCanvas);

// Skor paylaşımı için link oluşturma fonksiyonu
function generateTwitterShareLink(score) {
    const text = `Save the squirrels! I saved ${score} squirrels! 🐿️ Try to beat my score! SaveTheSquirrels`;
    const url = encodeURIComponent('https://kbingol.github.io/savesquirrels/'); // Oyununuzun linkini buraya ekleyin
    return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}`;
}

// Bekleme ekranı müziğini başlatmak için fonksiyon
function playWaitingMusic() {
    waitingMusic.currentTime = 0;
    waitingMusic.play();
}

// İlk açılışta bekleme müziğini başlatmak için kullanıcı etkileşimi gereklidir
document.addEventListener('click', () => {
    if (!gameStarted && !waitingMusicPlaying) {
        playWaitingMusic();
    }
}, { once: true });

// **Kontrol Fonksiyonu** (Hem klavye hem de dokunmatik için)
function handleControlInput() {
    if (!gameStarted) {
        // Oyun başlamadan önce kontrol girdisi (oyunu başlat)
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

        gameMusic.currentTime = 0;
        gameMusic.play();

        gameLoop();
    } else if (!gameOver) {
        if (targetAngle === (225 * Math.PI) / 180) {
            targetAngle = (315 * Math.PI) / 180; // Sağ üste (315 derece)
        } else {
            targetAngle = (225 * Math.PI) / 180; // Sol üste (225 derece)
        }
        currentSpeed *= 0.7;
    } else {
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

// **Klavye kontrolü**
document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        handleControlInput();
    }
});

// **Dokunmatik kontrolü**
canvas.addEventListener('touchstart', (event) => {
    event.preventDefault();
    handleControlInput();
});

// **Fare tıklaması kontrolü (Masaüstü cihazlar için)**
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
    if (Math.random() < 0.02) {
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

// Çember çarpışma kontrol fonksiyonu
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

    enemyList.forEach(enemy => {
        if (enemyImageLoaded) {
            ctx.drawImage(enemyImage, enemy.x, enemy.y, enemySize, enemySize);
        } else {
            ctx.fillStyle = 'green';
            ctx.fillRect(enemy.x, enemy.y, enemySize, enemySize);
        }
    });

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

            // Add Twitter share button with background box
            const shareLink = generateTwitterShareLink(score);
            const boxWidth = SCREEN_WIDTH * 0.4; // Ekran boyutuna göre ayarla
            const boxHeight = SCREEN_HEIGHT * 0.08;

            // Draw background box for the Twitter share button
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; // Semi-transparent black background
            const boxX = SCREEN_WIDTH / 2 - boxWidth / 2;
            const boxY = SCREEN_HEIGHT / 2 + 65;
            ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

            // Draw the share button text
            ctx.font = '20px Arial';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.fillText('Share your score on X:', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 60);
            ctx.fillText('Tap here to share!', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 95);

            // Make the background box clickable
            function onClickTwitterShare(event) {
                const rect = canvas.getBoundingClientRect();
                const clickX = event.clientX - rect.left;
                const clickY = event.clientY - rect.top;

                if (
                    clickX > boxX &&
                    clickX < boxX + boxWidth &&
                    clickY > boxY &&
                    clickY < boxY + boxHeight
                ) {
                    window.open(shareLink, '_blank');
                    canvas.removeEventListener('click', onClickTwitterShare);
                }
            }

            canvas.addEventListener('click', onClickTwitterShare);

            if (!waitingMusicPlaying) {
                playWaitingMusic();
            }
        }
    }
}

function gameLoop() {
    // Ekran boyutu değiştiyse güncelle
    resizeCanvas();

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

    dropEnemies();
    dropRewards();
    updatePositions();
    draw();

    requestAnimationFrame(gameLoop);
}

// Oyun başlamadan önce ilk çizim
draw();
