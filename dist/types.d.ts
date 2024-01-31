import React, { ReactNode, CSSProperties } from 'react';

interface IQRCodeReaderProps {
    onResult: (code: string) => void;
    loadingComponent?: ReactNode;
    deviceModelName?: string;
    style?: CSSProperties;
    viewFinder?: boolean;
    viewFinderStyle?: {
        color: string;
    };
}

/**
 * Read QRCode using decodeFromConstraints
 * @param props
 * @returns
 */
declare const QRCodeReader: (props: IQRCodeReaderProps) => React.JSX.Element;

export { QRCodeReader as default };
