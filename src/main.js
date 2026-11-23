import Phaser from 'phaser'
import GameScene from "./scenes/GameScene"
import "./style.css"

const config = {
    type: Phaser.AUTO,
    width: 960,
    height: 540,
    backgroundColor: "#17251c",
    parent: 'game',
    pixelArt: true,
    physics: {
        default: "arcade",
        arcade: {
            debug: false
        }
    },
    scene: [GameScene]
}

new Phaser.Game(config)