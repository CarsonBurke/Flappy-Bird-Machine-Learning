class Env {
    constructor() {

        const env = this

        env.games = {}
        env.IDIndex = 0
        env.width = 900
        env.height = 600
        env.lastReset = 0

        env.gapHeight = 120
        env.floorHeight = 35

        env.tick = 0
        env.roundTick = 0
        env.generation = 1
        env.topFitness = 0
        env.currentFitness = 0
        env.gamesAmount = 1
        env.speed = 100

        env.stats = [
            'tick',
            'roundTick',
            'generation',
            'gamesAmount',
            'topFitness',
            'currentFitness',
            'speed'
        ]

        env.inputs = [
            { name: 'Y unit pos' },
            { name: 'Y gap pos' },
            { name: 'Velocity' },
        ]

        env.outputs = [
            { name: 'Flap' },
        ]
    }
}

const env = new Env()

Env.prototype.init = function() {

    // Get the existing canvas environment

    env.canvas = document.getElementsByClassName('env')[0]

    // Style canvas

    env.canvas.width = env.width
    env.canvas.height = env.height

    // Create canvas manager by configuring canvas context

    env.cm = env.canvas.getContext('2d')

    // Turn off anti-aliasing

    env.cm.imageSmoothingEnabled = false

    env.initGames()
}

Env.prototype.initGames = function() {

    //

    for (let i = 0; i < env.gamesAmount; i++) {

        const game = new Game()
        game.init(env.inputs, env.outputs)
    }
}

Env.prototype.newID = function() {

    return env.IDIndex++
}

Env.prototype.run = function() {

    env.tick += 1
    env.roundTick += 1

    for (const statType of env.stats) {

        document.getElementById(statType).innerText = env[statType]
    }

    // Store the current transformation matrix

    env.cm.save()

    // Use the identity matrix while clearing the canvas

    env.cm.setTransform(1, 0, 0, 1, 0, 0)
    env.cm.clearRect(0, 0, env.width, env.height)

    //

    // Restore the transform

    env.cm.restore()

    // Record units

    const allBirds = []
    const aliveBirds = []

    //

    for (const gameID in env.games) {

        const game = env.games[gameID]

        if (this.roundTick % 300 == 0) {

            const pipeTop = new PipeTop(game.ID, Object.keys(game.players)[0])

            new PipeBottom(game.ID, Object.keys(game.players)[0], pipeTop)
        }

        for (const ID in game.objects.pipeTop) {

            const pipe = game.objects.pipeTop[ID]

            pipe.move(pipe.pos.left - 2, pipe.pos.top)
        }

        for (const ID in game.objects.pipeBottom) {

            const pipe = game.objects.pipeBottom[ID]

            pipe.move(pipe.pos.left - 2, pipe.pos.top)
        }

        const closestTopPipe = Object.values(game.objects.pipeTop).sort(function(a, b) {

            return a.left - b.left
        })[0]

        const closestBottomPipe = Object.values(game.objects.pipeBottom).sort(function(a, b) {

            return a.left - b.left
        })[0]

        const gapCenterY = (closestTopPipe.pos.top + closestTopPipe.height) + this.gapHeight / 2

        for (const ID in game.objects.bird) {

            const bird = game.objects.bird[ID]

            allBirds.push(bird)

            if (bird.network.visualsParent) bird.network.visualsParent.classList.add('networkParentHide')

            if (bird.dead) continue

            bird.lastJump -= 1

            bird.applyGravity()

            bird.inputs = [
                { name: 'Y unit pos', value: bird.pos.top - bird.height / 2 },
                { name: 'Y gap pos', value: gapCenterY },
                { name: 'Velocity', value: bird.velocity },
            ]

            bird.outputs = [
                { name: 'Flap', operation: () => bird.jump() },
            ]

            bird.network.forwardPropagate(bird.inputs)

            /* if (!bird.network.visualsParent) bird.network.createVisuals(bird.inputs, bird.outputs)
            bird.network.updateVisuals(bird.inputs) */

            // Find last layer

            const lastLayerActivations = bird.network.activationLayers[bird.network.activationLayers.length - 1]

            for (let index = 0; index < lastLayerActivations.length; index++) {

                const activation = lastLayerActivations[index]

                if (activation <= 0) continue

                bird.outputs[index].operation()
            }
            /* 
            // Sort perceptrons by activation and get the largest one

            const largestActivation = [...lastLayerActivations].sort((a, b) => a - b)[lastLayerActivations.length - 1],
                largestActivationIndex = lastLayerActivations.indexOf(largestActivation)

            if (largestActivation > 0)
                bird.outputs[largestActivationIndex].operation()
             */

            bird.move(bird.pos.left, Math.max(bird.pos.top + bird.velocity, 0))

            // If the bird is touching the floor

            if (bird.pos.top + bird.height >= env.height - this.floorHeight) {

                bird.kill()
                continue
            }

            if (bird.velocity < 0) bird.imageID = 'birdUp'

            else bird.imageID = 'birdDown'

            bird.fitness += 1

            aliveBirds.push(bird)
        }

        game.visualize()
    }

    //

    const fittestUnit = env.findFittestUnit(allBirds)

    if (!fittestUnit.network.visualsParent) fittestUnit.network.createVisuals(fittestUnit.inputs, fittestUnit.outputs)
    fittestUnit.network.updateVisuals(fittestUnit.inputs)
    fittestUnit.network.visualsParent.classList.remove('networkParentHide')

    if (fittestUnit.fitness > env.topFitness) env.topFitness = fittestUnit.fitness
    env.currentFitness = fittestUnit.fitness

    //

    if (!aliveBirds.length) {

        env.reset(fittestUnit)
    }
}

Env.prototype.findFittestUnit = function(units) {

    return fitestUnit = units.sort((a, b) => a.fitness - b.fitness)[units.length - 1]
}

Env.prototype.reset = function(fittestUnit) {

    env.lastReset = env.tick
    env.roundTick = 0
    env.generation += 1

    const weightLayers = fittestUnit.weightLayers,
        activationLayers = fittestUnit.activationLayers

    fittestUnit.delete()

    for (const gameID in env.games) {

        const game = env.games[gameID]

        game.reset()
        game.init(env.inputs, env.outputs, weightLayers, activationLayers)
    }
}