export abstract class Color {
  abstract alpha: number;

  setAlpha(v: number): this {
    this.alpha = v;
    return this;
  }

  toAlpha(v: number): Color {
    return this.clone().setAlpha(v);
  }

  abstract clone(): Color;

  abstract toString(): string;
}

export class RGBColor extends Color {
  constructor(
    public r = 0,
    public g = 0,
    public b = 0,
    public alpha = 1,
  ) {
    super();
  }

  clone(): RGBColor {
    return new RGBColor(this.r, this.g, this.b, this.alpha);
  }

  lighten(fac: number): Color {
    const c = this.clone();
    c.r *= fac;
    c.g *= fac;
    c.b *= fac;
    return c;
  }

  toString() {
    return `hsla(${this.r},${this.g}%,${this.b}%,${this.alpha})`;
  }
}

export class HSLColor extends Color {
  constructor(
    public h = 0,
    public s = 0,
    public l = 0,
    public alpha = 1,
  ) {
    super();
  }

  clone(): HSLColor {
    return new HSLColor(this.h, this.s, this.l, this.alpha);
  }

  lighten(fac: number): Color {
    const c = this.clone();
    c.l *= fac;
    return c;
  }

  toString() {
    return `hsla(${this.h},${this.s}%,${this.l}%,${this.alpha})`;
  }
}

const PALETTE = {
  black: hsl(0, 0, 0), // hsla(0, 0%, 0%, 1.00)
  white: hsl(0, 0, 100), // hsla(0, 0%, 100%, 1.00)
  gray: hsl(0, 0, 75), // hsla(0, 0%, 75%, 1.00)
  brightYellow: hsl(64, 97, 56), // hsla(64, 97%, 56%, 1.00)
  pink: hsl(350, 100, 88), // hsla(350, 100%, 88%, 1.00)
  hotPink: hsl(330, 100, 71), // hsla(330, 100%, 71%, 1.00)
  coral: hsl(16, 100, 66), // hsla(16, 100%, 66%, 1.00)
  fuchsia: hsl(300, 100, 66), // hsla(300, 100%, 66%, 1.00)
  chartreuse: hsl(131, 77, 44), // hsla(131, 77%, 44%, 1.00)
  tube1: hsl(120, 62, 45), // hsla(120, 62%, 45%, 1.00)
  tube2: hsl(120, 53, 34), // hsla(120, 53%, 34%, 1.00),
  nightBlue: hsl(212, 94, 7), // hsla(212, 94%, 7%, 1.00)
  darkBlue: hsl(212, 52, 14), // hsla(212, 52%, 14%, 1.00)
  blueGray: hsl(212, 18, 40), // hsla(212, 18%, 40%, 1.00)
  basket2: hsl(26, 56, 39), // hsla(26, 56%, 39%, 1.00)
  basket1: hsl(29, 54, 49), // hsla(29, 54%, 49%, 1.00)
  blue0: hsl(210, 100, 35), // hsla(210, 100%, 35%, 1.00)
  blue1: hsl(210, 100, 40), // hsla(210, 100%, 40%, 1.00)
  blue2: hsl(210, 100, 50), // hsla(210, 100%, 50%, 1.00)
  blue3: hsl(210, 100, 65), // hsla(210, 100%, 65%, 1.00)
};

export default PALETTE;

export function hsl(h: number, s: number, l: number, a = 1) {
  return new HSLColor(h, s, l, a);
}

export function rgb(r: number, g: number, b: number) {
  return new RGBColor(r, g, b);
}

export function rgba(r: number, g: number, b: number, a = 1) {
  return new RGBColor(r, g, b, a);
}

export function setTransparency(a: number) {
  for (let color of Object.values(PALETTE)) {
    color.alpha = a;
  }
}
