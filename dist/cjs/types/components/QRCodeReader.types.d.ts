import { ReactNode } from "react";
export interface IQRCodeReaderProps {
    onResult: (code: string) => void;
    loadingComponent?: ReactNode;
    deviceModelName?: string;
}
