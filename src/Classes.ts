export interface IFile {
    name: string;
    hash: string;
    state: string;
    size: number;
}

export function convertSizeToString(size: number) {
    if (size + 100 * 1024 * 1024 > 1024 * 1024 * 1024) {
        size = size / (1024 * 1024 * 1024);
        return size.toFixed(1) + " GB";
    } else if (size + 100 * 1024 > 1024 * 1024) {
        size = size / (1024 * 1024);
        return size.toFixed(1) + " MB";
    } else if (size + 100 > 1024) {
        return (size / 1024).toFixed(1) + " KB";
    } else {
        return size + " B";
    }
}