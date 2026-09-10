import type { DrawingPart } from "./utils/SpriteUtils";
import assetsSvg from "/assets.svg?raw";

export function generateSprites() {
  {
    document.querySelector("body")?.insertAdjacentHTML("beforeend", assetsSvg);

    let o = "";
    o += getParts("foal");
    o += getParts("bat");
    o += getParts("wraith");
    o += getParts("adult");
    o += getParts("furious");
    o += getParts("anguished");
    o += getParts("content");
    o += `export const expressions = [
  content,
  anguished,
  furious,
];\n`;
    o += getParts("life");
    o += getParts("rainbowFace");
    o += getParts("bricks");
    o += getParts("tower");

    o = o.replaceAll(`rgb(0, 0, 0)`, "BLACK");

    console.log(o);

    document.querySelector("svg")?.remove();
  }
}

export function parsePaths(groupLabel: string): Record<string, DrawingPart> {
  // stackoverflow.com/questions/45110893/select-elements-by-attributes-with-colon
  // It doesn't work when I do it with live-server...
  const group = document.querySelector<SVGGElement>(
    `g[inkscape\\:label="${groupLabel}"]`,
  );

  if (!group) {
    console.log(`Group labelled ${groupLabel} not found.`);
    return {};
  }

  const obj: Record<string, DrawingPart> = {};

  group
    .querySelectorAll<SVGPathElement>("path[inkscape\\:label]") // or "path" but then eventually you have to use the id
    .forEach((p) => {
      const key = p.getAttribute("inkscape:label"); // || p.id;
      const pathData = p.getAttribute("d");

      if (!key || !pathData || p.style.display === "none") return;

      const { stroke, fill } = p.style;
      const path = pathData
        .replaceAll(/(\D)\s+(\D)/gi, "$1$2") // z m ---> zm
        .replaceAll(/(\D)\s+(\d)/gi, "$1$2") // m 42 ---> m42
        .replaceAll(/(.)\s+(\D)/gi, "$1$2"); // 3 -3 ---> 3-3

      obj[key] = { path, fill: replaceUrl(fill), stroke: replaceUrl(stroke) };

      function replaceUrl(prop): string | string[] | undefined {
        return prop.includes("url") ? "RAINBOW" : prop;
      }
    });

  return obj;
}

export function getPartsObject(groupLabel: string) {
  const obj = parsePaths(groupLabel);

  let output = `${groupLabel} = {`;

  Object.entries(obj).forEach(([k, { path, ...fields }]) => {
    output += `${k}: {`;
    output += `path: new Path2D(\`${path}\`),`;
    ["fill", "stroke"].forEach((k) => {
      const v = fields[k];
      if (v && v !== `none`) output += `${k}: ${v},`;
    });
    output += `},`;
  });

  output += "}";
  console.log(output);

  return obj;
}

export function getParts(groupLabel: string) {
  const obj = parsePaths(groupLabel);

  let output = `export const ${groupLabel} = sprite([`;

  Object.entries(obj).forEach(([k, { path, ...fields }]) => {
    // output += `makePart([\`${path}\`,`;
    output += `[\`${path}\`,`;
    ["fill", "stroke"].forEach((k) => {
      const v = fields[k];
      if (v && v !== `none`) output += `${v}`;
      output += ",";
    });
    output += `],`;
  });

  output += "])\n";
  console.log(output);

  return output;
}
