type SettingsState = {
    kernelSize: number;
    n: number;
    hardness: number;
    q: number;
    alpha: number;
    zeroCrossing: number;
    zeta: number;
};

export const settingsState: SettingsState = $state({
    kernelSize: 9,
    n: 8,
    hardness: 8.0,
    q: 8.0,
    alpha: 1.0,
    zeroCrossing: 0.6,
    zeta: 0.5,
});

type ImageState = {
    url: string | null;
    image: HTMLImageElement | null;
    width: number;
    height: number;
};

export const imageState: ImageState = $state({
    url: null,
    image: null,
    width: -1,
    height: -1,
});
