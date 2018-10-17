#include "Host.h"

#include "Balancer.h"
#include "BalancerPolicy.h"

#include "Fractal.h"
#include "Mandelbrot.h"

#include "Region.h"
#include "Tile.h"
#include "TileData.h"
#include "WorkerInfo.h"

// MPI Libraries
#include <mpi.h>

// Cpp REST libraries
#include <cpprest/json.h>

// Websockets
#include <websocketpp/config/asio_no_tls.hpp>
#include <websocketpp/server.hpp>

// Utils
#include <iostream>
#include <map>
#include <mutex>
#include <queue>
#include <set>
#include <string>
#include <algorithm>
#include <vector>

using namespace web;
using namespace web::http;
using namespace web::http::experimental::listener;

const int default_res = 256;
// Init values with some arbitrary value
int Host::maxIteration = 200;
int Host::world_size = 0;
std::vector<int> Host::activeNodes;

// Store for the current big region
Region Host::current_big_region;
std::mutex Host::current_big_region_lock;

// Store send MPI Requests
std::map<int, Region> Host::transmitted_regions;
std::mutex Host::transmitted_regions_lock;

// Websocket server
websocketpp::server<websocketpp::config::asio> Host::websocket_server;
websocketpp::connection_hdl Host::client;

void Host::start_server() {

    //print_server.set_message_handler(&listener_region);

    websocket_server.init_asio();
    websocket_server.start_perpetual();
    websocket_server.listen(9002);
    websocket_server.start_accept();

    websocket_server.set_open_handler(&register_client);
    websocket_server.set_close_handler(&deregister_client);
    websocket_server.set_message_handler(&handle_region_request);

    // How about not logging everything?
    websocket_server.clear_access_channels(websocketpp::log::alevel::all);

    std::cout << "Listening for connections on to websocket server on 9002 \n";
    websocket_server.run();
}

