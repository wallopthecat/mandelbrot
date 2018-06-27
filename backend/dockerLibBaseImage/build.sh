#!/bin/bash

# this file builds the libDockerfile and publishes it to dockerHub
## the ENV var DOCKER_ID_USER has to be set ##
DOCKER_ID_USER="rasaford"
version="0.5"

docker login
docker build --tag mandelbrot:$version .
docker tag mandelbrot:$version $DOCKER_ID_USER/mandelbrot
docker push $DOCKER_ID_USER/mandelbrot
