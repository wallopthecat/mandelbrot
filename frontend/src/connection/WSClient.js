/*
 * this map stores callbacks to render all the tiles requested for leaflet.
 */
const callbacks = new Map();

// Web Socket setup
const url = 'ws://localhost:9002';
export const socket = new WebSocket(url);

// Buffer of requests to be sent when the socket connects
const regionRequests = [];
socket.onopen = () => {
  regionRequests.forEach(m => socket.send(m));
};

socket.onmessage = function(event) {
  let msg = JSON.parse(event.data);
  switch (msg.type) {
    case 'regionData':
      {
        console.log(msg);
        let tile = msg.tile;
        let coords = coordsToString(msg.tile.x, msg.tile.y, msg.tile.zoom);
        let cb = callbacks.get(coords);
        if (cb != null) {
          cb(msg.data);
          // callbacks.delete(coords);
        } else {
          console.log('request not found for tile: ' + coords);
        }
      }
      break;
    case 'region':
      {
        console.log(msg);
        // TODO
      }
      break;
    default:
      console.log(msg);
  }
};

/**
 * Registers the tile at coords to be drawn as soon as data is available.
 * The return value of the draw function will be returned by the promise.
 * @param {*} point leaflet coordinates on the tile to be registerd
 * @param {*} draw function expecting data that draws the tile @coords
 */
export const register = (point, draw) => {
  let promise;
  const render = data => {
    promise = new Promise((resolve, error) => {
      try {
        resolve(draw(data));
      } catch (err) {
        error(err);
      }
    });
  };
  let coords = coordsToString(point.x, point.y, point.z);
  callbacks.set(coords, render);
  return promise;
};

export const close = () => {
  console.log('closing the WS connection');
  socket.close();
  callbacks.clear();
};

export const sendRequest = request => {
  let message = JSON.stringify(request);
  if (socket.readyState === socket.OPEN) {
    socket.send(message);
  } else {
    regionRequests.push(message);
  }
};

function coordsToString(x, y, z) {
  return [x, y, z].join(', ');
}

export default socket;