import * as RED from './red/red.js'
import Engine from './webgl/engine.js'





const engine = new Engine();
const playerStats = engine.run();

RED.init(playerStats)