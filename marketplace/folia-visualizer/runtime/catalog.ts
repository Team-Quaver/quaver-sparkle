// Folia 歌词动效 —— picker metadata shared by the view and the settings section.
export const FOLIA_MODES = [
    { id: 'sonnet', label: '商籁', hint: '日系 MG 文字 PV' },
    { id: 'tempera', label: '凝彩', hint: '色块拼贴与墨染' },
    { id: 'lumiere', label: '绘光', hint: '舞台光束与线稿' },
    { id: 'hanabi', label: '花火', hint: '升空烟花与贴纸' },
    { id: 'machi', label: '町景', hint: '雨夜街角三维场景' },
    { id: 'nebbia', label: '雾笺', hint: '起雾车窗上写字' },
    { id: 'classic', label: '流光', hint: '单行逐字点亮' },
    { id: 'cadenza', label: '心象', hint: '字符散落成云' },
    { id: 'partita', label: '云阶', hint: '阶梯式逐行排布' },
    { id: 'fume', label: '浮名', hint: '越界大字与浮尘' },
    { id: 'tilt', label: '倾诉', hint: '倾斜副行排版' },
    { id: 'claddagh', label: '回环', hint: '环形轨道逐字' },
    { id: 'monet', label: '莫奈', hint: '海报式歌词栏' },
    { id: 'pendolo', label: '时计', hint: '机械钟表机芯' },
    { id: 'cappella', label: '群唱', hint: '对话气泡群像' },
    { id: 'diorama', label: '镜台', hint: '三维景深方块' },
    { id: 'still', label: '静止', hint: '低占用静态三行' },
] as const;

export const FOLIA_BACKGROUNDS = [
    { id: 'latent', label: '隐现' },
    { id: 'common', label: '通用' },
    { id: 'monet', label: '莫奈' },
    { id: 'nomand', label: '漫游' },
    { id: 'sora', label: '空' },
    { id: 'url', label: '嵌入' },
] as const;

export type FoliaModeId = typeof FOLIA_MODES[number]['id'];
export type FoliaBackgroundId = typeof FOLIA_BACKGROUNDS[number]['id'];

export const labelOf = (id: string) => FOLIA_MODES.find(mode => mode.id === id)?.label ?? '流光';
export const isMode = (id: string): id is FoliaModeId => FOLIA_MODES.some(mode => mode.id === id);
export const isBackground = (id: string): id is FoliaBackgroundId => FOLIA_BACKGROUNDS.some(background => background.id === id);