void Host::handle_region_request(const websocketpp::connection_hdl hdl,
                                 websocketpp::server<websocketpp::config::asio>::message_ptr msg) {
    client = hdl;

    std::string request_string = msg->get_payload();

    std::error_code error;
    json::value request = json::value::parse(request_string, error);
    if (error.value() > 0) {
        std::cerr << "Error " << error.value() << "on parsing request: " << error.message() << "\n on "
                  << request_string << std::endl;
        return;
    }

    if(request["type"].as_string() != "regionRequest"){
        return;
    }

    Region region{};
    utility::string_t balancer;
    try {
        balancer = request["balancer"].as_string();

        json::value regionObject = request["region"];
        region.minReal = regionObject["minReal"].as_double();
        region.maxImaginary = regionObject["maxImag"].as_double();

        region.maxReal = regionObject["maxReal"].as_double();
        region.minImaginary = regionObject["minImag"].as_double();

        region.width = static_cast<unsigned int >(regionObject["width"].as_integer());
        region.height = static_cast<unsigned int >(regionObject["height"].as_integer());

        region.hOffset = 0;
        region.vOffset = 0;

        region.maxIteration = static_cast<unsigned int >(regionObject["maxIteration"].as_integer());
        region.validation = regionObject["validation"].as_integer();
        region.guaranteedDivisor = static_cast<unsigned int >(regionObject["guaranteedDivisor"].as_integer());
    } catch (std::out_of_range &e) {
        std::cerr << "Inclompletely specified region requested: " << request_string;
        return;
    }

    {
        std::lock_guard<std::mutex> lock(current_big_region_lock);
//        if (region == current_big_region) {
//            std::cerr << "region has not changed" << std::endl;
//            return;
//        }
        current_big_region = region;
    }

    // TODO increase by one as soon as host is invoked as worker too
    int nodeCount = activeNodes.size();
    // make this based on balancer variable defined above (sounds like strategy pattern...) --> That was the idea :)
    // TODO let frontend choose fractal similar to balancer
    Balancer *b = BalancerPolicy::chooseBalancer(balancer, new Mandelbrot());
    Region *blocks = b->balanceLoad(region, nodeCount);  // Blocks is array with nodeCount members
    // DEBUG
    std::cout << "Balancer Output:" << std::endl;
    for (int i = 0; i < nodeCount; i++) {
        std::cout << "Region " << i << ": "
                  << " TopLeft: (" << blocks[i].minReal << ", " << blocks[i].maxImaginary << ") -> BottomRight: ("
                  << blocks[i].maxReal << ", " << blocks[i].minImaginary << ") Resolution: ("
                  << blocks[i].width << ", " << blocks[i].height << ")" << std::endl;
    }

    // send regions to cores deterministically
    MPI_Request region_requests[nodeCount];
    MPI_Status region_status[nodeCount];
    for (int i = 0; i < nodeCount; i++) {
        Region small_region = blocks[i];
        int rank_worker = activeNodes.at(i);
        std::cout << "Invoking core " << rank_worker << std::endl;
        // Tag for computation requests is 1
        // Send new region
        // TODO @Tobi you might want to look at this
        {
            std::lock_guard<std::mutex> lock(transmitted_regions_lock);
            transmitted_regions[rank_worker] = small_region;
        }
        MPI_Isend(&small_region, sizeof(Region), MPI_BYTE, rank_worker, 1, MPI_COMM_WORLD,
                  &region_requests[i]);
    }
    // All workers received their region
    MPI_Waitall(nodeCount, region_requests, region_status);

    json::value reply;
    reply[U("type")] = json::value::string(U("region"));
    reply[U("regionCount")] = json::value(nodeCount);
    json::value workers;
    for (int i = 0; i < nodeCount; i++) {
        Region t = blocks[i];

        json::value region;
        region[U("minReal")] = json::value((double) t.minReal);
        region[U("maxImag")] = json::value((double) t.maxImaginary);

        region[U("maxReal")] = json::value((double) t.maxReal);
        region[U("minImag")] = json::value((double) t.minImaginary);

        region[U("width")] = json::value(t.width);
        region[U("height")] = json::value(t.height);

        region[U("hOffset")] = json::value(t.hOffset);
        region[U("vOffset")] = json::value(t.vOffset);

        region[U("maxIteration")] = json::value(t.maxIteration);
        region[U("validation")] = json::value(t.validation);
        region[U("guaranteedDivisor")] = json::value(t.guaranteedDivisor);

        workers[i] = json::value();
        workers[i][U("rank")] = json::value(activeNodes.at(i));
        workers[i][U("computationTime")] = json::value(0);
        workers[i][U("region")] = region;
    }
    reply[U("regions")] = workers;
    try {
        websocket_server.send(hdl, reply.serialize().c_str(), websocketpp::frame::opcode::text);
    } catch (websocketpp::exception &e) {
        std::cerr << "Bad connection to client, Refresh connection" << std::endl;
    }
}

void Host::register_client(const websocketpp::connection_hdl hdl) {
    // TODO frontend has to connect a second time during server
    // runtime for hdl not to be a BAD CONN
    // (this means to try the code one has to refresh fast or to set region fetching to manual)
    client = hdl;
}

void Host::deregister_client(websocketpp::connection_hdl hdl) {
    // TODO maybe mock client or sth similar
}

void Host::send(RegionData data) {
    WorkerInfo workerInfo = data.workerInfo;
    Region region = data.workerInfo.region;

    // Create json value from returned
    json::value answer;
    // answer[U("rank")] = json::value(data.world_rank);
    json::value rawDataJSON = json::value();
    for (unsigned int index = 0; index < (region.width * region.height); index++) {
        rawDataJSON[index] = data.data[index];
    }

    json::value workerInfoJSON = json::value();
    workerInfoJSON[U("rank")] = json::value(workerInfo.rank);
    workerInfoJSON[U("computationTime")] = json::value(static_cast<uint64_t >(workerInfo.computationTime));

    // Maybe put this into extra method
    json::value regionJSON = json::value();
    regionJSON[U("minReal")] = json::value((double) region.minReal);
    regionJSON[U("maxImag")] = json::value((double) region.maxImaginary);

    regionJSON[U("maxReal")] = json::value((double) region.maxReal);
    regionJSON[U("minImag")] = json::value((double) region.minImaginary);

    regionJSON[U("width")] = json::value(region.width);
    regionJSON[U("height")] = json::value(region.height);

    regionJSON[U("hOffset")] = json::value(region.hOffset);
    regionJSON[U("vOffset")] = json::value(region.vOffset);

    regionJSON[U("maxIteration")] = json::value(region.maxIteration);
    regionJSON[U("validation")] = json::value(region.validation);
    regionJSON[U("guaranteedDivisor")] = json::value(region.guaranteedDivisor);

    workerInfoJSON[U("region")] = regionJSON;

    answer[U("workerInfo")] = workerInfoJSON;
    answer[U("data")] = rawDataJSON;
    answer[U("type")] = json::value("regionData");

    utility::string_t data_string = answer.serialize();

    try {
        websocket_server.send(client, data_string.c_str(), websocketpp::frame::opcode::text);
    } catch (websocketpp::exception &e) {
        std::cerr << e.what() << "\n" << "Refresh websocket connection.\n";
    }
}

