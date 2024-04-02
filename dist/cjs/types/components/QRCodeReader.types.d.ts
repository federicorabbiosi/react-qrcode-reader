import { CSSProperties, ReactNode } from "react";
export interface IQRCodeReaderProps {
    onResult: (code: string) => void;
    loadingComponent?: ReactNode;
    deviceModelName?: string;
    style?: CSSProperties;
    viewFinder?: boolean;
    viewFinderStyle?: {
        color: string;
    };
    default?: "front" | "back";
}
