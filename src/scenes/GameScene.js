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
        this.createDragonTexture()
        this.createDragonEggTexture()

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

        this.dragonEgg = this.add.image(1145,1000,"dragonEgg")

        this.dragonEgg.setDepth(1001)
        this.dragonEgg.setData("type", `dragonEgg`)
        this.dragonEgg.setData('name', "Ancient Dragon Egg")

        this.dragon = null
        this.dragonHatched = false

        this.inventory = {
            seeds: 5,
            dragonFruit: 0,
            coins: 0
        } // multiline; will probably scale further in the future

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

        const cum = this.cameras.main

        this.shopStall = this.add.rectangle(1250,820,70,55,0x9a6537)

        this.shopStall.setStrokeStyle(3, 0x51351f)
        this.shopStall.setDepth(820)
        this.shopStall.setData('type', 'merchant') // yay shop where you buy stuff

        this.add.text(1250,778,'Merchant',{ fontSize: '15px', color: '#ffffff', fontStyle: "bold", backgroundColor: "#222222", padding: 5}).setOrigin(0.5).setDepth(821)

        this.shopOpen = false
        this.shopStatus = "Welcome to my shop!"
        this.shopElements = []
        this.buildShopPanel(cum)

        this.shopKeys = this.input.keyboard.addKeys({
            sell: Phaser.Input.Keyboard.KeyCodes.ONE,
            buy: Phaser.Input.Keyboard.KeyCodes.TWO,
            close: Phaser.Input.Keyboard.KeyCodes.ESC
        }) // yes there are keyboard shortcuts 😒

        this.shopKeys.sell.on('down', () => {
            if (this.shopOpen) this.sellDragonFruit()
        })

        this.shopKeys.buy.on('down', () => {
            if (this.shopOpen) this.buySeeds()
        })

        this.shopKeys.close.on('down', () => {
            if (this.shopOpen) this.closeShop()
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

        this.dragonStatusText = this.add.text(20,90,"", { fontSize: "15px", color: "#ffffff", backgroundcolor: "#263b29", padding: 10, lineSpacing: 5}).setScrollFactor(0).setDepth(2000)
        this.dragonStatusText.setVisible(false)

        this.add.text(20,20,'Dragon Keeper', { fontSize: '24px', color: "#ffffff", fontStyle: "bold"}).setScrollFactor(0).setDepth(2000)

        this.add.text(20, 490, 'WASD / Arrow Keys to move | E to interact', { fontSize: "14px", color: "#ffffff"}).setScrollFactor(0).setDepth(2000)

        this.interactKey.on('down', () => {
            this.interactWithNearbyObject()
        })
    }

    buildShopPanel(camera) {
        const panelWidth = 560
        const panelHeight = 360
        const left = camera.width / 2 - panelWidth / 2
        const top = camera.height / 2 - panelHeight / 2

        this.shopBackground = this.add.rectangle(camera.width / 2, camera.height / 2, panelWidth, panelHeight, 0x18251c, 0.97)
        this.shopBackground.setStrokeStyle(4, 0xc9a65a)
        this.shopBackground.setScrollFactor(0).setDepth(4000)

        this.shopTitle = this.add.text(left + 30, top+24, 'Baidi Shop', { fontSize: "26px", color: '#e8dba3', fontStyle: "bold"}).setScrollFactor(0).setDepth(4001)

        this.shopCoins = this.add.text(left + panelWidth - 30, top+28, '', { fontSize: `20px`, color: "#c9a65a"}).setOrigin(1,0).setScrollFactor(0).setDepth(4001)

        this.shopRows = [
            this.createShopRow(left+30, top+100, '[1]', "Sell Dragon Fruit", "12 coins each"),
            this.createShopRow(left+30, top+180, '[2]', "Buy Dragon Fruit seeds", "5 coins each")
        ]

        this.shopStatusText = this.add.text(left+30, top+panelHeight - 70, "", {fontSize: "17px", color: "#a8e6a3", wordWrap: { width: panelWidth - 60}}).setScrollFactor(0).setDepth(4001)

        this.shopHintText = this.add.text(left+30, top+panelHeight - 34, 'Press ESC to leave', { fontSize: "15px", color: "#8a9c8f"}).setScrollFactor(0).setDepth(4001)

        this.shopElements = [this.shopBackground, this.shopTitle, this.shopCoins, ...this.shopRows.flatMap(row => [row.key, row.name, row.price]), this.shopStatusText, this.shopHintText]

        this.setShopVisible(false)
    }

    createShopRow(x,y,keyLabel,name,price) {
        const key = this.add.text(x,y,keyLabel, { fontSize: "20px", color: "#18251c", backgroundColor: "#c9a65a", padding: {x:8, y:4}, fontStyle: "bold"}).setScrollFactor(0).setDepth(4001)

        const nameText = this.add.text(x+70,y+3,name,{fontSize: "20px", color: "#ffffff"}).setScrollFactor(0).setDepth(4001)

        const priceText = this.add.text(x+440, y+3, price, { fontSize: "18px", color: "#e8dba3"}).setOrigin(1,0).setScrollFactor(0).setDepth(4001)

        return { key, name: nameText, price: priceText}
    }

    setShopVisible(visible) {
        this.shopElements.forEach(element => element.setVisible(visible))
    }

    openShop() {
        this.shopOpen = true
        this.shopStatus = "Choose something!!"
        this.player.body.setVelocity(0,0)
        this.setShopVisible(true)
        this.refreshShop()
    }

    closeShop() {
        this.shopOpen = false
        this.setShopVisible(false)
    }

    refreshShop() {
        const fruitCount = this.inventory.dragonFruit
        const canSell = fruitCount > 0
        const canBuy = this.inventory.coins >= 5

        this.shopCoins.setText(`Coins: ${this.inventory.coins}`)

        this.shopRows[0].name.setText(canSell ? `Sell Dragon Fruit x${fruitCount}` : "You have nothing to sell :(")
        this.shopRows[0].price.setColor(canSell ? "#e8dba3" : "#6b7c72")
        this.shopRows[1].price.setColor(canBuy ? "#e8dba3" : "#6b7c72")
        this.shopStatusText.setText(this.shopStatus)
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
        if (this.shopOpen) {
            this.player.body.setVelocity(0,0)
            return
        }
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

        const nearbyVendor = Phaser.Math.Distance.Between(this.player.x, this.player.y,this.shopStall.x, this.shopStall.y) < 85 ? this.shopStall : null

        const nearbyEgg = this.dragonEgg?.active && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.dragonEgg.x, this.dragonEgg.y) < 85 ? this.dragonEgg : null

        const nearbyDragon = this.dragon?.active && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.dragon.x, this.dragon.y) < 90 ? this.dragon : null

        const nearbyObstacle = this.obstacles.getChildren().find(object => {
            return Phaser.Math.Distance.Between(this.player.x, this.player.y, object.x, object.y) < 75
        })

        this.nearbyObject = nearbyPlot || nearbyVendor || nearbyEgg || nearbyDragon

        if (this.nearbyObject) {
            const object = this.nearbyObject
            
            const action = object.getData("type") === "farmPlot" ? this.getPlotAction(object) : object.getData("type") === "dragonEgg"
                ? "Hatch egg" : object.getData("type") === "dragon" ? "Feed dragon" : object.getData("name")

            this.prompt.setText(`Press E: ${action}`).setVisible(true)
        } else {
            this.prompt.setVisible(false)
        }

        if (this.dragon && this.dragon.active) {
            const targetX = this.player.x - 32
            const targetY = this.player.y + 25

            this.dragon.x = Phaser.Math.Linear(this.dragon.x, targetX, 0.08)

            this.dragon.y = Phaser.Math.Linear(this.dragon.y, targetY, 0.08)

            this.dragon.setDepth(this.dragon.y + 1)
        }
    }

    refreshInventory() {
        this.inventoryText.setText(`Seeds: ${this.inventory.seeds}  ` + `Dragon Fruit: ${this.inventory.dragonFruit}  ` + `Coins: ${this.inventory.coins}`)
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

        if (object.getData("type") === 'merchant') {
            this.openShop()
            return
        }

        if (object.getData('type') === 'dragonEgg') {
            this.hatchDragon(object)
            return
        }

        if (object.getData("type") === "dragon") {
            this.feedDragon()
            return
        }

        if (object.getData('type') !== 'farmPlot') {
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

    sellDragonFruit() {
        const amount = this.inventory.dragonFruit

        if (amount <= 0) {
            this.shopStatus = 'You have no fruit to sell!'
            this.refreshShop()
            return
        }

        const earnings = amount * 12

        this.inventory.dragonFruit = 0
        this.inventory.coins += earnings

        this.shopStatus = `Sold ${amount} fruit for ${earnings} coins!`

        this.refreshInventory()
        this.refreshShop()
    }

    buySeeds() {
        if (this.inventory.coins < 5) {
            this.shopStatus = "Not enough coins!!"
            this.refreshShop()
            return
        }

        this.inventory.coins -= 5
        this.inventory.seeds++

        this.shopStatus = 'Purchased 1 seed!'

        this.refreshInventory()
        this.refreshShop()
    }

    createDragonTexture() {
        const graphics = this.make.graphics()

        graphics.fillStyle(0x397c49)
        graphics.fillTriangle(5,17,16,8,17,25)
        graphics.fillTriangle(35,17,24,8,23,25)
        graphics.fillStyle(0x55a85b)
        graphics.fillEllipse(20, 24, 27, 23)
        graphics.fillStyle(0x70c96c)
        graphics.fillCircle(20,10,10)
        graphics.fillStyle(0xe8dba3)
        graphics.fillTriangle(12,6,14,0,17,7)
        graphics.fillTriangle(23,7,27,0,28,7)
        graphics.fillStyle(0xffffff)
        graphics.fillCircle(16,10,2)
        graphics.fillCircle(24,10,2)
        graphics.fillStyle(0x17251c)
        graphics.fillCircle(16,10,1)
        graphics.fillCircle(24,10,1)
        graphics.lineStyle(4,0x55a85b)
        graphics.beginPath()
        graphics.moveTo(30,29)
        graphics.lineTo(39, 35)
        graphics.strokePath()
        graphics.generateTexture('babyDragon', 44, 40)
        graphics.destroy()
    }

    createDragonEggTexture() {
        const graphics = this.make.graphics()

        graphics.fillStyle(0x263b29, 0.5)
        graphics.fillEllipse(20,43,30,8)

        graphics.fillStyle(0x75c9b5)
        graphics.fillEllipse(20,23,25,37)

        graphics.fillStyle(0xe8dba3)
        graphics.fillTriangle(20,5,14,18,23,16)
        graphics.fillTriangle(20,25,27,31,17,37)

        graphics.fillStyle(0xc5f5df)
        graphics.fillEllipse(14,18,5,12)

        graphics.generateTexture('dragonEgg', 40, 48)
        graphics.destroy()
    }

    hatchDragon(egg) {
        if (this.dragonHatched) return

        const x = egg.x
        const y = egg.y
        
        egg.destroy()

        this.dragonHatched = true

        this.dragon = this.add.image(x+35, y, 'babyDragon')

        this.dragon.setScale(1.2)
        this.dragon.setDepth(y+1)
        this.dragon.setData('type', 'dragon')

        this.dragonStats = {
            hinger: 100,
            happiness: 100,
            growth: 0,
            stage: "Baby"
        }

        this.dragonStatusText.setVisible(true)

        this.refreshDragonStatus()

        this.dragonNeedsTimer = this.time.addEvent({ delay: 2000, loop: true, callback: () => {
            this.dragonStats.hinger = Math.max(0, this.dragonStats.hinger - 5)
            this.dragonStats.happiness = Math.max(0,this.dragonStats.happiness - (this.dragonStats.hinger <= 25 ? 5 : 2))
            this.refreshDragonStatus()
        }})

        this.showMessage("Your dragon has hatched! Take good care of it otherwise it will die (i hope it does)")
    }

    feedDragon() {
        if (!this.dragon || !this.dragonStats) return

        if (this.inventory.dragonFruit <= 0) {
            this.showMessage("You need more dragon fruit to feed your dragon, it can't eat nothing!")
            return
        }

        if (this.dragonStats.hinger >= 100) { // yes i am aware it says hinger
            this.showMessage("You want your dragon to become fat? NO, disgusting behaviour!")
            return
        }

        this.inventory.dragonFruit--

        this.dragonStats.hinger = Math.min(100, this.dragonStats.hinger + 35)

        this.dragonStats.happiness = Math.min(100, this.dragonStats.happiness + 15)

        this.dragonStats.growth++

        this.refreshInventory()
        this.refreshDragonStatus()

        this.showMessage("Your dragon enjoyed the dragon fruit, don't overfeed it!")

        if (this.dragonStats.growth >= 3 && this.dragonStats.stage === "Baby") {
            this.dragonStats.stage = 'Young'

            this.dragon.setScale(1.7)

            this.showMessage("Wow! Your dragon has grown into a big boy!")

            this.refreshDragonStatus()
        }
    }

    refreshDragonStatus() {
        if (!this.dragonStats) return

        const stats = this.dragonStats

        this.dragonStatusText.setText(
            `${stats.stage} dragon\n` + `Hunger (hinger): ${stats.hinger}/100\n` +
            `Happiness: ${stats.happiness}/100\n` + `Growth: ${stats.growth}/3`
        )
    }
}      