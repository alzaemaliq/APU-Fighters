const canvas = document.querySelector('canvas');
const c = canvas.getContext('2d');

canvas.width = 1024;
canvas.height = 576;

const gravity = 0.2;
const healthBarWidth = 400; // Width of each health bar
const healthBarY = 10; // Y position of the health bars
const healthBarHeight = 20; // Height of the health bars
const timerHeight = 30; // Height of the timer
const timerY = healthBarY + healthBarHeight + 10; // Y position of the timer (below the health bars)
const initialHealth = 100;
let playerHealth = initialHealth;
let enemyHealth = initialHealth;
let timer = 30; // Timer in seconds
let timerInterval;

// Fill the canvas background
c.fillStyle = 'black';
c.fillRect(0, 0, canvas.width, canvas.height);

// Draw health bar function with modern style
function drawHealthBar(health, x, reverse = false) {
    health = Math.max(0, health); // Ensure health is at least 0

    // Draw the gray background of the health bar
    c.fillStyle = 'rgba(255, 255, 255, 0.2)';
    c.fillRect(x, healthBarY, healthBarWidth, healthBarHeight);
    
    // Draw the health gradient
    const healthGradient = c.createLinearGradient(x, 0, x + healthBarWidth, 0);
    healthGradient.addColorStop(0, '#ff4d4d'); // Red
    healthGradient.addColorStop(1, '#66ff66'); // Green
    
    c.fillStyle = healthGradient;
    const healthWidth = (health / initialHealth) * healthBarWidth;
    if (reverse) {
        c.fillRect(x + (healthBarWidth - healthWidth), healthBarY, healthWidth, healthBarHeight);
    } else {
        c.fillRect(x, healthBarY, healthWidth, healthBarHeight);
    }

    // Add rounded edges to the health bars
    c.lineJoin = 'round';
    c.lineWidth = 5;
    c.strokeStyle = '#fff';
    c.strokeRect(x, healthBarY, healthBarWidth, healthBarHeight);
}

// Modern timer style
function drawTimer() {
    c.font = 'bold 24px Arial';
    c.fillStyle = '#fff'; // White color for timer text
    const timerText = `Time Left: ${Math.max(0, Math.ceil(timer))}s`;
    const textWidth = c.measureText(timerText).width;
    
    // Add rounded rectangle behind the timer for modern look
    const timerX = canvas.width / 2 - textWidth / 2 - 10;
    const timerRectWidth = textWidth + 20;
    
    c.fillStyle = 'rgba(255, 255, 255, 0.2)';
    c.fillRect(timerX, timerY - timerHeight + 5, timerRectWidth, timerHeight); // Rectangle behind the timer

    // Draw the timer text
    c.fillStyle = '#fff';
    c.fillText(timerText, canvas.width / 2 - textWidth / 2, timerY);
}


class Sprite {
    constructor({ position, imageSrc, scale = 1, framesMax = 1, framesHold = 5, offset = {x:0, y: 0} }) {
        this.position = position;
        this.width = 50;
        this.height = 150;
        this.image = new Image();
        this.image.src = imageSrc;
        this.scale = scale;
        this.framesMax = framesMax;
        this.framesCurrent = 0;
        this.framesElapsed = 0;
        this.framesHold = framesHold;
        this.offset = offset;
        this.image.onload = () => {
            // Image is loaded, you can perform any necessary setup here
            this.loaded = true;
        };
        this.loaded = false; // Flag to check if the image is loaded
    }

    draw() {
        if (!this.loaded) return; // Do not draw if image is not loaded
        c.drawImage(
            this.image,
            this.framesCurrent * (this.image.width / this.framesMax),
            0,
            this.image.width / this.framesMax,
            this.image.height,
            this.position.x - this.offset.x,
            this.position.y - this.offset.y,
            (this.image.width / this.framesMax) * this.scale,
            this.image.height * this.scale
        );
    }

    animateFrames() {
        this.framesElapsed++;
        if (this.framesElapsed >= this.framesHold) {
            this.framesElapsed = 0;
            if (this.framesCurrent < this.framesMax - 1) {
                this.framesCurrent++;
            } else {
                this.framesCurrent = 0;
            }
        }
    }
    
    update() {
        this.framesElapsed++;
        if (this.framesElapsed >= this.framesHold) {
            this.framesElapsed = 0;
            if (this.framesCurrent < this.framesMax - 1) {
                this.framesCurrent++;
            } else {
                this.framesCurrent = 0;
            }
        }
        this.draw();
    }
}


