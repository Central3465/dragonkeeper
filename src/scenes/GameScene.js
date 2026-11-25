import Phaser from "phaser"

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene')
    }

    create() {
        const WORLD_WIDTH = 3000
        const WORLD_HEIGHT = 2000

        this.physics.world.setBounds(0,0,WORLD_WIDTH, WORLD_HEIGHT)

        const random = new Phaser.Math.RandomDataGenerator(['dragonkeeper'])

        this.createPlayerTexture()
        this.createWorldTextures()

        const ground = this.add.graphics()
        ground.fillStyle(0x385c40)
        ground.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)

        for (let i=0; i<5000; i++) {
            ground.fillStyle(random.pick([0x416b48, 0x47744c, 0x31583b]), 0.8)
            ground.fillCircle(random.between(0, WORLD_WIDTH), random.between(0, WORLD_HEIGHT), random.between(2,5))
        }

        ground.fillStyle(0x92734c)
        ground.fillRoundedRect(1000, 0, 180, WORLD_HEIGHT, 40)

        this.obstacles = this.physics.add.staticGroup()

        for (let i = 0; i < 120; i++) {
            const x = random.between(80, WORLD_WIDTH - 80)
            const y = random.between(80, WORLD_HEIGHT - 80)

            if (x  > 950 && x < 1230) continue

            const tree = this.obstacles.create(x,y,'tree')
            tree.setDepth(y)
            tree.body.setSize(28,22)
            tree.body.setOffset(18,54)
            tree.refreshBody()
            tree.setData('name', 'Ancient Tree')
        }

        for (let i = 0; i < 90; i++) {
            const x = random.between(50, WORLD_WIDTH - 50)
            const y = random.between(50, WORLD_HEIGHT - 50)

            const rock = this.obstacles.create(x,y,'rock')
            rock.setDepth(y)
            rock.body.setSize(30,20)
            rock.refreshBody()
            rock.setData('name', 'Mysterious Rock')
        }

        this.player = this.physics.add.sprite(1090, 1000, 'hero', 0)
        this.player.setDepth(1000)
        this.player.setCollideWorldBounds(true)
        this.player.body.setSize(18, 25) 
        this.player.body.setOffset(7, 20)

        this.physics.add.collider(this.player, this.obstacles)

        this.inventory = { seeds:  5, dragonFruit: 0}

        this.inventoryText = this.add.text(20, 55, '', { fontSize: '16px', color: '#ffffff', backgroundColor: '#222222', padding: 10}).setScrollFactor(0).setDepth(2000)

        this.refreshInventory()

        this.farmPlots = []

        for (let i = 0; i < 6; i++) {
            const x = 1320 + (i % 3) * 65
            const y = 1000 + Math.floor(i / 3) * 65

            const plot = this.add.rectangle(x,y,48,38,0x795333)

            plot.setStrokeStyle(2, 0x51351f)
            plot.setDepth(y)

            plot.setData('type', 'farmPlot')
            plot.setData('state', 'empty')

            this.farmPlots.push(plot)
        }

        this.farmPlots.forEach(plot => {
            this.renderPlot(plot)
        })

        const directions = [
            { name: "down", start: 0},
            { name: "left", start: 3},
            { name: "right", start: 6},
            { name: "up", start: 9}
        ]

        directions.forEach(direction => {
            this.anims.create({key: `walk-${direction.name}`, frames: this.anims.generateFrameNumbers('hero', { start: direction.start, end: direction.start + 2}), frameRate: 8, repeat: -1})
        })

        this.player.play('walk-down')

        this.cameras.main.setBounds(0,0,WORLD_WIDTH, WORLD_HEIGHT)

        this.cameras.main.startFollow(this.player, true, 0.08, 0.08)

        this.cursors = this.input.keyboard.createCursorKeys()
        this.wasd = this.input.keyboard.addKeys("W,A,S,D")
        this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)

        this.prompt = this.add.text(480, 400, 'Press E to interact', { fontSize: "16px", color: "#ffffff", backgroundColor: '#222222', padding: { x:8, y:5}})

        this.prompt.setOrigin(0.5).setScrollFactor(0)
        this.prompt.setDepth(2000)
        this.prompt.setVisible(false)

        this.nearbyObject = null

        this.add.text(20,20,'Dragon Keeper', { fontSize: '24px', color: "#ffffff", fontStyle: "bold"}).setScrollFactor(0).setDepth(2000)

        this.add.text(20, 490, 'WASD / Arrow Keys to move | E to interact', { fontSize: "14px", color: "#ffffff"}).setScrollFactor(0).setDepth(2000)

        this.interactKey.on('down', () => {
            this.interactWithNearbyObject()
        })
    }

    createPlayerTexture() {
        const texture = this.textures.createCanvas('hero', 96, 192)

        const ctx = texture.getContext()

        for (let direction = 0; direction < 4; direction++) {
            for (let frame = 0; frame < 3; frame++) {
                const x = frame * 32
                const y = direction * 48

                const bob = frame === 1 ? 0 : 2

                ctx.fillStyle = '#263b29'
                ctx.fillRect(x+7, y+40, 18, 4)

                ctx.fillStyle = '#49352c'
                ctx.fillRect(x+9, y+31+bob, 5, 11)
                ctx.fillRect(x+18, y+31-bob,5,11)

                ctx.fillStyle = '#397a54'
                ctx.fillRect(x+7,y+19,18,15)

                ctx.fillStyle = '#edc18b'
                ctx.fillRect(x+8,y+5+bob,16,15)

                ctx.fillStyle = '#513522'
                ctx.fillRect(x+7,y+3+bob,18,6)

                if (direction !== 3) {
                    ctx.fillStyle = '#252525'

                    if (direction === 1) {
                        ctx.fillRect(x+9,y+12+bob,2,3)
                    } else if (direction === 2) {
                        ctx.fillRect(x+21, y+12+bob, 2, 3)
                    } else {
                        ctx.fillRect(x+12,y+12+bob,2,3)
                        ctx.fillRect(x+19,y+12+bob,2,3)
                    }
                }

                ctx.fillStyle = '#8a5936'
                ctx.fillRect(x+5,y+21,5,12)
            }
        }

        for (let i = 0; i < 12; i++) {
            texture.add(i,0,(i%3)*32, Math.floor(i/3) * 48, 32, 48)
        }

        texture.refresh()
    }

    createWorldTextures() {
        const treeGraphics = this.make.graphics()

        treeGraphics.fillStyle(0x63432b)
        treeGraphics.fillRect(26,43,12,35)

        treeGraphics.fillStyle(0x245c35)
        treeGraphics.fillCircle(32,35,27)

        treeGraphics.fillStyle(0x367c43)
        treeGraphics.fillCircle(22,23,17)

        treeGraphics.generateTexture('tree', 64, 80)
        treeGraphics.destroy()

        const rockGraphics = this.make.graphics()

        rockGraphics.fillStyle(0x777c78)
        rockGraphics.fillEllipse(20,15,36,25)

        rockGraphics.generateTexture('rock',40,30)
        rockGraphics.destroy()
    }

    showMessage(message) {
        if (this.message) this.message.destroy()

        this.message = this.add.text(480, 450, message, { fontSize: '18px', color: "#ffffff", backgroundColor: '#222222', padding: 12})

        this.message.setOrigin(0.5).setScrollFactor(0).setDepth(3000)

        this.time.delayedCall(2500, () => {
            if (this.message) {
                this.message.destroy()
                this.message = null
            }
        })
    }

    update() {
        const speed = 220

        let x = 0; let y = 0

        if (this.cursors.left.isDown || this.wasd.A.isDown) x = -1
        if (this.cursors.right.isDown || this.wasd.D.isDown) x = 1
        if (this.cursors.up.isDown || this.wasd.W.isDown) y = -1
        if (this.cursors.down.isDown || this.wasd.S.isDown) y = 1
        
        const movement = new Phaser.Math.Vector2(x,y).normalize().scale(speed)

        this.player.body.setVelocity(movement.x, movement.y)

        if (x !== 0 || y !== 0) {
            if (Math.abs(x) > Math.abs(y)) {
                this.player.play(x > 0 ? 'walk-right' : 'walk-left', true)
            } else {
                this.player.play(y > 0 ? 'walk-down' : 'walk-up', true)
            }
        } else {
            this.player.anims.stop()
            this.player.setFrame(this.player.anims.currentAnim ? this.player.anims.currentAnim.frames[0].frame.name : 0)
        }

        const nearbyPlot = this.farmPlots.find(plot => {
            return Phaser.Math.Distance.Between(this.player.x, this.player.y, plot.x, plot.y) < 75
        })

        const nearbyObstacle = this.obstacles.getChildren().find(object => {
            return Phaser.Math.Distance.Between(this.player.x, this.player.y, object.x, object.y) < 75
        })

        this.nearbyObject = nearbyPlot || nearbyObstacle

        if (this.nearbyObject) {
            const object = this.nearbyObject
            
            const action = object.getData('type') === 'farmPlot' ? this.getPlotAction(object) : object.getData('name')

            this.prompt.setText(`Press E: ${action}`).setVisible(true)
        } else {
            this.prompt.setVisible(false)
        }
    }

    refreshInventory() {
        this.inventoryText.setText(`Seeds: ${this.inventory.seeds}  ` + `Dragon Fruit: ${this.inventory.dragonFruit}`)
    }

    renderPlot(plot) {
        const oldVisuals = plot.getData('visuals') || []

        oldVisuals.forEach(object => object.destroy())

        const visuals = []
        const state = plot.getData('state')

        if (state !== 'empty') {
            const plant = this.add.graphics()

            plant.setDepth(plot.y + 1)

            plant.fillStyle(0x347a43)
            plant.fillRect(plot.x - 3, plot.y - 8, 6, 19)

            if (state === 'planted') {
                plant.fillStyle(0x75a94c)
                plant.fillCircle(plot.x, plot.y - 10, 7)
            }

            if (state === "watered") {
                plant.fillStyle(0x75a94c)
                plant.fillCircle(plot.x, plot.y-13, 10)
            }

            if (state === "grown") {
                plant.fillStyle(0x258044)
                plant.fillCircle(plot.x, plot.y-12, 14)

                plant.fillStyle(0xd94c91)
                plant.fillCircle(plot.x + 5, plot.y - 14, 7)

                plant.fillStyle(0xffffff)
                plant.fillCircle(plot.x + 5, plot.y - 14, 2)
            }

            visuals.push(plant)
        }

        plot.setData('visuals', visuals)
    }

    getPlotAction(plot) {
        const state = plot.getData('state')

        const actions = {
            empty: "Plant Dragon Fruit", // i think the best fruit is durian but its for terra :D
            planted: "Water Crop",
            watered: "Growing...",
            grown: "Harvest Dragon Fruit"
        }

        return actions[state]
    }

    interactWithNearbyObject() {
        const object = this.nearbyObject
        
        if (!object) return

        if (object.getData('type') !== 'farmPlot') {
            this.showMessage(`You discovered a ${object.getData('name')}!`)
            return
        }

        const state = object.getData('state')

        if (state === 'empty') {
            if (this.inventory.seeds <= 0) {
                this.showMessage('You have no seeds left!')
                return
            }

            this.inventory.seeds--
            object.setData('state', 'planted')

            this.showMessage('Dragon fruit seed planted!')
        } else if (state === 'planted') {
            object.setData('state', 'watered')

            this.showMessage('Your crop has been watered!')

            this.time.delayedCall(20000, () => {
                if (object.active && object.getData('state') === 'watered') {
                    object.setData('state', 'grown')
                    this.renderPlot(object)
                    this.showMessage('Your dragon fruit is ready to harvest!')
                }
            })
        } else if (state === "watered") {
            this.showMessage('Your crop is still growing, come back later!')
        } else if (state === 'grown') {
            this.inventory.dragonFruit++
            this.inventory.seeds++

            object.setData('state', "empty")

            this.showMessage(`Dragon fruit harvested! +1 fruit, +1 seed`)
        }

        this.renderPlot(object)
        this.refreshInventory()
    }
}      