import React from 'react';

interface IQRCodeReaderProps {
    onResult: (code: string) => void;
    deviceModelName?: string;
}

/**
 * Read QRCode using decodeFromConstraints
 * @param props
 * @returns
 */
declare const QRCodeReader: (props: IQRCodeReaderProps) => React.JSX.Element;

export { QRCodeReader as default };
