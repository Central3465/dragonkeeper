import Phaser from "phaser"

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene')
    }

    create() {
        this.add.rectangle(480, 270, 960, 540, 0x385c40)

        for (let x = 0; x < 960; x+=64) {
            for (let y = 0; y < 540; y +=64) {
                this.add.rectangle(x+32, y+32, 60, 60, 0x416b48).setAlpha(0.35)
            }
        }

        this.player = this.add.rectangle(480, 270, 28, 36, 0xe8c47a)

        this.cursors = this.input.keyboard.createCursorKeys()
        this.wasd = this.input.keyboard.addKeys('W,A,S,D')

        this.add.text(20, 20, "Dragon Keeper", { fontSize: "24px", color: "#ffffff", fontStyle: "bold"})

        this.add.text(20, 490, 'Controls: WASD / Arrow Keys', {fontSize: "14px", color: "#ffffff"})
    }

    update() {
        const speed = 200
        const { left, right, up, down} = this.cursors

        let velocityX = 0
        let velocityY = 0

        if (left.isDown || this.wasd.A.isDown) velocityX = -speed
        if (right.isDown || this.wasd.D.isDown) velocityX = speed
        if (up.isDown || this.wasd.W.isDown) velocityY = -speed
        if (down.isDown || this.wasd.S.isDown) velocityY = speed

        const velocity = new Phaser.Math.Vector2(velocityX, velocityY)
        velocity.normalize().scale(speed)

        this.player.x += velocity.x * (this.game.loop.delta / 1000)
        this.player.y += velocity.y * (this.game.loop.delta / 1000)

        this.player.x = Phaser.Math.Clamp(this.player.x, 14, 946)
        this.player.y = Phaser.Math.Clamp(this.player.y, 14, 526)
    }
}