class Fighter extends Sprite {
    constructor({ 
        position, 
        velocity, 
        color = 'red', 
        offset, 
        imageSrc, 
        scale = 1, 
        framesMax = 1, 
        framesHold = 5,
        sprites,
        attackBoxOffset = { x: 0, y: 0 },
        attackBoxWidth = 0, 
        attackBoxHeight = 0,
        debugOutlineOffsetX = 0, 
        debugOutlineOffsetY = 0, 
        debugOutlineWidth = 0,   
        debugOutlineHeight = 0 }) {
        super({
            position,
            imageSrc,
            scale,
            framesMax,
            framesHold,
            offset
        });

        this.velocity = velocity;
        this.attackBox = {
            position: {
                x: this.position.x,
                y: this.position.y
            },
            offset: attackBoxOffset,
            width: attackBoxWidth,
            height: attackBoxHeight,
        };
        this.color = color;
        this.isAttacking = false;
        this.jumps = 0; // Tracks the number of jumps
        this.maxJumps = 2; // Maximum number of jumps (double jump limit)
        this.isGrounded = false; // Flag to check if the player is on the ground
        this.sprites = sprites;
        this.currentSprite = 'idle'; // Keep track of the current sprite

        // Initialize sprites
        for (const sprite in sprites) {
            sprites[sprite].image = new Image();
            sprites[sprite].image.src = sprites[sprite].imageSrc;
        }

        this.debugOutlineOffsetX = debugOutlineOffsetX;
        this.debugOutlineOffsetY = debugOutlineOffsetY;
        this.debugOutLineWidth = -debugOutlineWidth;
        this.debugOutlineHeight = -debugOutlineHeight;
    }

    setAnimation(animation) {
        if (this.currentSprite !== animation) {
            this.currentSprite = animation;
            this.image = this.sprites[animation].image;
            this.framesMax = this.sprites[animation].framesMax;
            this.framesCurrent = 0; // Reset frames
            this.framesElapsed = 0; // Reset frames elapsed
        }
    }

    drawOutline() {
        c.strokeStyle = 'rgba(0, 255, 0, 0.5)'; // Color of the outline (green with opacity)
        c.lineWidth = 2; // Width of the rectangle border
        c.strokeRect(
            this.position.x - this.offset.x + this.debugOutlineOffsetX,
            this.position.y - this.offset.y + this.debugOutlineOffsetY,
            this.width * this.scale + this.debugOutLineWidth,
            this.height * this.scale + this.debugOutlineHeight,
        );
    }

    drawAttackBox() {
        c.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // Color of the hitbox outline (red with opacity)
        c.lineWidth = 2; // Width of the rectangle border
        c.strokeRect(
            this.attackBox.position.x - this.offset.x,
            this.attackBox.position.y - this.offset.y,
            this.attackBox.width,
            this.attackBox.height
        );
    }

    update() {
        this.draw();
        this.animateFrames();
        // Update the attack box position relative to the player
        this.attackBox.position.x = this.position.x + this.attackBox.offset.x;
        this.attackBox.position.y = this.position.y + this.attackBox.offset.y;

        // Update position based on velocity
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        // Apply gravity
        if (this.position.y + this.height + this.velocity.y >= canvas.height - 96) {
            this.velocity.y = 0;
            this.position.y = canvas.height - this.height - 96; // Subtract 96 pixels from the ground position
            this.isGrounded = true; // Player is grounded
            this.jumps = 0; // Reset jump count when grounded
        } else {
            this.velocity.y += gravity;
            this.isGrounded = false; // Player is not grounded
        }

        // Check for horizontal boundaries
        if (this.position.x < 0) {
            this.position.x = 0; // Prevent going past the left boundary
        } else if (this.position.x + this.width > canvas.width) {
            this.position.x = canvas.width - this.width; // Prevent going past the right boundary
        }
        this.drawOutline();
        this.drawAttackBox();
    }

    jump() {
        if (this.jumps < this.maxJumps) {
            this.velocity.y = jumpSpeed; // Set jump velocity
            this.jumps += 1; // Increment jump count
        }
    }

