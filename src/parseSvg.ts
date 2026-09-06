type DrawingPart = {
  path: string;
  fill?: string | string[];
  stroke?: string | string[];
};

type Drawing = { fill: DrawingPart[]; stroke: DrawingPart[] };

export function getPaths(groupLabel: string): Record<string, DrawingPart> {
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

      if (!key || !pathData) return;

      const { stroke, fill } = p.style;
      const path = pathData; // .replaceAll(/(\w+)\s*(\w+)\s*/g, "$1 $2 ");

      obj[key] = { path, fill, stroke };
    });

  let output = `${groupLabel} = {`;

  Object.entries(obj).forEach(([k, { path, fill, stroke }]) => {
    output += `${k}: {`;
    output += `path: new Path2D(\`${path}\`),`;
    if (fill && fill !== `none`) output += `fill: ${fill},`;
    if (stroke && stroke !== `none`) output += `stroke: ${fill},`;
    output += `},`;
  });

  output += "}";
  console.log(output);
  return obj;
}
