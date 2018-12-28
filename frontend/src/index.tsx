import "bootstrap/dist/css/bootstrap.css";

import * as React from "react";
import * as ReactDOM from "react-dom";

import TileDisplay from "./tileDisplay/TileDisplay";
import WebSocketClient from "./connection/WSClient";
import { BalancerObservable, ImplementationObservable, GroupObservable } from "./misc/Observable";
import { getURLParams } from "./misc/URLParams";

import { startTour } from "./eval/Tour";

// Custom Components
import NodeProgress from "./components/NodeProgress";
import NetworkView from "./components/NetworkView";
import IdleTime from "./components/IdleTime";
import SelectBox from "./components/SelectBox";

// CSS
import "./index.css";
// Bootstrap
import registerServiceWorker from "./registerServiceWorker";

class App extends React.Component<{}, {}> {
  render() {
    const ws = new WebSocketClient();
    const balancer = new BalancerObservable();
    const group = new GroupObservable();
    const impl = new ImplementationObservable();

    startTour(ws, balancer, group, impl);
    return (
      <div className="index">
        <div className="mainTop">
          <TileDisplay
            group={group}
            wsclient={ws}
            balancer={balancer}
            implementation={impl}
            viewCenter={getURLParams()}
          />
        </div>
        <div className="mainBottom row">
          <div className="col-3">
            <SelectBox balancer={balancer} implementation={impl} />
          </div>
          <div className="col">
            <NetworkView group={group} wsclient={ws} />
          </div>
          <div className="col-1">
            <IdleTime group={group} wsclient={ws} />
          </div>
          <div className="col-3">
            <NodeProgress group={group} wsClient={ws} />
          </div>
        </div>
      </div>
    );
  }
}

ReactDOM.render(<App />, document.getElementById("root") as HTMLElement);
registerServiceWorker();
