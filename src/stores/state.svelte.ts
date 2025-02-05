type SettingsState = {
    colours: number;
    pixels: number;
};

type ImageState = {
    url: string | null;
    image: HTMLImageElement | null;
    width: number;
    height: number;
};

export const settingsState: SettingsState = $state({
    colours: 6,
    pixels: 900,
});

export const imageState: ImageState = $state({
    url: null,
    image: null,
    width: -1,
    height: -1,
});
