import ModelGLTF from './../../../webgl/model/modelGLTF.js'

export class ResourceModel extends ModelGLTF{
    constructor(gl){
        super(gl)
        this.gatherTime = 3000
        this.stations = Array.from({ length: 8 }, (_, index) => {
            const angle = index * Math.PI / 4
            return {
                index,
                direction: [Math.cos(angle), Math.sin(angle)],
                owner: null,
            }
        })
    }

    getAvailableStations(model, reservedStations = new Set()){
        return this.stations.filter((station) =>
            (!station.owner || station.owner === model) &&
            !reservedStations.has(station.index)
        )
    }

    reserveStation(model, stationIndex){
        const station = this.stations.find(({ index }) => index === stationIndex)
        if (!station || (station.owner && station.owner !== model)) return false

        this.releaseStation(model)
        station.owner = model
        return true
    }

    releaseStation(model){
        for (const station of this.stations) {
            if (station.owner === model) station.owner = null
        }
    }

    static async create(gl){
        const model = await super.create(gl,'meteors')
        model.scale = 0.35
        //const model = await MovableModel.create(gl,'box')
        //const model = await Geometry.createBox(gl,0.15,MovableModel)
        if (model.bbox) {
            const halfWidth = (model.bbox.max[0] - model.bbox.min[0]) / 2
            const halfDepth = Math.max(
                (model.bbox.max[2] - model.bbox.min[2]) / 2,
                0.25
            )
            model.collisionRadius = Math.hypot(halfWidth, halfDepth)
        }
        /*model.childrens.push(await Mesh.create(gl, model.material, {
            position: [
                -0.07, -0.07, 0.1,
                 0.07, -0.07, 0.1,
                 0.07,  0.07, 0.1,
                -0.07,  0.07, 0.1,
                 0,     0,    0.25,
            ],
            indices: [
                0, 1, 4,
                1, 2, 4,
                2, 3, 4,
                3, 0, 4,
            ],
        }))*/
        return model
    }
    async gather(){
        await new Promise((resolve) => setTimeout(resolve, this.gatherTime))
        return {
            steel: 5,
            hydrogen: 2,
        }
    }
}

export default ResourceModel;