    attack() {
        this.isAttacking = true;
        setTimeout(() => {
            this.isAttacking = false;
            this.setAnimation('idle'); // Switch back to idle after attack finishes
        }, this.framesHold * this.framesMax * 16.67);
    }
}


const background = new Sprite({
    position: {
        x: 0,
        y: 0
    },
    imageSrc: './img/background.png'
})

const shop = new Sprite({
    position: {
        x: 600,
        y: 128
    },
    imageSrc: './img/shop.png',
    framesMax: 6,
    framesHold: 20,
    scale: 2.75,
})


const player = new Fighter({
    position: {
        x: 10,
        y: 50,
    },
    velocity: {
        x: 0,
        y: 0,
    },
    offset: {
        x: 215,
        y: 170,
    },
    attackBoxOffset: { x: 250, y: 170 },
    attackBoxWidth: 210,
    attackBoxHeight: 150,
    debugOutlineOffsetX: 235, // Specific outline offset X for the player
    debugOutlineOffsetY: 180, // Specific outline offset Y for the player
    debugOutlineWidth: 75,  // Specific outline width for the player
    debugOutlineHeight: 235,
    sprites: {
        idle: {
            imageSrc: './img/Martial Hero 2/Sprites/Idle.png',
            framesMax: 4
        },
        run: {
            imageSrc: './img/Martial Hero 2/Sprites/Run.png',
            framesMax: 8
        },
        jump: {
            imageSrc: './img/Martial Hero 2/Sprites/Jump.png',
            framesMax: 2 // Ensure this is correctly set
        },
        fall: {  // Add fall animation
            imageSrc: './img/Martial Hero 2/Sprites/Fall.png',
            framesMax: 2
        },
        attack: {
            imageSrc: './img/Martial Hero 2/Sprites/Attack1.png',
            framesMax: 4,
        }
    },
    imageSrc: './img/Martial Hero 2/Sprites/Idle.png',
    framesMax: 4,
    framesHold: 20,
    scale: 2.5,
});


const enemy = new Fighter({
    position: {
        x: 945,
        y: 50,
    },
    velocity: {
        x: 0,
        y: 0,
    },
    offset: {
        x: 215,
        y: 170,
    },
    attackBoxOffset: { x: 40, y: 170 },
    attackBoxWidth: 210,
    attackBoxHeight: 150,
    debugOutlineOffsetX: 215, // Different outline offset X for the enemy
    debugOutlineOffsetY: 180, // Different outline offset Y for the enemy
    debugOutlineWidth: 75,  // Different outline width for the enemy
    debugOutlineHeight: 235,
    sprites: {
        idle: {
            imageSrc: './img/Enemy/Sprites/Idle.png',
            framesMax: 4
        },
        run: {
            imageSrc: './img/Enemy/Sprites/Run.png',
            framesMax: 8
        },
        jump: {
            imageSrc: './img/Enemy/Sprites/Jump.png',
            framesMax: 2 // Ensure this is correctly set
        },
        fall: {  // Add fall animation
            imageSrc: './img/Enemy/Sprites/Fall.png',
            framesMax: 2
        },
        attack: {
            imageSrc: './img/Enemy/Sprites/Attack1.png',
            framesMax: 4,
        }
    },
    imageSrc: './img/Enemy/Sprites/Idle.png',
    framesMax: 4,
    framesHold: 20,
    scale: 2.5,
});

let lastTime = 0;

function animate(currentTime) {
    window.requestAnimationFrame(animate);

    const deltaTime = currentTime - lastTime; // Time difference between frames
    lastTime = currentTime;

    // Adjust this multiplier to speed up or slow down animations
    const animationSpeed = deltaTime / 16.67; // Normalize to ~60 FPS (1000ms / 60fps = 16.67ms per frame)

    c.fillStyle = 'black';
    c.fillRect(0, 0, canvas.width, canvas.height);

    // Update background, shop, player, and enemy
    background.update();
    shop.update();
    player.update();
    enemy.update();

    // Draw health bars and timer
    drawHealthBar(playerHealth, 10);
    drawHealthBar(enemyHealth, canvas.width - healthBarWidth - 10, true);
    drawTimer();

    // Attack animation priority: do not interrupt it with other animations
    if (player.isAttacking) {
        player.setAnimation('attack'); // Ensure attack animation is playing
        if (player.framesCurrent === player.framesMax - 1) {
            player.isAttacking = false; // Reset attack state when animation is complete
        }
    } else {
        // Handle animations based on player's state only if not attacking
        if (player.velocity.y < 0) {
            player.setAnimation('jump');
        } else if (!player.isGrounded) {
            player.setAnimation('fall');
        } else if (player.isMoving) {
            player.setAnimation('run');
        } else {
            player.setAnimation('idle');
        }
    }

    // Handle animations for the enemy
    if (enemy.isAttacking) {
        enemy.setAnimation('attack');
        if (enemy.framesCurrent === enemy.framesMax - 1) {
            enemy.isAttacking = false; // Reset attack state when animation is complete
        }
    } else {
        if (enemy.velocity.y < 0) {
            enemy.setAnimation('jump');
        } else if (!enemy.isGrounded) {
            enemy.setAnimation('fall');
        } else if (enemy.isMoving) {
            enemy.setAnimation('run');
        } else {
            enemy.setAnimation('idle');
        }
    }
}



