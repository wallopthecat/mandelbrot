#!/bin/bash
# Install libraries on backend
export http_proxy=proxy.in.tum.de:8080
export https_proxy=proxy.in.tum.de:8080

# boost
cd ~/.eragp-mandelbrot/install
echo "Downloading boost"
wget https://dl.bintray.com/boostorg/release/1.67.0/source/boost_1_67_0.tar.bz2
echo "Extracting boost - this will take a while"
tar --bzip2 -xf boost_1_67_0.tar.bz2
echo "Installing boost"
cd boost_1_67_0
./bootstrap.sh --prefix="$HOME/.eragp-mandelbrot/local/" --with-libraries=system,thread,random
./b2 install