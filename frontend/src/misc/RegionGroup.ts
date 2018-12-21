import { Regions, WorkerInfo, Region, regionEquals } from "../connection/ExchangeTypes";
import { Point2D } from "./Point";
import { MAX_DISPLAY_REGIONS } from "../Constants";

export interface RegionGroup {
  id: number;
  computationTime: number;
  guaranteedDivisor: number;
  width: number;
  height: number;
  validation: number;
  maxIteration: number;
  hOffset: number;
  vOffset: number;
  /**
   * returns closed polyline of the Region (first point is the same as the last).
   */
  bounds(): Point2D[];
  getChildren(): RegionGroup[] | null;
  getLeafs(): Rectangle[];
  getRanks(): number[];
  isGroup(): boolean;
}

/**
 * Dynamically groups the returned Regions from the backend for cleaner display to the user.
 */
class Group implements RegionGroup {
  public id: number;
  public computationTime: number;
  public guaranteedDivisor: number;
  public width: number;
  public height: number;
  public validation: number;
  public maxIteration: number;
  public hOffset: number;
  public vOffset: number;
  private children: RegionGroup[];

  constructor(regions: WorkerInfo[], groupID: number) {
    this.id = groupID;
    this.computationTime = regions.map(r => r.computationTime).reduce((acc, curr) => acc + curr);
    this.guaranteedDivisor = regions[0].region.guaranteedDivisor;
    this.validation = regions[0].region.validation;
    this.maxIteration = regions
      .map(r => r.region.maxIteration)
      .reduce((acc, curr) => (curr > acc ? curr : acc));
    this.children = regions.map(r => new Rectangle(r));
  }

  /**
   * bound of a group will return a rectangle fitting all of it's children
   */
  public bounds() {
    const tl = this.children[0].bounds()[0];
    const br = this.children[this.children.length - 1].bounds()[2];
    return [
      new Point2D(tl.x, tl.y),
      new Point2D(br.x, tl.y),
      new Point2D(br.x, br.y),
      new Point2D(tl.x, br.y),
      new Point2D(tl.x, tl.y)
    ];
  }

  public getChildren() {
    return this.children;
  }

  public isGroup() {
    return true;
  }

  public getLeafs() {
    let leafs: Rectangle[] = [];
    this.getChildren().forEach(child => {
      leafs = leafs.concat(child.getLeafs());
    });
    return leafs;
  }

  public getRanks() {
    return this.children.map(c => c.getRanks()).reduce((acc, curr) => acc.concat(curr));
  }
}

class Rectangle implements RegionGroup {
  id: number;
  computationTime: number;
  guaranteedDivisor: number;
  width: number;
  height: number;
  validation: number;
  maxIteration: number;
  hOffset: number;
  vOffset: number;

  private minImag: number;
  private maxImag: number;
  private minReal: number;
  private maxReal: number;

  constructor(region: WorkerInfo) {
    this.id = region.rank;
    this.computationTime = region.computationTime;
    this.guaranteedDivisor = region.region.guaranteedDivisor;
    this.width = region.region.width;
    this.height = region.region.height;
    this.validation = region.region.validation;
    this.maxIteration = region.region.maxIteration;
    this.hOffset = region.region.hOffset;
    this.vOffset = region.region.vOffset;

    this.minImag = region.region.minImag;
    this.maxImag = region.region.maxImag;
    this.minReal = region.region.minReal;
    this.maxReal = region.region.maxReal;
  }

  bounds() {
    return [
      new Point2D(this.minReal, this.maxImag),
      new Point2D(this.maxReal, this.maxImag),
      new Point2D(this.maxReal, this.minImag),
      new Point2D(this.minReal, this.minImag),
      new Point2D(this.minReal, this.maxImag)
    ];
  }

  getChildren() {
    return null;
  }

  isGroup() {
    return false;
  }

  public getLeafs() {
    return [this];
  }

  getRanks() {
    return [this.id];
  }
}

export const isEmptyRegion = (region: Region) => {
  return (
    region.width === 0 &&
    region.height === 0 &&
    region.minImag === 0 &&
    region.maxImag === 0 &&
    region.minReal === 0 &&
    region.maxReal === 0 &&
    region.hOffset === 0 &&
    region.vOffset === 0
  );
};

export const groupRegions = (regions: Regions): RegionGroup[] => {
  let r = regions.regions.filter(r => !isEmptyRegion(r.region));
  if (r.length <= MAX_DISPLAY_REGIONS) {
    return r.map(r => new Rectangle(r));
  }
  let groupSize = Math.ceil(r.length / MAX_DISPLAY_REGIONS);
  let groups: Group[] = [];
  let groupID = 1;

  let rects = r;
  let not: WorkerInfo[] = [];
  do {
    let g = expandGroup(rects[0], rects, not, groupSize);
    rects = sub(rects, g);
    not = not.concat(g);
    groups.push(new Group(g, groupID++));
  } while (rects.length != 0);
  console.log(groups);
  return groups;
};

const sub = (a: WorkerInfo[], b: WorkerInfo[]) =>
  a.filter(i => !b.some(j => regionEquals(i.region, j.region)));

const expandGroup = (
  start: WorkerInfo,
  rects: WorkerInfo[],
  not: WorkerInfo[],
  size: number
): WorkerInfo[] => {
  let n = rects.filter(w => {
    let m =
      start.region.minImag === w.region.minImag ||
      start.region.maxImag === w.region.maxImag ||
      start.region.minReal === w.region.minReal ||
      start.region.maxReal === w.region.maxReal;
    let n = !not.some(r => regionEquals(r.region, w.region));
    return m && n;
  });
  if (n.length == 0) {
    return [];
  } else if (n.length < size) {
    let expanded: WorkerInfo[] = [];
    for (let i = 0; i < n.length; i++) {
      expanded = expandGroup(n[i++], rects, not.concat(n), size - n.length);
      if (expanded.length != 0) break;
    }
    return n.concat(expanded);
  } else {
    return n.slice(0, size);
  }
};
