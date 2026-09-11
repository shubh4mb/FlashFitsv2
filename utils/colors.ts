export interface ColorItem {
  name: string;
  hex: string;
  family?: string;
}

export interface ColorFamily {
  family: string;
  colors: ColorItem[];
}

export const COLOR_FAMILIES: ColorFamily[] = [
  {
    family: "BLACKS",
    colors: [
      { name: "Black", hex: "#000000" },
      { name: "Jet Black", hex: "#0A0A0A" },
      { name: "Charcoal", hex: "#36454F" },
      { name: "Dark Slate", hex: "#2F4F4F" },
      { name: "Gunmetal", hex: "#2C3539" },
      { name: "Slate Gray", hex: "#708090" },
      { name: "Grey", hex: "#808080" },
      { name: "Silver", hex: "#C0C0C0" },
      { name: "Light Gray", hex: "#D3D3D3" },
      { name: "Ash Gray", hex: "#B2BEB5" },
    ],
  },
  {
    family: "NEUTRALS",
    colors: [
      { name: "White", hex: "#FFFFFF" },
      { name: "Off-White", hex: "#FAF9F6" },
      { name: "Ivory", hex: "#FFFFF0" },
      { name: "Cream", hex: "#FFFDD0" },
      { name: "Eggshell", hex: "#F0EAD6" },
      { name: "Beige", hex: "#F5F5DC" },
      { name: "Nude", hex: "#E3C6B4" },
      { name: "Sand", hex: "#C2B280" },
      { name: "Khaki", hex: "#F0E68C" },
      { name: "Taupe", hex: "#483C32" },
      { name: "Camel", hex: "#C19A6B" },
    ],
  },
  {
    family: "BLUES",
    colors: [
      { name: "Navy Blue", hex: "#000080" },
      { name: "Midnight Blue", hex: "#191970" },
      { name: "Royal Blue", hex: "#4169E1" },
      { name: "Cobalt Blue", hex: "#0047AB" },
      { name: "Sapphire", hex: "#0F52BA" },
      { name: "Blue", hex: "#0000FF" },
      { name: "Denim Blue", hex: "#1560BD" },
      { name: "Sky Blue", hex: "#87CEEB" },
      { name: "Baby Blue", hex: "#89CFF0" },
      { name: "Ocean Blue", hex: "#4F42B5" },
      { name: "Cyan", hex: "#00FFFF" },
      { name: "Turquoise", hex: "#40E0D0" },
      { name: "Teal", hex: "#008080" },
      { name: "Powder Blue", hex: "#B0E0E6" },
    ],
  },
  {
    family: "GREENS",
    colors: [
      { name: "Olive Green", hex: "#556B2F" },
      { name: "Army Green", hex: "#4B5320" },
      { name: "Forest Green", hex: "#228B22" },
      { name: "Emerald", hex: "#50C878" },
      { name: "Green", hex: "#008000" },
      { name: "Jade", hex: "#00A86B" },
      { name: "Sage", hex: "#9DC183" },
      { name: "Mint", hex: "#98FF98" },
      { name: "Lime Green", hex: "#32CD32" },
      { name: "Pistachio", hex: "#93C572" },
      { name: "Seafoam", hex: "#9FE2BF" },
    ],
  },
  {
    family: "REDS",
    colors: [
      { name: "Red", hex: "#FF0000" },
      { name: "Ruby", hex: "#E0115F" },
      { name: "Scarlet", hex: "#FF2400" },
      { name: "Crimson", hex: "#DC143C" },
      { name: "Cherry Red", hex: "#D2042D" },
      { name: "Brick Red", hex: "#CB4154" },
      { name: "Maroon", hex: "#800000" },
      { name: "Burgundy", hex: "#800020" },
      { name: "Wine", hex: "#722F37" },
      { name: "Oxblood", hex: "#4A0404" },
      { name: "Rust", hex: "#B7410E" },
    ],
  },
  {
    family: "PINKS",
    colors: [
      { name: "Pink", hex: "#FFC0CB" },
      { name: "Baby Pink", hex: "#F4C2C2" },
      { name: "Blush Pink", hex: "#DE5D83" },
      { name: "Dusty Rose", hex: "#DCAE96" },
      { name: "Rose Pink", hex: "#FF66CC" },
      { name: "Hot Pink", hex: "#FF69B4" },
      { name: "Magenta", hex: "#FF00FF" },
      { name: "Fuchsia", hex: "#C71585" },
      { name: "Coral Pink", hex: "#F88379" },
      { name: "Peach", hex: "#FFDAB9" },
    ],
  },
  {
    family: "YELLOWS",
    colors: [
      { name: "Yellow", hex: "#FFFF00" },
      { name: "Mustard", hex: "#FFDB58" },
      { name: "Gold", hex: "#FFD700" },
      { name: "Lemon Yellow", hex: "#FFF700" },
      { name: "Canary Yellow", hex: "#FFEF00" },
      { name: "Amber", hex: "#FFBF00" },
      { name: "Honey", hex: "#EB9605" },
    ],
  },
  {
    family: "ORANGES",
    colors: [
      { name: "Orange", hex: "#FFA500" },
      { name: "Coral", hex: "#FF7F50" },
      { name: "Coral Reef", hex: "#FD7C6E" },
      { name: "Burnt Orange", hex: "#CC5500" },
      { name: "Tangerine", hex: "#F28500" },
      { name: "Peach Orange", hex: "#FFCC99" },
      { name: "Terracotta", hex: "#E2725B" },
    ],
  },
  {
    family: "PURPLES",
    colors: [
      { name: "Purple", hex: "#800080" },
      { name: "Deep Purple", hex: "#36013F" },
      { name: "Violet", hex: "#EE82EE" },
      { name: "Lavender", hex: "#E6E6FA" },
      { name: "Lilac", hex: "#C8A2C8" },
      { name: "Plum", hex: "#8E4585" },
      { name: "Mauve", hex: "#E0B0FF" },
      { name: "Amethyst", hex: "#9966CC" },
      { name: "Indigo", hex: "#4B0082" },
    ],
  },
  {
    family: "BROWNS",
    colors: [
      { name: "Brown", hex: "#A52A2A" },
      { name: "Dark Brown", hex: "#654321" },
      { name: "Chocolate", hex: "#7B3F00" },
      { name: "Coffee", hex: "#6F4E37" },
      { name: "Chestnut", hex: "#954535" },
      { name: "Tan", hex: "#D2B48C" },
      { name: "Cognac", hex: "#9A463D" },
      { name: "Bronze", hex: "#CD7F32" },
      { name: "Copper", hex: "#B87333" },
    ],
  },
  {
    family: "METALLICS",
    colors: [
      { name: "Metallic Gold", hex: "#D4AF37" },
      { name: "Metallic Silver", hex: "#AAA9AD" },
      { name: "Rose Gold", hex: "#B76E79" },
      { name: "Multicolor", hex: "#FF0000" },
    ],
  },
];

export const POPULAR_COLORS: ColorItem[] = COLOR_FAMILIES.flatMap((group) =>
  group.colors.map((c) => ({ ...c, family: group.family }))
);
