#include "Fractal.h"

const double boundX = 4;
const double boundY = 4;

/**
 * unproject maps form tile cooridate space to the comples plane.
 */
long double unproject(long x, long zoom, double bound, long local, long size) {
    if (size == 0) {
        size = 1;
    }
    long long tile_count = static_cast<unsigned long long>(1) << static_cast<unsigned long long>(zoom);
    return (long double) (x * bound * size + local * bound) /
           (long double) (tile_count * size);
}


long double Fractal::xToReal(long x, long zoom, long localX, long size) {
    return unproject(x, zoom, boundX, localX, size);
}

long double Fractal::yToImaginary(long y, long zoom, long localY, long size) {
    return -unproject(y, zoom, boundY, localY, size);
}

