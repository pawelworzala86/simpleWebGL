import * as RED from './red/red.js'
import Engine from './webgl/engine.js'





export const engine = new Engine();
const {rootStats, settings} = await engine.run();

RED.init(rootStats, settings)