# OIRD Detector

To start for demo:
1. Start UI
2. Start Server
3. ssh to rpi `ssh group@raspberrypi.local` start the `python3 rpi_client.py`

you can also simulate instead of using rpi,

change the api path to api/simulate rather than api/vitals in fetch and connect data in src/utils/ApiService.js

## UI

`cd UI/react-js-tailwind`
`npm run dev`

## REST Server

`cd server`
`python server.py`

## NN training

`cd NN`
`python risk_neural_network.py`

