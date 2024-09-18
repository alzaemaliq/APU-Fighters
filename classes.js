// js/classes.js

export class Fighter {
    constructor({ position, velocity, color = 'red', offset }) {
        this.position = position;
        this.velocity = velocity;
        this.height = 150;
        this.width = 50;
        this.attackBox = {
            position: {
                x: this.position.x,
                y: this.position.y
            },
            offset,
            width: 100,
            height: 50,
        };
        this.color = color;
        this.isAttacking = false;
        this.jumps = 0;
        this.maxJumps = 2;
        this.isGrounded = false;
    }

    draw() {
        const c = document.querySelector('canvas').getContext('2d');
        c.fillStyle = this.color;
        c.fillRect(this.position.x, this.position.y, this.width, this.height);
        c.fillStyle = 'rgba(0, 255, 0, 0)';
        c.fillRect(this.attackBox.position.x, this.attackBox.position.y, this.attackBox.width, this.attackBox.height);
    }

    update() {
        this.draw();
        this.attackBox.position.x = this.position.x + this.attackBox.offset.x;
        this.attackBox.position.y = this.position.y + this.attackBox.offset.y;
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        const canvas = document.querySelector('canvas');

        if (this.position.y + this.height + this.velocity.y >= canvas.height) {
            this.velocity.y = 0;
            this.position.y = canvas.height - this.height;
            this.isGrounded = true;
            this.jumps = 0;
        } else {
            this.velocity.y += 0.2;
            this.isGrounded = false;
        }

        if (this.position.x < 0) {
            this.position.x = 0;
        } else if (this.position.x + this.width > canvas.width) {
            this.position.x = canvas.width - this.width;
        }
    }

    jump() {
        if (this.jumps < this.maxJumps) {
            this.velocity.y = -8;
            this.jumps += 1;
        }
    }

    attack() {
        this.isAttacking = true;
        setTimeout(() => {
            this.isAttacking = false;
        }, 100);
    }
}
