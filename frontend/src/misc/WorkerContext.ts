/**
 * Colors for the workers
 * TODO replace with nice colorSet (i.e. theme)
 */
const colorSet = [
  "#B08BEB",
  "#4661EE",
  "#EC5657",
  "#1BCDD1",
  "#3EA0DD",
  "#F5A52A",
  "#23BFAA",
  "#FAA586",
  "#EB8CC6",
];

/**
 * Class to store which worker to focus on.
 * Offers subscription to changing focus.
 * Also provides the colors for each node based on ID
 */
export default class WorkerContext {
  private callbacks: any[] = [];
  private colorSet: string[] = [];
  private activeWorker: number | undefined;

  constructor() {
    // this.activeWorker = undefined;
    this.colorSet = colorSet;
  }

  /**
   * Returns the worker color scheme for a given worker (identified by node ID)
   * @param {Number} nodeID
   */
  public getWorkerColor(nodeID: number): string {
    return this.colorSet[nodeID % this.colorSet.length];
  }

  /**
   * @returns {Number} the currently focused/hovered worker. May be undefined
   */
  public getActiveWorker(): number | undefined {
    return this.activeWorker;
  }

  /**
   * Change the currently active/focused/hovered worker
   * @param {Number} nodeID Current worker. May be undefined
   * @returns {Boolean} Successfully changed active worker
   */
  public setActiveWorker(nodeID?: number): boolean {
    if (nodeID !== undefined && nodeID < 0) {
      console.error(`Invalid nodeID: ${nodeID}`);
      return false;
    }
    if (this.activeWorker !== nodeID) {
      this.activeWorker = nodeID;
      this.updateAll();
    }
    return true;
  }

  /**
   * Subscribe to changes to the active (hovered, focused) node
   * @param {Function} callback
   */
  public subscribe(callback: (nodeID: number|undefined) => any) {
    let promise;
    const fun = (data: any) => {
      promise = new Promise((resolve, error) => {
        try {
          resolve(callback(data));
        } catch (err) {
          error(err);
        }
      });
    };
    this.callbacks.push(fun);
    return promise;
  }

  private updateAll() {
    this.callbacks.forEach(cb => cb(this.activeWorker));
  }

}