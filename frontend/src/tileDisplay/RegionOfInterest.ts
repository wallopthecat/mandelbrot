import Point from "../misc/Point";

/**
 * Represents a view on the data of the rectangle defined by tl, br.
 */
export default class RegionOfInterest {

  public topLeft: Point;
  public bottomRight: Point;
  public data: number[];
  public width: number;
  public height: number;
  private ROIWidth: number;
  private ROIHeight: number;

  /**
   * @param {Point} tl TopLeft Point
   * @param {Point} br BottomRight Point
   * @param {*} data data for super region
   * @param {number} width width of the super region
   * @param {number} height height of the super region
   */
  constructor(tl: Point, br: Point, data: number[], width: number, height: number) {
    this.topLeft = tl;
    this.bottomRight = br;
    this.data = data;
    this.width = width;
    this.height = height;

    this.ROIWidth = br.x - tl.x;
    this.ROIHeight = br.y - tl.y;
  }

  /**
   * Returns the correct value of the underlying data array
   * by wrapping x and y in the rectangle of topLeft, bottomRight.
   * @param {Number} x pixel x coordinate of the tile
   * @param {Number} y pixel y coordinate of the tile
   */
  public get(x: number, y: number): number {
    if (x > this.ROIWidth || y > this.ROIHeight) {
      return -1;
    }
    let realX = this.topLeft.x + x;
    let realY = this.topLeft.y + y;
    return this.data[realY * this.width + realX];
  }
}