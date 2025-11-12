export type Thread = {
  floss: string;
  name: string;
  r: number;
  g: number;
  b: number;
  hex: string;
};

export type ThreadWithStitches = Thread & {
  stitches: number;
};

export type RepresentativeColorsResult = {
  centroids: number[][]; // [r,g,b]
  labels: number[]; // cluster index per pixel
  width: number;
  height: number;
};


