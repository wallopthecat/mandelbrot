#pragma once

#include "WorkerInfo.h"

/**
 * Contains data of a certain region.
 * Usually assembled at the Host and used to transfer data to frontend
 */
struct RegionData {


    /**
     * Information about which worker computed the region, 
     * including the region itself, computation time and other metadata
     */
    WorkerInfo workerInfo;

    /**
     * The approximate time that MPI communication has taken in microseconds
     */
    unsigned long mpiCommunicationTime;

    /**
     * Raw computed data for the fractal in this region.
     * Size: region.width*region.height
     * Index: i (x,y) -> (region.width * y) + region.height
     */
    unsigned short int *data;
    int data_length;

};