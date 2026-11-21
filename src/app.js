import * as RED from './red/red.js'
import Engine from './webgl/engine.js'




const {rootStats, rootScope} = RED.init()

const engine = new Engine(rootStats);
engine.run();