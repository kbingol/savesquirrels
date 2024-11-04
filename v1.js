const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Tam ekran yapmak için canvas boyutunu pencere boyutuna ayarlayalım
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();

// Pencere boyutlandığında canvas boyutunu güncelle
window.addEventListener('resize', resizeCanvas);

// Ekran boyutları
let SCREEN_WIDTH = canvas.width;
let SCREEN_HEIGHT = canvas.height;

// Oyuncu ayarları
const playerSize = 50;
const playerRadius = playerSize / 2;
const playerPos = {
    x: SCREEN_WIDTH / 2,
    y: SCREEN_HEIGHT / 2
};

// Oyun değişkenleri
let gameStarted = false;

// Engel ayarları
const enemySize = 50;
const enemyRadius = enemySize / 2;
let enemyList = [];
let enemySpeed = 2; // Hedef hız
let currentSpeed = enemySpeed; // Anlık hız

// Ödül kutusu (sincap) ayarları
const rewardSize = 30;
const rewardRadius = rewardSize / 2;
let rewardList = [];

// Oyun ayarları
const gameTime = 60; // saniye
let score = 0;
let gameOver = false;
let startTime = null;

// Hareket açısı (radyan cinsinden)
let movementAngle = (225 * Math.PI) / 180; // Başlangıçta sol üste (225 derece)
let targetAngle = movementAngle;

// Ses dosyalarını yükle
const collectSound = new Audio('collect.wav'); // Sincap toplama sesi
const waitingMusic = new Audio('waiting_music.mp3'); // Bekleme ekranı müziği
const startSound = new Audio('start_sound.wav'); // Oyuna başlama sesi
const collisionSound = new Audio('collision_sound.wav'); // Engele çarpma sesi
const successSound = new Audio('success_sound.wav'); // Oyunu başarıyla tamamlama sesi
const retrySound = new Audio('start_sound.wav'); // Yeniden deneme sesi
const gameMusic = new Audio('game_music.mp3'); // Oyun esnasında arka plan müziği

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

// Bekleme ekranı müziğini başlatmak için fonksiyon
function playWaitingMusic() {
    waitingMusic.currentTime = 0;
    waitingMusic.play();
}

// Oyun müziğini durdurmak ve bekleme müziğini başlatmak için fonksiyon
function stopGameMusicAndPlayWaitingMusic() {
    gameMusic.pause();
    gameMusic.currentTime = 0;

    // Bekleme müziğini başlat
    playWaitingMusic();
}

// İlk açılışta bekleme müziğini başlatmak için kullanıcı etkileşimi gereklidir
document.addEventListener('click', () => {
    if (!gameStarted && !waitingMusicPlaying) {
        playWaitingMusic();
    }
}, { once: true });

// Bekleme müziğinin çalıp çalmadığını takip etmek için bayrak
let waitingMusicPlaying = false;

waitingMusic.onplay = () => {
    waitingMusicPlaying = true;
};

waitingMusic.onpause = () => {
    waitingMusicPlaying = false;
};