void Host::init(int world_rank, int world_size) {
    MPI_Errhandler_set(MPI_COMM_WORLD,MPI_ERRORS_RETURN); /* return info about errors */
    
    Host::world_size = world_size;
    int cores = world_size;
    int my_rank = world_rank;
    std::cout << "Host init " << world_size << std::endl;

    // Websockets
    // Start a thread that hosts the server
    std::thread websocket_server(start_server);

    // Test if all cores are available
    // We assume from programs side that all cores *are* available, this allows Workers to get the Host rank
    activeNodes = std::vector<int>();
    for (int i = 0; i < cores; i++) {
        if(i != my_rank){
            int testSend = i;
            MPI_Send((const void *) &testSend, 1, MPI_INT, i, 10, MPI_COMM_WORLD);
            int testReceive;
            MPI_Recv(&testReceive, 1, MPI_INT, i, 11, MPI_COMM_WORLD, MPI_STATUS_IGNORE);
            if (testSend == testReceive) {
                std::cout << "Core " << i << " ready!" << std::endl;
            }
            activeNodes.push_back(i);
        }
    }
  
    // MPI - receiving answers and answering requests
    while (true) {
        // Listen for incoming complete computations from workers (MPI)
        // This accepts messages by the workers and answers requests that were stored before
        // TODO: asynchronous (maybe?)
        
        // Receive one message of dynamic length containing "workerInfo" and the computed "worker_data"
        MPI_Status status;
        MPI_Probe(MPI_ANY_SOURCE, 2, MPI_COMM_WORLD, &status); // Rank: 2
        int recv_len;
        MPI_Get_count(&status, MPI_BYTE, &recv_len);
        std::cout << "Host is receiving Data from Worker " << status.MPI_SOURCE << " Total length: " << recv_len << std::endl;
        uint8_t* recv = new uint8_t[recv_len];
        int ierr = MPI_Recv(recv, recv_len, MPI_BYTE, status.MPI_SOURCE, 2, MPI_COMM_WORLD, MPI_STATUS_IGNORE); // Rank: 2
        if(ierr != MPI_SUCCESS){
            std::cerr << "Error on receiving data from worker: " << std::endl;
            char err_buffer[MPI_MAX_ERROR_STRING];
            int resultlen;
            MPI_Error_string(ierr, err_buffer, &resultlen);
            fprintf(stderr, err_buffer);
            continue;
        }

        // Extract "workerInfo" from the received message
        WorkerInfo workerInfo;
        std::memcpy(&workerInfo, recv, sizeof(WorkerInfo));
        Region rendered_region{};
        {
            std::lock_guard<std::mutex> lock(transmitted_regions_lock);
            rendered_region = transmitted_regions[workerInfo.rank];
        }
        unsigned int region_size = rendered_region.getPixelCount();
        
        // Extract "worker_data" from the received message
        int* worker_data = new int[region_size];
        std::memcpy(worker_data, recv + sizeof(WorkerInfo), region_size * sizeof(int));
        std::cout << "Host: Receive from Worker " << workerInfo.rank << " complete." << std::endl;
        
        // Fill "region_data"
        RegionData region_data{};
        region_data.data = worker_data;
        region_data.data_length = region_size;
        region_data.workerInfo = workerInfo;

        Host::send(region_data);

        delete[] recv;
        delete[] worker_data;
    }

}