animate();

const movementSpeed = 5; // Define a constant for horizontal movement speed
const jumpSpeed = -8;    // Define a constant for jumping speed (negative for upward movement)
const fallSpeed = 10;     // Define a constant for falling speed (positive for downward movement)

window.addEventListener('keydown', (event) => {
    switch (event.key.toLowerCase()) {
        case 'w':
            if (player.isGrounded || player.jumps < player.maxJumps) {
                player.jump(); // Use the jump method
                player.setAnimation('jump'); // Change to jumping animation
            }
            break;
        case 'a':
            player.velocity.x = -movementSpeed;
            player.isMoving = true;
            player.setAnimation('run'); // Change to running animation
            break;
        case 's':
            player.velocity.y = fallSpeed;
            break;
        case 'd':
            player.velocity.x = movementSpeed;
            player.isMoving = true;
            player.setAnimation('run'); // Change to running animation
            break;
        case ' ':
            player.attack();
            player.setAnimation('attack');
            break;
        case 'enter':
            enemy.attack();
            break;
            case 'arrowup':
            if (enemy.isGrounded || enemy.jumps < enemy.maxJumps) {
                enemy.jump(); // Use the jump method
                enemy.setAnimation('jump'); // Change to jumping animation
            }
            break;

        // enemy movement    
        case 'arrowleft':
            enemy.velocity.x = -movementSpeed;
            enemy.isMoving = true;
            enemy.setAnimation('run'); // Change to running animation
            break;
        case 'arrowdown':
            enemy.velocity.y = fallSpeed;
            break;
        case 'arrowright':
            enemy.velocity.x = movementSpeed;
            enemy.isMoving = true;
            enemy.setAnimation('run'); // Change to running animation
            break;
    }
});

window.addEventListener('keyup', (event) => {
    switch (event.key.toLowerCase()) {
        case 'w':
        case 's':
            // Reset the y velocity if the key released matches the jump or fall direction
            if (player.velocity.y === (event.key.toLowerCase() === 'w' ? jumpSpeed : fallSpeed)) {
                player.velocity.y = 0;
            }
            break;
        case 'a':
        case 'd':
            // Reset the x velocity if the key released matches the horizontal direction
            if (player.velocity.x === (event.key.toLowerCase() === 'a' ? -movementSpeed : movementSpeed)) {
                player.velocity.x = 0;
                player.isMoving = false; // Player is not moving anymore
                player.setAnimation('idle'); // Change back to idle animation
            }
            break;

        // Enemy key release handling (arrow keys)
        case 'arrowup':
        case 'arrowdown':
            if (enemy.velocity.y === (event.key.toLowerCase() === 'arrowup' ? jumpSpeed : fallSpeed)) {
                enemy.velocity.y = 0;
            }
            break;
        case 'arrowleft':
        case 'arrowright':
            if (enemy.velocity.x === (event.key.toLowerCase() === 'arrowleft' ? -movementSpeed : movementSpeed)) {
                enemy.velocity.x = 0;
                enemy.isMoving = false; // Enemy is not moving anymore
                enemy.setAnimation('idle'); // Change back to idle animation
            }
            break;
    }
});



// Timer logic
function startTimer() {
    timerInterval = setInterval(() => {
        if (timer > 0) {
            timer -= 0.1; // Decrease the timer
        } else {
            clearInterval(timerInterval); // Stop the timer when it reaches 0
            console.log('Game Over');
        }
    }, 100); // Update every 100ms
}

startTimer();