// **Kontrol Fonksiyonu** (Hem klavye hem de dokunmatik için)
function handleControlInput() {
    if (!gameStarted) {
        // Oyun başlamadan önce kontrol girdisi (oyunu başlat)
        waitingMusic.pause(); // Bekleme müziğini durdur
        waitingMusic.currentTime = 0;

        startSound.play(); // Başlama sesini çal

        gameStarted = true;
        startTime = Date.now();
        gameOver = false; // Oyun bittiğinde yeniden başlamak için
        enemyList = [];   // Engelleri sıfırla
        rewardList = [];  // Ödülleri sıfırla
        score = 0;        // Puanı sıfırla
        movementAngle = targetAngle; // Hareket açısını resetle
        currentSpeed = enemySpeed;   // Hızı resetle

        // Oyun müziğini başlat
        gameMusic.currentTime = 0;
        gameMusic.play();

        gameLoop();
    } else if (!gameOver) {
        // Oyun sırasında akış yönünü değiştirmek için kontrol girdisi
        if (targetAngle === (225 * Math.PI) / 180) {
            targetAngle = (315 * Math.PI) / 180; // Sağ üste (315 derece)
        } else {
            targetAngle = (225 * Math.PI) / 180; // Sol üste (225 derece)
        }
        // Hızı düşür ve tekrar artırmak için ayarla
        currentSpeed *= 0.7; // Hızı %70'e düşür
    } else {
        // Oyun bittiğinde kontrol girdisi (yeniden başlat)
        retrySound.play(); // Yeniden deneme sesini çal

        waitingMusic.pause(); // Bekleme müziğini durdur
        waitingMusic.currentTime = 0;

        gameStarted = true;
        startTime = Date.now();
        gameOver = false;
        enemyList = [];
        rewardList = [];
        score = 0;
        movementAngle = targetAngle;
        currentSpeed = enemySpeed;

        // Oyun müziğini başlat
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
    event.preventDefault(); // Dokunma olayının varsayılan davranışını engelle (örn. ekranı kaydırma)
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
    if (Math.random() < 0.01) {
        const x = Math.random() * (SCREEN_WIDTH - rewardSize);
        const y = SCREEN_HEIGHT - rewardSize;
        rewardList.push({ x, y });
    }
}

function updatePositions() {
    // Hareket açısını hedef açıya doğru yumuşakça güncelle
    const angleDifference = targetAngle - movementAngle;
    movementAngle += angleDifference * 0.1; // 0.1 katsayısı değişimin ne kadar hızlı olacağını belirler

    const cosAngle = Math.cos(movementAngle);
    const sinAngle = Math.sin(movementAngle);

    // Hızı hedef hıza doğru yumuşakça artır
    const speedDifference = enemySpeed - currentSpeed;
    currentSpeed += speedDifference * 0.05; // Hızın ne kadar hızlı artacağını belirler

    // Enemy güncelleme
    enemyList = enemyList.filter(enemy => {
        enemy.x += currentSpeed * cosAngle;
        enemy.y += currentSpeed * sinAngle;

        // Engelin merkezi
        const enemyCenter = {
            x: enemy.x + enemyRadius,
            y: enemy.y + enemyRadius
        };

        // Çarpışma kontrolü
        if (checkCircleCollision(playerPos, playerRadius, enemyCenter, enemyRadius)) {
            collisionSound.play(); // Engele çarpma sesini çal
            gameOver = true;
        }

        // Ekranın dışında kalanları sil
        return enemy.x + enemySize > 0 && enemy.x < SCREEN_WIDTH && enemy.y + enemySize > 0 && enemy.y < SCREEN_HEIGHT;
    });

    // Ödül kutusu (sincap) güncelleme
    rewardList = rewardList.filter(reward => {
        reward.x += currentSpeed * cosAngle;
        reward.y += currentSpeed * sinAngle;

        // Ödülün merkezi
        const rewardCenter = {
            x: reward.x + rewardRadius,
            y: reward.y + rewardRadius
        };

        // Çarpışma kontrolü
        if (checkCircleCollision(playerPos, playerRadius, rewardCenter, rewardRadius)) {
            score += 1;
            // Ses dosyasını çal
            collectSound.currentTime = 0; // Sesin başından çal
            collectSound.play();
            return false; // Ödülü listeden çıkar
        }

        // Ekranın dışında kalanları sil
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

    // Oyuncuyu çiz
    ctx.save();
    // Dönüş merkezini oyuncunun merkezine ayarla
    ctx.translate(playerPos.x, playerPos.y);
    // Oyuncuyu, engellerin geldiği yöne doğru döndür
    ctx.rotate(movementAngle + Math.PI);

    if (playerImageLoaded) {
        // Resim varsa, döndürülmüş halde çiz
        ctx.drawImage(playerImage, -playerSize / 2, -playerSize / 2, playerSize, playerSize);
    } else {
        // Resim yoksa, kareyi döndürülmüş halde çiz
        ctx.fillStyle = 'black';
        ctx.fillRect(-playerSize / 2, -playerSize / 2, playerSize, playerSize);
    }

    ctx.restore();

    // Enemy'leri çiz
    enemyList.forEach(enemy => {
        if (enemyImageLoaded) {
            ctx.drawImage(enemyImage, enemy.x, enemy.y, enemySize, enemySize);
        } else {
            ctx.fillStyle = 'green';
            ctx.fillRect(enemy.x, enemy.y, enemySize, enemySize);
        }
    });

    // Ödül kutularını (sincapları) çiz
    rewardList.forEach(reward => {
        if (rewardImageLoaded) {
            ctx.drawImage(rewardImage, reward.x, reward.y, rewardSize, rewardSize);
        } else {
            ctx.fillStyle = 'brown';
            ctx.fillRect(reward.x, reward.y, rewardSize, rewardSize);
        }
    });

    // Puanı göster (oyun sırasında)
    if (gameStarted && !gameOver) {
        ctx.fillStyle = 'black';
        ctx.font = '20px Arial';
        ctx.fillText('Topladığın sincap sayısı: ' + score, 10, SCREEN_HEIGHT - 20);

        // Süreyi göster
        const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        const remainingTime = Math.max(gameTime - elapsedTime, 0);
        ctx.fillText('Kalan Süre: ' + remainingTime, 10, SCREEN_HEIGHT - 50);
    }

    // Oyun başlamadıysa veya bittiğinde mesajları göster
    if (!gameStarted || gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        ctx.fillStyle = 'white';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';

        if (!gameStarted) {
            ctx.fillText('Sincapları Kurtar! Çığ Geliyor!', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 60);
            ctx.fillText('60 saniye içinde engellere çarpmadan toplayabildiğin kadar sincap topla.', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 20);
            ctx.fillText('Oyuna başlamak için ekrana dokun veya SPACE tuşuna bas.', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 20);
        } else if (gameOver) {
            ctx.fillText('Şu kadar sincap topladın: ' + score, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 20);
            ctx.fillText('Yeniden denemek için ekrana dokun veya SPACE tuşuna bas.', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 20);

            // Oyun bittiğinde bekleme müziğini çal
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
        // Oyun müziğini durdur
        gameMusic.pause();
        gameMusic.currentTime = 0;

        // Eğer engele çarpmadan oyunu bitirdiyse
        const elapsedTime = (Date.now() - startTime) / 1000;
        if (elapsedTime >= gameTime) {
            successSound.play(); // Oyunu başarıyla tamamlama sesi
        }

        // Bekleme müziğini başlat
        if (!waitingMusicPlaying) {
            playWaitingMusic();
        }

        draw();
        return;
    }

    const elapsedTime = (Date.now() - startTime) / 1000;
    if (elapsedTime > gameTime) {
        gameOver = true;

        // Oyun müziğini durdur
        gameMusic.pause();
        gameMusic.currentTime = 0;

        successSound.play(); // Oyunu başarıyla tamamlama sesi

        // Bekleme müziğini başlat
        if (!waitingMusicPlaying) {
            playWaitingMusic();
        }

        draw();
        return;
    }

    // Hız artışı
    enemySpeed = 8 + Math.floor(elapsedTime / 10);

    // Ekran boyutlarını güncelle (pencere boyutlandırıldığında)
    SCREEN_WIDTH = canvas.width;
    SCREEN_HEIGHT = canvas.height;

    // Oyuncunun pozisyonunu güncelle (pencere boyutlandırıldığında)
    playerPos.x = SCREEN_WIDTH / 2;
    playerPos.y = SCREEN_HEIGHT / 2;

    dropEnemies();
    dropRewards();
    updatePositions();
    draw();

    requestAnimationFrame(gameLoop);
}

// Oyun başlamadan önce ilk çizim
draw();
