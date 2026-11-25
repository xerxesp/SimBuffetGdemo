import { CarryItemType, StaffTier } from '../types/game';

const spriteCache = new Map<string, HTMLCanvasElement>();

function createPixelCanvas(
  grid: string[],
  palette: Record<string, string>
): HTMLCanvasElement {
  const h = grid.length;
  const w = grid[0]?.length ?? 1;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  for (let y = 0; y < h; y++) {
    const row = grid[y];
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      if (!ch || ch === '.' || ch === ' ') continue;
      const color = palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

function getCachedSprite(
  key: string,
  builder: () => HTMLCanvasElement
): HTMLCanvasElement {
  const existing = spriteCache.get(key);
  if (existing) return existing;
  const built = builder();
  spriteCache.set(key, built);
  return built;
}

/**
 * Draw a pre-baked pixel sprite with razor-sharp nearest-neighbor edges,
 * even when rendered onto a 2K/DPR-scaled canvas.
 */
export function drawPixelSprite(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  x: number,
  y: number,
  pixelScale = 2,
  anchorX = 0.5,
  anchorY = 0.5
) {
  const prevSmooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  const dw = sprite.width * pixelScale;
  const dh = sprite.height * pixelScale;
  const dx = Math.round(x - dw * anchorX);
  const dy = Math.round(y - dh * anchorY);
  ctx.drawImage(sprite, dx, dy, dw, dh);
  ctx.imageSmoothingEnabled = prevSmooth;
}

// ==========================================
// 1. PRE-BAKED HD-2D PIXEL TILE PATTERNS
// ==========================================

export function getWoodPlankTile(): HTMLCanvasElement {
  return getCachedSprite('tile:wood_plank', () => {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d')!;
    // Base warm dark walnut/mahogany harbor timber
    ctx.fillStyle = '#3B251A';
    ctx.fillRect(0, 0, 64, 64);

    // 4 horizontal planks (16px tall each, crisp 2px pixel feel)
    const plankTones = ['#462B1E', '#3E261B', '#4B2F21', '#42281C'];
    const grainTones = ['#341E14', '#553626', '#382117', '#513323'];
    const joints = [20, 48, 12, 38];

    for (let i = 0; i < 4; i++) {
      const py = i * 16;
      ctx.fillStyle = plankTones[i];
      ctx.fillRect(0, py, 64, 15);

      // Top highlight pixel bevel
      ctx.fillStyle = '#5B3A29';
      ctx.fillRect(0, py + 1, 64, 1);

      // Subtle wood grain pixel streaks
      ctx.fillStyle = grainTones[i];
      ctx.fillRect((i * 13 + 4) % 52, py + 5, 10, 2);
      ctx.fillRect((i * 21 + 26) % 50, py + 10, 12, 2);
      ctx.fillStyle = '#2B1810';
      ctx.fillRect((i * 17 + 14) % 54, py + 8, 6, 1);

      // Bottom horizontal plank seam groove
      ctx.fillStyle = '#23140D';
      ctx.fillRect(0, py + 15, 64, 1);

      // Vertical plank joint + tiny dark nail dots
      const jx = joints[i];
      ctx.fillStyle = '#23140D';
      ctx.fillRect(jx, py, 2, 16);
      ctx.fillStyle = '#5F3D2B';
      ctx.fillRect(jx + 2, py + 1, 1, 14);
      // Nail pixels
      ctx.fillStyle = '#1E110B';
      ctx.fillRect(jx - 3, py + 4, 2, 2);
      ctx.fillRect(jx - 3, py + 11, 2, 2);
      ctx.fillRect((jx + 5) % 64, py + 4, 2, 2);
      ctx.fillRect((jx + 5) % 64, py + 11, 2, 2);
    }
    return c;
  });
}

export function getKitchenTile(): HTMLCanvasElement {
  return getCachedSprite('tile:kitchen_ceramic', () => {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const ctx = c.getContext('2d')!;
    // Crisp checkered cool blue-slate & porcelain ceramic tiles
    const tileA = '#C7D6E4';
    const tileB = '#B2C5D8';
    const hiA = '#DDE9F4';
    const hiB = '#C6D7E7';
    const grout = '#7C93AA';

    for (let ty = 0; ty < 2; ty++) {
      for (let tx = 0; tx < 2; tx++) {
        const isA = (tx + ty) % 2 === 0;
        const x = tx * 16;
        const y = ty * 16;
        ctx.fillStyle = isA ? tileA : tileB;
        ctx.fillRect(x, y, 16, 16);
        // Subtle specular top-left pixel corner
        ctx.fillStyle = isA ? hiA : hiB;
        ctx.fillRect(x + 1, y + 1, 13, 1);
        ctx.fillRect(x + 1, y + 1, 1, 13);
        // Grout lines
        ctx.fillStyle = grout;
        ctx.fillRect(x, y + 15, 16, 1);
        ctx.fillRect(x + 15, y, 1, 16);
      }
    }
    return c;
  });
}

export function getCarpetTile(): HTMLCanvasElement {
  return getCachedSprite('tile:crimson_carpet', () => {
    const c = document.createElement('canvas');
    c.width = 24;
    c.height = 24;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#5D1A1E';
    ctx.fillRect(0, 0, 24, 24);

    // Subtle woven pixel diamond pattern
    ctx.fillStyle = '#6E2226';
    for (let i = 0; i < 24; i += 4) {
      ctx.fillRect(i, i, 2, 2);
      ctx.fillRect(22 - i, i, 2, 2);
    }
    ctx.fillStyle = '#4A1216';
    ctx.fillRect(10, 10, 4, 4);
    ctx.fillStyle = '#8F362B';
    ctx.fillRect(11, 11, 2, 2);
    return c;
  });
}

export function getCrushedIceTile(): HTMLCanvasElement {
  return getCachedSprite('tile:crushed_ice', () => {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#8BE4FA';
    ctx.fillRect(0, 0, 32, 32);

    // Pixel crushed ice facets
    const iceChips: Array<[number, number, number, number, string]> = [
      [2, 2, 6, 4, '#C9F6FF'],
      [10, 4, 6, 4, '#5AC8EB'],
      [20, 2, 8, 4, '#E8FDFF'],
      [4, 10, 8, 4, '#6AD3F2'],
      [14, 12, 6, 6, '#D6FAFF'],
      [24, 10, 6, 6, '#50BCE3'],
      [2, 20, 6, 6, '#E4FCFF'],
      [12, 22, 8, 4, '#63CEF0'],
      [22, 22, 8, 6, '#C5F5FF'],
      [8, 16, 4, 2, '#FFFFFF'],
      [26, 4, 2, 2, '#FFFFFF'],
      [16, 28, 4, 2, '#47B2DC'],
    ];
    for (const [x, y, w, h, col] of iceChips) {
      ctx.fillStyle = col;
      ctx.fillRect(x, y, w, h);
    }
    return c;
  });
}

// ==========================================
// 2. BESPOKE PIXEL SEAFOOD SPRITES (14x10)
// ==========================================

export function getSeafoodSprite(itemId: string): HTMLCanvasElement {
  return getCachedSprite(`seafood:${itemId}`, () => {
    const O = '#1B1118';
    switch (itemId) {
      case 'prawns':
        return createPixelCanvas(
          [
            '....OOOOO.....',
            '..OOaAAaAO....',
            '.OaAaaaAAaO...',
            'OaAaaOOaAAaO..',
            'OAAaO..OaAOO..',
            '.OAAO..ObbO...',
            '..OaaOObbO....',
            '...OaaaOO.....',
            '....OOOO......',
            '..............',
          ],
          { O, A: '#F26444', a: '#FF9A76', b: '#FFE0C2' }
        );
      case 'beef_rolls':
        return createPixelCanvas(
          [
            '..OOOO..OOOO..',
            '.ORwRROORwRRO.',
            'ORwwRRORwwRRO.',
            'ORRwwRORRwwRO.',
            'ORrRRRORrRRRO.',
            '.OOOOO..OOOOO.',
            '...OOOOOO.....',
            '..ORwRRwRO....',
            '..ORRwwRRO....',
            '...OOOOOO.....',
          ],
          { O, R: '#C83439', r: '#961F25', w: '#FDE8E8' }
        );
      case 'veggies_balls':
        return createPixelCanvas(
          [
            '..OOO....OOO..',
            '.OgGGO..OppPO.',
            'OgGGgGOOpPPPPO',
            'OGgGGgOOpPPpPO',
            '.OgGGO..OpppO.',
            '..OOOO..OOOO..',
            '...OgGGOppO...',
            '..OgGGgOppPO..',
            '...OOOOOOOO...',
            '..............',
          ],
          { O, G: '#3BA55D', g: '#7AE296', P: '#FBC2B5', p: '#FFF0E8' }
        );
      case 'oysters':
        return createPixelCanvas(
          [
            '...OOOOOOO....',
            '.OOsSSSSSsO...',
            'OsSccccccSsO..',
            'OSccwwwwccSO..',
            'OScwwyywwcSO..',
            'OsScwwwwcSsO..',
            '.OsSSccSSsO...',
            '..OOsSSsOO....',
            '....OOOOO.....',
            '..............',
          ],
          { O, S: '#6C8EAD', s: '#476582', c: '#B8D4E8', w: '#F6F4EC', y: '#F5D061' }
        );
      case 'salmon':
        return createPixelCanvas(
          [
            '..OOOOOOOOOO..',
            '.OSwSSwSSwSSO.',
            'OSwSSwSSwSSwSO',
            'OSSwSSwSSwSSSO',
            'OSwSSwSSwSSwSO',
            '.OSsSSsSSsSSO.',
            '..OOOOOOOOOO..',
            '....OOSwSOO...',
            '....OSSSSOO...',
            '.....OOOOO....',
          ],
          { O, S: '#F57A51', s: '#D45730', w: '#FFE3D4' }
        );
      case 'wagyu':
        return createPixelCanvas(
          [
            '.OOOOOOOOOOOO.',
            'ORwRwRRwRwRRO.',
            'ORRRwRRwRRwRO.',
            'ORwRRwRRwRRRO.',
            'ORrRwRRwRrRRO.',
            'ORrrRRRRrrrRO.',
            '.OOOOOOOOOOOO.',
            '...OgGGGGgO...',
            '....OOOOOO....',
            '..............',
          ],
          { O, R: '#A61E2C', r: '#7A111D', w: '#FCE6E9', G: '#2E7D4A', g: '#54B874' }
        );
      case 'lobster':
        return createPixelCanvas(
          [
            'OO..OOOOOO..OO',
            'OrOORrRRrROOrO',
            'ORROrRRRRrORRO',
            '.OORRhRRhRROO.',
            '...ORRRRRRO...',
            '...ORrRRrRO...',
            '....ORRRRO....',
            '...ORrRRrRO...',
            '..OOORRRROOO..',
            '....OOOOOO....',
          ],
          { O, R: '#D92B1C', r: '#9E1A11', h: '#FF866B' }
        );
      case 'king_crab':
        return createPixelCanvas(
          [
            'OO..OOOOOO..OO',
            '.ORORyRRyRORO.',
            'OORORRRRRROROO',
            '.OORRhRRhRROO.',
            'OORORRRRRROROO',
            '.O..ORyyRO..O.',
            'OO..ORRRRO..OO',
            '.O...OOOO...O.',
            '..............',
            '..............',
          ],
          { O, R: '#E34525', h: '#FF9369', y: '#FFE08A' }
        );
      case 'garlic_scallops':
        return createPixelCanvas(
          [
            '...OOOOOOOO...',
            '.OOgGGGGGGgOO.',
            'OgGGyYYYYyGGgO',
            'OGgyYwwwwYygGO',
            'OGgYwsssswYgGO',
            'OgGGyYYYYyGGgO',
            '.OOsSSSSSSsOO.',
            '..OOsSSSSsOO..',
            '....OOOOOO....',
            '..............',
          ],
          { O, G: '#D97706', g: '#F59E0B', Y: '#FDE68A', y: '#FEF3C7', w: '#FFFBEB', s: '#65A30D', S: '#92400E' }
        );
      case 'typhoon_crab':
        return createPixelCanvas(
          [
            'OO..OOOOOO..OO',
            '.ORORgRRgRORO.',
            'OORORgRRgROROO',
            '.OORRyRRyRROO.',
            'OORORRRRRROROO',
            '.O.OgYYYYgO.O.',
            'OO..OggggO..OO',
            '.O...OOOO...O.',
            '..............',
            '..............',
          ],
          { O, R: '#C2410C', r: '#9A3412', g: '#F59E0B', y: '#FEF08A', Y: '#FDE047' }
        );
      case 'sweet_shrimp_sushi':
        return createPixelCanvas(
          [
            '..OOOOOOOOOO..',
            '.OPpPPPPPPpPO.',
            'OPppPPwwPPppPO',
            'OwwwwwwwwwwwwO',
            'OwbbwwwwwwbbwO',
            '.OwwwwwwwwwwO.',
            '..OOnnnnnnOO..',
            '...OOnnnnOO...',
            '....OOOOOO....',
            '..............',
          ],
          { O, P: '#FB7185', p: '#FDA4AF', w: '#FFFDF8', b: '#E2E8F0', n: '#1E293B' }
        );
      case 'abalone_live':
        return createPixelCanvas(
          [
            '...OOOOOOOO...',
            '.OObBBBBBBbOO.',
            'ObBccccccccBbO',
            'OBcddddddddcBO',
            'OBcdyyddyyddBO',
            'ObBccccccccBbO',
            '.OObBBBBBBbOO.',
            '..OObbbbbbOO..',
            '....OOOOOO....',
            '..............',
          ],
          { O, B: '#57534E', b: '#292524', c: '#D6D3D1', d: '#F5D08A', y: '#B45309' }
        );
      case 'durian_craft':
        return createPixelCanvas(
          [
            '..OO......OO..',
            '.OGgO....OyyO.',
            'OGgGGO..OyYYyO',
            'OGGggO..OyYYyO',
            '.OGgGO..OyyyyO',
            '..OOO....OOOO.',
            '...OYYYYYYO...',
            '..OYYwwwwYYO..',
            '...OOOOOOOO...',
            '..............',
          ],
          { O, G: '#65A30D', g: '#A3E635', Y: '#FACC15', y: '#FEF08A', w: '#FFFBEB' }
        );
      case 'bluefin_toro':
      default:
        return createPixelCanvas(
          [
            '..OOOOOOOOOO..',
            '.OTwTTwTTwTTO.',
            'OTwTTwTTwTTwTO',
            'OTTwTTwTTwTTTO',
            'OTwTTwggTTwTTO',
            '.OTdTTddTTdTO.',
            '..OOOOOOOOOO..',
            '...OgGTTGgO...',
            '....OOOOOO....',
            '..............',
          ],
          { O, T: '#F26B8A', d: '#C94466', w: '#FFEBF0', g: '#F6D365', G: '#46A769' }
        );
    }
  });
}

// ==========================================
// 3. PIXEL PROPS (LANTERN, HOTPOT, PLATES)
// ==========================================

export function getLanternSprite(bright = true): HTMLCanvasElement {
  return getCachedSprite(`prop:lantern:${bright ? '1' : '0'}`, () => {
    const O = '#24110D';
    return createPixelCanvas(
      [
        '....OO....',
        '...OGGO...',
        '..OrrrrO..',
        '.OrRYYRro.',
        'OrRYWWYRro',
        'OrRYWWYRro',
        'OrRYYYYRro',
        'OrRRRRRRro',
        '.OrRRRRro.',
        '..OrrrrO..',
        '...OGGO...',
        '....OG....',
        '....Oy....',
        '....Oy....',
      ],
      {
        O,
        G: '#E5B44B',
        y: '#F4C658',
        r: '#9E1E16',
        o: '#7D1510',
        R: bright ? '#E53524' : '#C92B1E',
        Y: bright ? '#FF8F38' : '#E56D25',
        W: bright ? '#FFF0A8' : '#FFD06E',
      }
    );
  });
}

export function getHotpotSprite(
  brothColor: string,
  secondaryColor: string,
  boilFrame: number
): HTMLCanvasElement {
  const f = boilFrame % 2;
  return getCachedSprite(`prop:hotpot:${brothColor}:${secondaryColor}:${f}`, () => {
    const O = '#1B1418';
    const grid =
      f === 0
        ? [
            '.....OOOOOOOO.....',
            '...OOMmmmmmmMOO...',
            '..OMmbbbbbbbbmMO..',
            '.OMmbbsBBBBbbbmMO.',
            '.OmbBBsBBBBBBbbmO.',
            'OOmbBBBBBBcBBBbmOO',
            'GMmbBBBssBBBBBbmMG',
            'GMmbBBBBBBBgBBbmMG',
            'OOmbBBcBBBBBBBbmOO',
            '.OmbBBBBsBBBBBbmO.',
            '.OMmbbbbBBsbbbmMO.',
            '..OMmbbbbbbbbmMO..',
            '...OOMmmmmmmMOO...',
            '.....OOOOOOOO.....',
          ]
        : [
            '.....OOOOOOOO.....',
            '...OOMmmmmmmMOO...',
            '..OMmbbbbbbbbmMO..',
            '.OMmbbBBBBsbbbmMO.',
            '.OmbBBcBBBBsBBbmO.',
            'OOmbBBBBBBBBBBbmOO',
            'GMmbBBgBBBBssBbmMG',
            'GMmbBBBBsBBBBBbmMG',
            'OOmbBBBBBBcBBBbmOO',
            '.OmbBsBBBBBBBBbmO.',
            '.OMmbbbbBBBBbbmMO.',
            '..OMmbbbbbbbbmMO..',
            '...OOMmmmmmmMOO...',
            '.....OOOOOOOO.....',
          ];

    return createPixelCanvas(grid, {
      O,
      M: '#CBD5E1',
      m: '#8A9AB0',
      G: '#E2A84B',
      B: brothColor,
      b: brothColor,
      s: secondaryColor,
      c: '#FFF3C4',
      g: '#52C471',
    });
  });
}

export function getPlateStackSprite(dirty: boolean): HTMLCanvasElement {
  return getCachedSprite(`prop:plates:${dirty ? 'dirty' : 'clean'}`, () => {
    const O = '#1C1820';
    if (dirty) {
      return createPixelCanvas(
        [
          '..OOOOOOOO..',
          '.OPsPPssPPO.',
          'OPPsPPPPPPSO',
          '.ObbbbbbbbO.',
          '.OPPsPPPPSO.',
          '..ObbbbbbO..',
          '..OOOOOOOO..',
        ],
        { O, P: '#CBD5E1', b: '#7C8BA1', s: '#9C4221', S: '#B45309' }
      );
    }
    return createPixelCanvas(
      [
        '..OOOOOOOO..',
        '.OWWWWWWWWO.',
        'OWWWcWWcWWWO',
        '.ObbbbbbbbO.',
        '.OWWWWWWWWO.',
        '..ObbbbbbO..',
        '..OOOOOOOO..',
      ],
      { O, W: '#F8FAFC', c: '#E0F2FE', b: '#94A3B8' }
    );
  });
}

export function getTablePlaceSettingSprite(): HTMLCanvasElement {
  return getCachedSprite('prop:place_setting', () =>
    createPixelCanvas(
      [
        '.OOOO..O.',
        'OwwwwO.c.',
        'OwbbwO.c.',
        'OwwwwO.c.',
        '.OOOO..O.',
      ],
      { O: '#1D1820', w: '#F8FAFC', b: '#BAE6FD', c: '#D4A359' }
    )
  );
}

export function getSideDishSprite(variant: number): HTMLCanvasElement {
  const v = variant % 3;
  return getCachedSprite(`prop:sidedish:${v}`, () => {
    const foodA = v === 0 ? '#F26444' : v === 1 ? '#C93B3B' : '#4AA868';
    const foodB = v === 0 ? '#FFD1B8' : v === 1 ? '#FCE7E7' : '#C9F2D4';
    return createPixelCanvas(
      [
        '.OOOOOO.',
        'OwAABAwo',
        'OwBAAAwo',
        '.OooooO.',
        '..OOOO..',
      ],
      { O: '#1C161C', w: '#F8FAFC', o: '#94A3B8', A: foodA, B: foodB }
    );
  });
}

export function getFortuneCatSprite(): HTMLCanvasElement {
  return getCachedSprite('prop:fortune_cat', () =>
    createPixelCanvas(
      [
        '.O....O..',
        'OwO..OwO.',
        'OwwOOwwO.',
        'OwOwwOwO.',
        'OwwwwwwO.',
        '.OrrrrO..',
        'OwwGGwwO.',
        'OwwwwwwO.',
        '.OOOOOO..',
      ],
      { O: '#241410', w: '#FFF9ED', r: '#DC2626', G: '#F5C443' }
    )
  );
}

export function getCarriedSprite(
  carrying: CarryItemType,
  brothColor: string,
  brothSecondary: string
): HTMLCanvasElement | null {
  if (carrying === 'NONE') return null;
  if (carrying === 'BROTH_POT') {
    return getHotpotSprite(brothColor, brothSecondary, 0);
  }
  if (carrying === 'CLEAN_TABLEWARE') {
    return getPlateStackSprite(false);
  }
  if (carrying === 'DIRTY_DISHES') {
    return getPlateStackSprite(true);
  }
  if (carrying === 'COOKED_PLATTER') {
    return getCachedSprite('prop:carried_cooked_platter', () =>
      createPixelCanvas(
        [
          '...OOOOOOOO...',
          '.OOggggggggOO.',
          'OgYYyRRRRyYYgO',
          'OgYyyGssGyYYgO',
          '.ObbbbbbbbbbO.',
          '..OOOOOOOOOO..',
        ],
        {
          O: '#1A1412',
          g: '#F59E0B',
          Y: '#FDE047',
          y: '#FFFBEB',
          R: '#EA580C',
          G: '#65A30D',
          s: '#A3E635',
          b: '#92400E',
        }
      )
    );
  }
  return getCachedSprite('prop:carried_seafood_tray', () =>
    createPixelCanvas(
      [
        '.OOOOOOOOOOOO.',
        'OiiiiiiiiiiiiO',
        'OiRRiGGiPPiiOO',
        'OirRiGgiPpiiOO',
        'OiiiiiiiiiiiiO',
        '.OOOOOOOOOOOO.',
      ],
      {
        O: '#1A1820',
        i: '#B9EEFF',
        R: '#F26444',
        r: '#FFD1B8',
        G: '#4AA868',
        g: '#A7F3D0',
        P: '#F472B6',
        p: '#FDE8F0',
      }
    )
  );
}

// ==========================================
// 4. EXPRESSIVE CHIBI PIXEL CHARACTERS (14x16)
// ==========================================

const CUSTOMER_HAIR_PALETTES = [
  { H: '#2B1F1E', h: '#4A3634' }, // Espresso black
  { H: '#6B3F26', h: '#965D3B' }, // Chestnut brown
  { H: '#1F2B42', h: '#3A4F73' }, // Midnight blue-black
  { H: '#A86234', h: '#D68952' }, // Warm caramel
  { H: '#7A2E3B', h: '#A84858' }, // Burgundy wine
  { H: '#4B4B57', h: '#787887' }, // Silver slate
];

export function getManagerSprite(
  accentColor: string,
  frame: number
): HTMLCanvasElement {
  const f = frame % 2;
  return getCachedSprite(`char:manager:${accentColor}:${f}`, () => {
    const legRow1 = f === 0 ? '...OO....OO...' : '....OO..OO....';
    const legRow2 = f === 0 ? '..OBBO..OBBO..' : '...OBBOOBBO...';
    return createPixelCanvas(
      [
        '....OOOOOO....',
        '...OGGGGGGO...',
        '..OOHHHHHHOO..',
        '..OHhHHHHhHO..',
        '..OHssssssHO..',
        '..OsEssssEsO..',
        '..OspsssspoO..',
        '...OssssssO...',
        '..OOwAAAAwOO..',
        '.OAAwAGGAwAAO.',
        '.OAAwAAAAwAAO.',
        '.OsOAAAAAAOsO.',
        '..OOAAAAAAOO..',
        '...OddddddO...',
        legRow1,
        legRow2,
      ],
      {
        O: '#18121A',
        G: '#F5C443',
        H: '#271D1E',
        h: '#4B393B',
        s: '#FCD5B5',
        p: '#F59E9E',
        o: '#E3AC84',
        E: '#1A131A',
        w: '#FFFFFF',
        A: accentColor,
        d: '#273142',
        B: '#3E2723',
      }
    );
  });
}

export function getStaffSprite(
  roleColor: string,
  tier: StaffTier,
  isSpecial: boolean,
  frame: number
): HTMLCanvasElement {
  const f = frame % 2;
  const hasHat = isSpecial || tier >= 4;
  const trim = tier >= 3 || isSpecial ? '#F5C443' : '#FFFFFF';
  return getCachedSprite(`char:staff:${roleColor}:${tier}:${isSpecial ? 1 : 0}:${f}`, () => {
    const legRow1 = f === 0 ? '...OO....OO...' : '....OO..OO....';
    const legRow2 = f === 0 ? '..OBBO..OBBO..' : '...OBBOOBBO...';
    const topRows = hasHat
      ? [
          '...OOOOOOOO...',
          '..OWWWWWWWWO..',
          '..OWwWWWWwWO..',
          '..OOTTTTTTOO..',
        ]
      : [
          '..............',
          '...OOOOOOOO...',
          '..OOHHHHHHOO..',
          '..OHhTTTTThO..',
        ];
    return createPixelCanvas(
      [
        ...topRows,
        '..OHssssssHO..',
        '..OsEssssEsO..',
        '..OspsssspoO..',
        '...OssssssO...',
        '..OOWRRRRWOO..',
        '.ORRWTTTTWRRO.',
        '.ORRWRRRRWRRO.',
        '.OsORRRRRROsO.',
        '..OORRRRRROO..',
        '...OddddddO...',
        legRow1,
        legRow2,
      ],
      {
        O: '#18121A',
        W: '#F8FAFC',
        w: '#D8E3EE',
        T: trim,
        H: '#2E2220',
        h: '#59423E',
        s: '#FCD6B8',
        p: '#F4A2A2',
        o: '#E0AA84',
        E: '#1B141A',
        R: roleColor,
        d: '#2C3748',
        B: '#3A2820',
      }
    );
  });
}

export function getCustomerSprite(
  outfitColor: string,
  hairSeed: number,
  isVip: boolean,
  isSpecial: boolean,
  isSuper: boolean,
  frame: number
): HTMLCanvasElement {
  const f = frame % 2;
  const hairIdx = Math.abs(hairSeed) % CUSTOMER_HAIR_PALETTES.length;
  const hair = CUSTOMER_HAIR_PALETTES[hairIdx];
  const crown = isSuper ? '#F472B6' : isSpecial ? '#38BDF8' : isVip ? '#F5C443' : null;
  const key = `char:cust:${outfitColor}:${hairIdx}:${crown ?? 'none'}:${f}`;

  return getCachedSprite(key, () => {
    const legRow1 = f === 0 ? '...OO....OO...' : '....OO..OO....';
    const legRow2 = f === 0 ? '..OBBO..OBBO..' : '...OBBOOBBO...';
    const crownRow1 = crown ? '...O.OOOO.O...' : '..............';
    const crownRow2 = crown ? '...OGGGGGGO...' : '...OOOOOOOO...';

    return createPixelCanvas(
      [
        crownRow1,
        crownRow2,
        '..OOHHHHHHOO..',
        '..OHhHHHHhHO..',
        '..OHssssssHO..',
        '..OsEssssEsO..',
        '..OspsssspoO..',
        '...OssssssO...',
        '..OOCCCCCCOO..',
        '.OCCCwCCwCCCO.',
        '.OCCCCCCCCCCO.',
        '.OsOCCCCCCOsO.',
        '..OOCCCCCCOO..',
        '...OddddddO...',
        legRow1,
        legRow2,
      ],
      {
        O: '#18121A',
        G: crown ?? '#F5C443',
        H: hair.H,
        h: hair.h,
        s: '#FBD5B8',
        p: '#F49D9D',
        o: '#E0A882',
        E: '#1B141C',
        C: outfitColor,
        w: '#FFF7ED',
        d: '#2D3748',
        B: '#3D2B24',
      }
    );
  });
}

export function getSeatedCustomerSprite(
  outfitColor: string,
  hairSeed: number,
  isVip: boolean,
  isSpecial: boolean,
  isSuper: boolean,
  facingDown: boolean
): HTMLCanvasElement {
  const hairIdx = Math.abs(hairSeed) % CUSTOMER_HAIR_PALETTES.length;
  const hair = CUSTOMER_HAIR_PALETTES[hairIdx];
  const crown = isSuper ? '#F472B6' : isSpecial ? '#38BDF8' : isVip ? '#F5C443' : null;
  const key = `char:seated:${outfitColor}:${hairIdx}:${crown ?? 'none'}:${facingDown ? 'd' : 'u'}`;

  return getCachedSprite(key, () => {
    if (facingDown) {
      return createPixelCanvas(
        [
          crown ? '...OGGGGGGO...' : '...OOOOOOOO...',
          '..OOHHHHHHOO..',
          '..OHhHHHHhHO..',
          '..OHssssssHO..',
          '..OsEssssEsO..',
          '..OspsssspoO..',
          '..OOCCCCCCOO..',
          '.OCCCwCCwCCCO.',
          '.OCCCCCCCCCCO.',
          '..OOOOOOOOOO..',
        ],
        {
          O: '#18121A',
          G: crown ?? '#F5C443',
          H: hair.H,
          h: hair.h,
          s: '#FBD5B8',
          p: '#F49D9D',
          o: '#E0A882',
          E: '#1B141C',
          C: outfitColor,
          w: '#FFF7ED',
        }
      );
    }
    // Facing up (back of head & shoulders visible from top-down perspective)
    return createPixelCanvas(
      [
        crown ? '...OGGGGGGO...' : '...OOOOOOOO...',
        '..OOHHHHHHOO..',
        '..OHhHHHHhHO..',
        '..OHHHHHHHHO..',
        '..OHHHHHHHHO..',
        '..OOCCCCCCOO..',
        '.OCCCCCCCCCCO.',
        '.OCCCCCCCCCCO.',
        '..OOOOOOOOOO..',
        '..............',
      ],
      {
        O: '#18121A',
        G: crown ?? '#F5C443',
        H: hair.H,
        h: hair.h,
        C: outfitColor,
      }
    );
  });
}
